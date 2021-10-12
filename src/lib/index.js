'use strict'

const debugLog = require('debug')('lint-recently')
const stringifyObject = require('stringify-object')

const printTaskOutput = require('./printTaskOutput')
const runAll = require('./runAll')
const {
  ConfigNotFoundError,
} = require('./symbols')
const { validateConfig } = require('./config')
const validateOptions = require('./validateOptions')

const { loadConfig } = require('./config');

/**
 * @typedef {(...any) => void} LogFunction
 * @typedef {{ error: LogFunction, log: LogFunction, warn: LogFunction }} Logger
 *
 * Root lint-recently function that is called from `bin/lint-recently`.
 *
 * @param {object} options
 * @param {boolean | number} [options.concurrent] - The number of tasks to run concurrently, or false to run tasks serially
 * @param {object}  [options.config] - Object with configuration for programmatic API
 * @param {string} [options.configPath] - Path to configuration file
 * @param {Object} [options.cwd] - Current working directory
 * @param {boolean} [options.debug] - Enable debug mode
 * @param {number} [options.maxArgLength] - Maximum argument string length
 * @param {boolean} [options.quiet] - Disable lint-recently’s own console output
 * @param {boolean} [options.relative] - Pass relative filepaths to tasks
 * @param {boolean|string} [options.shell] - Skip parsing of tasks for better shell support
 * @param {boolean} [options.verbose] - Show task output even when tasks succeed; by default only failed output is shown
 * @param {Logger} [logger]
 *
 * @returns {Promise<boolean>} Promise of whether the linting passed or failed
 */
const lintRecently = async (
  {
    concurrent = true,
    config: configObject,
    configPath,
    cwd = process.cwd(),
    debug = false,
    maxArgLength,
    quiet = false,
    relative = false,
    shell = false,
    verbose = false,
  } = {},
  logger = console
) => {
  await validateOptions({ shell }, logger)

  debugLog('Loading config using `cosmiconfig`')

  const resolved = configObject
    ? { config: configObject, filepath: '(input)' }
    : await loadConfig(configPath)

  if (resolved == null) {
    logger.error(`${ConfigNotFoundError.message}.`)
    throw ConfigNotFoundError
  }

  debugLog('Successfully loaded config from `%s`:\n%O', resolved.filepath, resolved.config)

  // resolved.config is the parsed configuration object
  // resolved.filepath is the path to the config file that was found
  const config = validateConfig(resolved.config, logger)

  if (debug) {
    // Log using logger to be able to test through `consolemock`.
    logger.log('Running lint-recently with the following config:')
    logger.log(stringifyObject(config, { indent: '  ' }))
  } else {
    // We might not be in debug mode but `DEBUG=lint-recently*` could have
    // been set.
    debugLog('lint-recently config:\n%O', config)
  }

  // Unset GIT_LITERAL_PATHSPECS to not mess with path interpretation
  debugLog('Unset GIT_LITERAL_PATHSPECS (was `%s`)', process.env.GIT_LITERAL_PATHSPECS)
  delete process.env.GIT_LITERAL_PATHSPECS

  try {
    const ctx = await runAll(
      {
        concurrent,
        config,
        cwd,
        debug,
        maxArgLength,
        quiet,
        relative,
        shell,
        verbose,
      },
      logger
    )
    debugLog('Tasks were executed successfully!')
    printTaskOutput(ctx, logger)
    return true
  } catch (runAllError) {
    if (runAllError && runAllError.ctx && runAllError.ctx.errors) {
      const { ctx } = runAllError
      printTaskOutput(ctx, logger)
      return false
    }

    // Probably a compilation error in the config js file. Pass it up to the outer error handler for logging.
    throw runAllError
  }
}

module.exports = lintRecently
