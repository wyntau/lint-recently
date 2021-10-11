'use strict'

const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const execGit = require('./execGit')

dayjs.extend(customParseFormat);

// module.exports = async function getStagedFiles(options) {
//   try {
//     // Docs for --diff-filter option: https://git-scm.com/docs/git-diff#Documentation/git-diff.txt---diff-filterACDMRTUXB82308203
//     // Docs for -z option: https://git-scm.com/docs/git-diff#Documentation/git-diff.txt--z
//     const lines = await execGit(
//       ['diff', '--staged', '--diff-filter=ACMR', '--name-only', '-z'],
//       options
//     )
//     // With `-z`, git prints `fileA\u0000fileB\u0000fileC\u0000` so we need to remove the last occurrence of `\u0000` before splitting
//     // eslint-disable-next-line no-control-regex
//     return lines ? lines.replace(/\u0000$/, '').split('\u0000') : []
//   } catch {
//     return null
//   }
// }

module.exports = async function getStagedFiles(options = {}){
  const dayjsFormat = 'YYYY-MM-DD_HH:mm:ss';
  const gitFormat = '%Y-%m-%d_%H:%M:%S';

  const commitDateLatest = await execGit(['log', '-1', `--date=format:${gitFormat}`, `--pretty=format:%cd`, 'HEAD']);

  // empty git history
  if(!commitDateLatest){
    return [];
  }

  const commitDateBefore = dayjs(commitDateLatest, dayjsFormat).subtract(3, 'day').format(dayjsFormat);
  const commitHashLatest = await execGit(['log', '-1', '--pretty=format:%H', 'HEAD']);
  let commitHashBefore = await execGit(['log', '-1', '--date-order', `--before=${commitDateBefore}`, '--pretty=format:%H']);

  if(!commitHashBefore){
    commitHashBefore = await execGit(['rev-list', '--max-parents=0', 'HEAD']);
  }

  const lines = await execGit(
    [ '--no-pager', 'diff', '--diff-filter=ACMR', '--name-only', '-z', commitHashBefore, commitHashLatest],
    options
  )
  // With `-z`, git prints `fileA\u0000fileB\u0000fileC\u0000` so we need to remove the last occurrence of `\u0000` before splitting
  // eslint-disable-next-line no-control-regex
  return lines ? lines.replace(/\u0000$/, '').split('\u0000') : [];
}
