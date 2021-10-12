'use strict';

import { redBright, dim } from 'colorette';
import execa from 'execa';
import { parseArgsStringToArgv } from 'string-argv';
import debugLib from 'debug';
import { error, info } from './figures';
import { getInitialState, IContext } from './context';
import { TaskError } from './symbols';

const debug = debugLib('lint-recently:task');

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

/**
 * Returns the task function for the linter.
 *
 * @param {Object} options
 * @param {string} options.command — Linter task
 * @param {String} options.gitDir - Current git repo path
 * @param {Array<string>} options.files — Filepaths to run the linter task against
 * @param {Boolean} [options.relative] — Whether the filepaths should be relative
 * @param {Boolean} [options.shell] — Whether to skip parsing linter task for better shell support
 * @param {Boolean} [options.verbose] — Always show task verbose
 * @returns {function(): Promise<Array<string>>}
 */

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
