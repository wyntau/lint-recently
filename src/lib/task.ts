import micromatch from 'micromatch';
import normalize from 'normalize-path';
import path from 'path';
import debugLib from 'debug';
import { IConfig } from './config';
import cliTruncate from 'cli-truncate';
import { resolveTaskFn } from './resolveTaskFn';

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
