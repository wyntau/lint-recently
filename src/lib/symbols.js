'use strict'

const ConfigNotFoundError = new Error('Config could not be found')
const GetStagedFilesError = Symbol('GetStagedFilesError')
const GitRepoError = Symbol('GitRepoError')
const HideUnstagedChangesError = Symbol('HideUnstagedChangesError')
const InvalidOptionsError = new Error('Invalid Options')
const RestoreMergeStatusError = Symbol('RestoreMergeStatusError')
const RestoreOriginalStateError = Symbol('RestoreOriginalStateError')
const RestoreUnstagedChangesError = Symbol('RestoreUnstagedChangesError')
const TaskError = Symbol('TaskError')

module.exports = {
  ConfigNotFoundError,
  GetStagedFilesError,
  GitRepoError,
  InvalidOptionsError,
  HideUnstagedChangesError,
  RestoreMergeStatusError,
  RestoreOriginalStateError,
  RestoreUnstagedChangesError,
  TaskError,
}
