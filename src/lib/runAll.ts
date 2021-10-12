'use strict';

/** @typedef {import('./index').Logger} Logger */

import { Listr } from 'listr2';
import debugLib from 'debug';

import { chunkFiles } from './chunkFiles';

import { execGit } from './execGit';
import { generateTasks } from './task';
import { getRenderer } from './renderer';
import { getRecentlyFiles } from './file';
import { makeCmdTasks } from './makeCmdTasks';
import { FAILED_GET_RECENTLY_FILES, NOT_GIT_REPO, NO_RECENTLY_FILES, NO_TASKS } from './messages';
import { resolveGitRepo } from './resolveGitRepo';
import { getInitialState, IContext } from './context';
import { GitRepoError, GetStagedFilesError } from './symbols';
import { IConfig } from './config';

const debugLog = debugLib('lint-recently:run');

const createError = (ctx: IContext) => Object.assign(new Error('lint-recently failed'), { ctx });

export interface IRunAllOptions {
  concurrent?: boolean | number;
  config: IConfig;
  cwd?: string;
  debug?: boolean;
  maxArgLength?: number;
  quiet?: boolean;
  relative?: boolean;
  shell?: boolean | string;
  verbose?: boolean;
}

export async function runAll(options: IRunAllOptions, logger = console) {
  const {
    concurrent = true,
    config,
    cwd = process.cwd(),
    debug = false,
    maxArgLength,
    quiet = false,
    relative = false,
    shell = false,
    verbose = false,
  } = options;

  debugLog('Running all linter scripts');

  const ctx = getInitialState({ quiet });

  const { gitDir } = await resolveGitRepo(cwd);
  if (!gitDir) {
    if (!quiet) {
      ctx.output.push(NOT_GIT_REPO);
    }
    ctx.errors.add(GitRepoError);
    throw createError(ctx);
  }

  // Test whether we have any commits or not.
  // Stashing must be disabled with no initial commit.
  const hasInitialCommit = await execGit(['log', '-1'], { cwd: gitDir })
    .then(() => true)
    .catch(() => false);
  if (!hasInitialCommit) {
    if (!quiet) {
      ctx.output.push(NO_RECENTLY_FILES);
    }
    return ctx;
  }

  const files = await getRecentlyFiles({ cwd: gitDir, days: config.days });
  if (!files) {
    if (!quiet) {
      ctx.output.push(FAILED_GET_RECENTLY_FILES);
    }
    ctx.errors.add(GetStagedFilesError);
    throw createError(ctx);
  }
  debugLog('Loaded list of staged files in git:\n%O', files);

  // If there are no files avoid executing any lint-recently logic
  if (files.length === 0) {
    if (!quiet) {
      ctx.output.push(NO_RECENTLY_FILES);
    }
    return ctx;
  }

  const stagedFileChunks = chunkFiles({ baseDir: gitDir, files, maxArgLength, relative });
  const chunkCount = stagedFileChunks.length;
  if (chunkCount > 1) {
    debugLog(`Chunked staged files into ${chunkCount} part`, chunkCount);
  }

  const listrOptions = {
    ctx,
    exitOnError: false,
    nonTTYRenderer: 'verbose',
    registerSignalListeners: false,
    ...getRenderer({ debug, quiet }),
  };

  const listrTasks = [];

  for (const [index, files] of stagedFileChunks.entries()) {
    const chunkTasks = generateTasks({ patterns: config.patterns, cwd, gitDir, files, relative });
    const chunkListrTasks: Array<Record<string, any>> = [];

    for (const task of chunkTasks) {
      const subTasks = await makeCmdTasks({
        commands: task.commands,
        files: task.fileList,
        gitDir,
        renderer: listrOptions.renderer,
        shell: shell as any,
        verbose,
      });

      chunkListrTasks.push({
        title: `Running tasks for ${task.pattern}`,
        task: async () =>
          new Listr(subTasks, {
            // In sub-tasks we don't want to run concurrently
            // and we want to abort on errors
            ...listrOptions,
            concurrent: false,
            exitOnError: true,
          } as any),
        skip: () => {
          // Skip task when no files matched
          if (task.fileList.length === 0) {
            return `No staged files match ${task.pattern}`;
          }
          return false;
        },
      });
    }

    listrTasks.push({
      // No need to show number of task chunks when there's only one
      title: chunkCount > 1 ? `Running tasks (chunk ${index + 1}/${chunkCount})...` : 'Running tasks...',
      task: () => new Listr(chunkListrTasks as any, { ...listrOptions, concurrent } as any),
      skip: () => {
        // Skip chunk when no every task is skipped (due to no matches)
        if (chunkListrTasks.every((task) => task.skip())) {
          return 'No tasks to run.';
        }
        return false;
      },
    });
  }

  // If all of the configured tasks should be skipped
  // avoid executing any lint-recently logic
  if (listrTasks.every((task) => task.skip())) {
    if (!quiet) {
      ctx.output.push(NO_TASKS);
    }
    return ctx;
  }

  const runner = new Listr(listrTasks, listrOptions as any);

  await runner.run();

  if (ctx.errors.size > 0) {
    throw createError(ctx);
  }

  return ctx;
}
