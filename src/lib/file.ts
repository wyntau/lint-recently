import debugLib from 'debug';
import { readFile as _readFile } from 'fs';
import { promisify } from 'util';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { execGit } from './git';
import execa from 'execa';
import normalize from 'normalize-path';
import { resolve } from 'path';
import pMap from 'p-map';

dayjs.extend(customParseFormat);

const debug = debugLib('lint-recently:file');
const fsReadFile = promisify(_readFile);

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

async function getLatestCommitDate(path: string, gitDateFormat = '%Y-%m-%d_%H:%M:%S'): Promise<string> {
  try {
    return await execGit(['log', '-1', `--date=format:${gitDateFormat}`, `--pretty=format:%cd`, path]);
  } catch {
    return '';
  }
}

export interface IGetRecentlyFilesOptions extends execa.Options {
  days?: number;
}
export async function getRecentlyFiles(options: IGetRecentlyFilesOptions = {}) {
  debug('getRecentFiles with options: %O', options);

  const dayjsFormat = 'YYYY-MM-DD_HH:mm:ss';
  const gitFormat = '%Y-%m-%d_%H:%M:%S';

  const commitDateLatest = await getLatestCommitDate('HEAD', gitFormat);

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

  const linesStr = await execGit(
    ['--no-pager', 'diff', '--diff-filter=ACMR', '--name-only', '-z', commitHashBefore, commitHashLatest],
    options
  );

  // With `-z`, git prints `fileA\u0000fileB\u0000fileC\u0000` so we need to remove the last occurrence of `\u0000` before splitting
  // eslint-disable-next-line no-control-regex
  const linesRaw = linesStr ? linesStr.replace(/\u0000$/, '').split('\u0000') : [];

  //#region sort files by latest commited datetime
  const lines = await pMap(
    linesRaw,
    (file) => getLatestCommitDate(file, gitFormat).then<[string, string]>((date) => [date, file]),
    { concurrency: 5 }
  );
  lines.sort((a, b) => (a[0] >= b[0] ? -1 : 1));
  debug('concurrency loaded recently files list: %O', lines);
  //#endregion

  return lines.map((item) => item[1]);
}

function chunkArray(arr: Array<string>, chunkCount: number) {
  if (chunkCount === 1) return [arr];
  const chunked = [];
  let position = 0;
  for (let i = 0; i < chunkCount; i++) {
    const chunkLength = Math.ceil((arr.length - position) / (chunkCount - i));
    chunked.push([]);
    chunked[i] = arr.slice(position, chunkLength + position);
    position += chunkLength;
  }
  return chunked;
}

export interface IChunkFilesOptions {
  files: Array<string>;
  baseDir: string;
  maxArgLength?: number;
  relative: boolean;
}
export function chunkFiles(options: IChunkFilesOptions) {
  const { files, baseDir, maxArgLength = null, relative = false } = options;
  const normalizedFiles = files.map((file) => normalize(relative || !baseDir ? file : resolve(baseDir, file)));

  if (!maxArgLength) {
    debug('Skip chunking files because of undefined maxArgLength');
    return [normalizedFiles]; // wrap in an array to return a single chunk
  }

  const fileListLength = normalizedFiles.join(' ').length;
  debug(`Resolved an argument string length of ${fileListLength} characters from ${normalizedFiles.length} files`);
  const chunkCount = Math.min(Math.ceil(fileListLength / maxArgLength), normalizedFiles.length);
  debug(`Creating ${chunkCount} chunks for maxArgLength of ${maxArgLength}`);
  return chunkArray(normalizedFiles, chunkCount);
}
