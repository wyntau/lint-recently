'use strict'

/** @typedef {import('./index').Logger} Logger */

const { Listr } = require('listr2')

const chunkFiles = require('./chunkFiles')
const debugLog = require('debug')('lint-recently:run')
const execGit = require('./execGit')
const generateTasks = require('./generateTasks')
const getRenderer = require('./getRenderer')
const getStagedFiles = require('./getStagedFiles')
const makeCmdTasks = require('./makeCmdTasks')
const {
  FAILED_GET_STAGED_FILES,
  NOT_GIT_REPO,
  NO_STAGED_FILES,
  NO_TASKS,
  SKIPPED_GIT_ERROR,
} = require('./messages')
const resolveGitRepo = require('./resolveGitRepo')
const {
  getInitialState,
} = require('./state')
const { GitRepoError, GetStagedFilesError, GitError } = require('./symbols')

const createError = (ctx) => Object.assign(new Error('lint-recently failed'), { ctx })

/**
 * Executes all tasks and either resolves or rejects the promise
 *
 * @param {object} options
 * @param {Object} [options.allowEmpty] - Allow empty commits when tasks revert all staged changes
 * @param {boolean | number} [options.concurrent] - The number of tasks to run concurrently, or false to run tasks serially
 * @param {Object} [options.config] - Task configuration
 * @param {Object} [options.cwd] - Current working directory
 * @param {boolean} [options.debug] - Enable debug mode
 * @param {number} [options.maxArgLength] - Maximum argument string length
 * @param {boolean} [options.quiet] - Disable lint-recently’s own console output
 * @param {boolean} [options.relative] - Pass relative filepaths to tasks
 * @param {boolean} [options.shell] - Skip parsing of tasks for better shell support
 * @param {boolean} [options.stash] - Enable the backup stash, and revert in case of errors
 * @param {boolean} [options.verbose] - Show task output even when tasks succeed; by default only failed output is shown
 * @param {Logger} logger
 * @returns {Promise}
 */
const runAll = async (
  {
    allowEmpty = false,
    concurrent = true,
    config,
    cwd = process.cwd(),
    debug = false,
    maxArgLength,
    quiet = false,
    relative = false,
    shell = false,
    verbose = false,
  },
  logger = console
) => {
  debugLog('Running all linter scripts')

  const ctx = getInitialState({ quiet })

  const { gitDir, gitConfigDir } = await resolveGitRepo(cwd)
  if (!gitDir) {
    if (!quiet) ctx.output.push(NOT_GIT_REPO)
    ctx.errors.add(GitRepoError)
    throw createError(ctx)
  }

  // Test whether we have any commits or not.
  // Stashing must be disabled with no initial commit.
  const hasInitialCommit = await execGit(['log', '-1'], { cwd: gitDir })
    .then(() => true)
    .catch(() => false)
  if(!hasInitialCommit){
    if (!quiet) ctx.output.push(NO_STAGED_FILES)
    return ctx
  }

  const files = await getStagedFiles({ cwd: gitDir })
  if (!files) {
    if (!quiet) ctx.output.push(FAILED_GET_STAGED_FILES)
    ctx.errors.add(GetStagedFilesError)
    throw createError(ctx)
  }
  debugLog('Loaded list of staged files in git:\n%O', files)

  // If there are no files avoid executing any lint-recently logic
  if (files.length === 0) {
    if (!quiet) ctx.output.push(NO_STAGED_FILES)
    return ctx
  }

  const stagedFileChunks = chunkFiles({ baseDir: gitDir, files, maxArgLength, relative })
  const chunkCount = stagedFileChunks.length
  if (chunkCount > 1) debugLog(`Chunked staged files into ${chunkCount} part`, chunkCount)

  const listrOptions = {
    ctx,
    exitOnError: false,
    nonTTYRenderer: 'verbose',
    registerSignalListeners: false,
    ...getRenderer({ debug, quiet }),
  }

  const listrTasks = []

  for (const [index, files] of stagedFileChunks.entries()) {
    const chunkTasks = generateTasks({ config, cwd, gitDir, files, relative })
    const chunkListrTasks = []

    for (const task of chunkTasks) {
      const subTasks = await makeCmdTasks({
        commands: task.commands,
        files: task.fileList,
        gitDir,
        renderer: listrOptions.renderer,
        shell,
        verbose,
      })

      chunkListrTasks.push({
        title: `Running tasks for ${task.pattern}`,
        task: async () =>
          new Listr(subTasks, {
            // In sub-tasks we don't want to run concurrently
            // and we want to abort on errors
            ...listrOptions,
            concurrent: false,
            exitOnError: true,
          }),
        skip: () => {
          // Skip task when no files matched
          if (task.fileList.length === 0) {
            return `No staged files match ${task.pattern}`
          }
          return false
        },
      })
    }

    listrTasks.push({
      // No need to show number of task chunks when there's only one
      title:
        chunkCount > 1 ? `Running tasks (chunk ${index + 1}/${chunkCount})...` : 'Running tasks...',
      task: () => new Listr(chunkListrTasks, { ...listrOptions, concurrent }),
      skip: () => {
        // Skip if the first step (backup) failed
        if (ctx.errors.has(GitError)) return SKIPPED_GIT_ERROR
        // Skip chunk when no every task is skipped (due to no matches)
        if (chunkListrTasks.every((task) => task.skip())) return 'No tasks to run.'
        return false
      },
    })
  }

  // If all of the configured tasks should be skipped
  // avoid executing any lint-recently logic
  if (listrTasks.every((task) => task.skip())) {
    if (!quiet) ctx.output.push(NO_TASKS)
    return ctx
  }

  const runner = new Listr(
    listrTasks,
    listrOptions
  )

  await runner.run()

  if (ctx.errors.size > 0) {
    throw createError(ctx)
  }

  return ctx
}

module.exports = runAll
