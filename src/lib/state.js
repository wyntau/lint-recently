export const getInitialState = ({ quiet = false } = {}) => ({
  hasPartiallyStagedFiles: null,
  shouldBackup: null,
  errors: new Set([]),
  output: [],
  quiet,
})
