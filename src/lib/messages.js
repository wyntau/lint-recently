'use strict'

const { redBright, bold, yellow } = require('colorette')
const format = require('stringify-object')

const { error, info, warning } = require('./figures')

const configurationError = (opt, helpMsg, value) =>
  `${redBright(`${error} Validation Error:`)}

  Invalid value for '${bold(opt)}': ${bold(
    format(value, { inlineCharacterLimit: Number.POSITIVE_INFINITY })
  )}

  ${helpMsg}`

const NOT_GIT_REPO = redBright(`${error} Current directory is not a git directory!`)

const FAILED_GET_STAGED_FILES = redBright(`${error} Failed to get staged files!`)

const incorrectBraces = (before, after) =>
  yellow(
    `${warning} Detected incorrect braces with only single value: \`${before}\`. Reformatted as: \`${after}\`
`
  )

const NO_STAGED_FILES = `${info} No staged files found.`

const NO_TASKS = `${info} No staged files match any configured task.`

const TASK_ERROR = 'Skipped because of errors from tasks.'

const SKIPPED_GIT_ERROR = 'Skipped because of previous git error.'

const GIT_ERROR = `\n  ${redBright(`${error} lint-recently failed due to a git error.`)}`

const invalidOption = (name, value, message) => `${redBright(`${error} Validation Error:`)}

  Invalid value for option '${bold(name)}': ${bold(value)}

  ${message}

See https://github.com/okonet/lint-recently#command-line-flags`

const PREVENTED_EMPTY_COMMIT = `
  ${yellow(`${warning} lint-recently prevented an empty git commit.
  Use the --allow-empty option to continue, or check your task configuration`)}
`

const RESTORE_STASH_EXAMPLE = `  Any lost modifications can be restored from a git stash:

    > git stash list
    stash@{0}: automatic lint-recently backup
    > git stash apply --index stash@{0}
`

const CONFIG_STDIN_ERROR = 'Error: Could not read config from stdin.'

module.exports = {
  CONFIG_STDIN_ERROR,
  configurationError,
  FAILED_GET_STAGED_FILES,
  GIT_ERROR,
  incorrectBraces,
  invalidOption,
  NO_STAGED_FILES,
  NO_TASKS,
  NOT_GIT_REPO,
  PREVENTED_EMPTY_COMMIT,
  RESTORE_STASH_EXAMPLE,
  SKIPPED_GIT_ERROR,
  TASK_ERROR,
}
