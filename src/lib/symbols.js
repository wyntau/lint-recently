'use strict'

const ConfigNotFoundError = new Error('Config could not be found')
const GetStagedFilesError = Symbol('GetStagedFilesError')
const GitRepoError = Symbol('GitRepoError')
const InvalidOptionsError = new Error('Invalid Options')
const TaskError = Symbol('TaskError')

module.exports = {
  ConfigNotFoundError,
  GetStagedFilesError,
  GitRepoError,
  InvalidOptionsError,
  TaskError,
}
