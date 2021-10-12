import debugLib from 'debug';
import { readFile as _readFile, unlink as _unlink, writeFile as _writeFile } from 'fs';
import { promisify } from 'util';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);

import { execGit } from './execGit';
import execa from 'execa';

const debug = debugLib('lint-recently:file');
const fsReadFile = promisify(_readFile);
const fsUnlink = promisify(_unlink);
const fsWriteFile = promisify(_writeFile);

export const readFile = async (filename: string, ignoreENOENT = true) => {
  debug('Reading file `%s`', filename);
  try {
    return await fsReadFile(filename);
  } catch (error: any) {
    if (ignoreENOENT && error.code === 'ENOENT') {
      debug("File `%s` doesn't exist, ignoring...", filename);
      return null; // no-op file doesn't exist
    } else {
      throw error;
    }
  }
};

export const unlink = async (filename: string, ignoreENOENT = true) => {
  debug('Removing file `%s`', filename);
  try {
    await fsUnlink(filename);
  } catch (error: any) {
    if (ignoreENOENT && error.code === 'ENOENT') {
      debug("File `%s` doesn't exist, ignoring...", filename);
    } else {
      throw error;
    }
  }
};

export const writeFile = async (filename: string, buffer: Buffer) => {
  debug('Writing file `%s`', filename);
  await fsWriteFile(filename, buffer);
};

export interface IGetRecentlyFilesOptions extends execa.Options {
  days?: number;
}
export async function getRecentlyFiles(options: IGetRecentlyFilesOptions = {}) {
  debug('getRecentFiles with options: %O', options);

  const dayjsFormat = 'YYYY-MM-DD_HH:mm:ss';
  const gitFormat = '%Y-%m-%d_%H:%M:%S';

  const commitDateLatest = await execGit(['log', '-1', `--date=format:${gitFormat}`, `--pretty=format:%cd`, 'HEAD']);

  // empty git history
  if (!commitDateLatest) {
    return [];
  }

  const commitDateBefore = dayjs(commitDateLatest, dayjsFormat)
    .subtract(options.days ?? 3, 'day')
    .format(dayjsFormat);
  const commitHashLatest = await execGit(['log', '-1', '--pretty=format:%H', 'HEAD']);
  let commitHashBefore = await execGit([
    'log',
    '-1',
    '--date-order',
    `--before=${commitDateBefore}`,
    '--pretty=format:%H',
  ]);

  if (!commitHashBefore) {
    commitHashBefore = await execGit(['rev-list', '--max-parents=0', 'HEAD']);
  }

  const lines = await execGit(
    ['--no-pager', 'diff', '--diff-filter=ACMR', '--name-only', '-z', commitHashBefore, commitHashLatest],
    options
  );
  // With `-z`, git prints `fileA\u0000fileB\u0000fileC\u0000` so we need to remove the last occurrence of `\u0000` before splitting
  // eslint-disable-next-line no-control-regex
  return lines ? lines.replace(/\u0000$/, '').split('\u0000') : [];
}
