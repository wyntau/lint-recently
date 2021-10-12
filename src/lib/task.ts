import micromatch from 'micromatch';
import normalize from 'normalize-path';
import path from 'path';
import debugLib from 'debug';
import { IConfig } from './config';
import cliTruncate from 'cli-truncate';
import { redBright, dim } from 'colorette';
import execa from 'execa';
import { parseArgsStringToArgv } from 'string-argv';
import { error, info } from './logger';
import { getInitialState, IContext } from './context';
import { TaskError } from './symbols';

const debug = debugLib('lint-recently:task');

export interface IGenerateTasksOptions {
  patterns: IConfig['patterns'];
  cwd?: string;
  gitDir: string;
  files: Array<string>;
  relative?: boolean;
}

export function generateTasks(options: IGenerateTasksOptions) {
  debug('Generating linter tasks');

  const { patterns, cwd = process.cwd(), gitDir, files, relative = false } = options;
  const absoluteFiles = files.map((file: string) => normalize(path.resolve(gitDir, file)));
  const relativeFiles = absoluteFiles.map((file: string) => normalize(path.relative(cwd, file)));

  return Object.entries(patterns).map(([rawPattern, commands]) => {
    const pattern = rawPattern;

    const isParentDirPattern = pattern.startsWith('../');

    // Only worry about children of the CWD unless the pattern explicitly
    // specifies that it concerns a parent directory.
    const filteredFiles = relativeFiles.filter((file) => {
      if (isParentDirPattern) return true;
      return !file.startsWith('..') && !path.isAbsolute(file);
    });

    const matches = micromatch(filteredFiles, pattern, {
      cwd,
      dot: true,
      // If the pattern doesn't look like a path, enable `matchBase` to
      // match against filenames in every directory. This makes `*.js`
      // match both `test.js` and `subdirectory/test.js`.
      matchBase: !pattern.includes('/'),
      strictBrackets: true,
    });

    const fileList = matches.map((file) => normalize(relative ? file : path.resolve(cwd, file)));

    const task = { pattern, commands, fileList };
    debug('Generated task: \n%O', task);

    return task;
  });
}

const STDOUT_COLUMNS_DEFAULT = 80;
const listrPrefixLength: Record<string, number> = {
  update: `    X `.length, // indented task title where X is a checkmark or a cross (failure)
  verbose: `[STARTED] `.length, // verbose renderer uses 7-letter STARTED/SUCCESS prefixes
};

function getTitleLength(renderer: string, columns = process.stdout.columns) {
  const prefixLength = listrPrefixLength[renderer] || 0;
  return (columns || STDOUT_COLUMNS_DEFAULT) - prefixLength;
}

export interface IMakeCmdTasksOptions {
  commands: string | Array<string>;
  files: Array<string>;
  gitDir: string;
  renderer: string;
  shell: boolean;
  verbose: boolean;
}

export async function makeCmdTasks(options: IMakeCmdTasksOptions) {
  const { commands, files, gitDir, renderer, shell, verbose } = options;
  debug('Creating listr tasks for commands %o', commands);
  const commandArray = Array.isArray(commands) ? commands : [commands];
  const cmdTasks = [];

  for (const command of commandArray) {
    // Truncate title to single line based on renderer
    const title = cliTruncate(command, getTitleLength(renderer));
    const task = resolveTaskFn({ command, files, gitDir, shell, verbose });
    cmdTasks.push({ title, command, task });
  }

  return cmdTasks;
}

function getTag({ code, killed, signal }: any) {
  return signal || (killed && 'KILLED') || code || 'FAILED';
}

function handleOutput(command: string, result: any, ctx: IContext, isError = false) {
  const { stderr, stdout } = result;
  const hasOutput = !!stderr || !!stdout;

  if (hasOutput) {
    const outputTitle = isError ? redBright(`${error} ${command}:`) : `${info} ${command}:`;
    const output = ([] as Array<string>)
      .concat(ctx.quiet ? [] : ['', outputTitle])
      .concat(stderr ? stderr : [])
      .concat(stdout ? stdout : []);
    ctx.output.push(output.join('\n'));
  } else if (isError) {
    // Show generic error when task had no output
    const tag = getTag(result);
    const message = redBright(`\n${error} ${command} failed without output (${tag}).`);
    if (!ctx.quiet) ctx.output.push(message);
  }
}

function makeErr(command: string, result: any, ctx: IContext) {
  ctx.errors.add(TaskError);
  handleOutput(command, result, ctx, true);
  const tag = getTag(result);
  return new Error(`${redBright(command)} ${dim(`[${tag}]`)}`);
}

export interface IResolveTaskFnOptions {
  command: string;
  gitDir: string;
  files: Array<string>;
  relative?: boolean;
  shell: boolean;
  verbose: boolean;
}
export function resolveTaskFn(options: IResolveTaskFnOptions) {
  const { command, files, gitDir, relative, shell = false, verbose = false } = options;

  const [cmd, ...args] = parseArgsStringToArgv(command);
  debug('cmd:', cmd);
  debug('args:', args);

  const execaOptions: Record<string, any> = { preferLocal: true, reject: false, shell };
  if (relative) {
    execaOptions.cwd = process.cwd();
  } else if (/^git(\.exe)?/i.test(cmd) && gitDir !== process.cwd()) {
    // Only use gitDir as CWD if we are using the git binary
    // e.g `npm` should run tasks in the actual CWD
    execaOptions.cwd = gitDir;
  }
  debug('execaOptions:', execaOptions);

  return async (ctx = getInitialState()) => {
    const result = await (shell
      ? execa.command(`${command} ${files.join(' ')}`, execaOptions)
      : execa(cmd, args.concat(files), execaOptions));

    if (result.failed || result.killed || result.signal != null) {
      throw makeErr(command, result, ctx);
    }

    if (verbose) {
      handleOutput(command, result, ctx);
    }
  };
}
