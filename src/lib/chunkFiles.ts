import debugLib from 'debug';
import normalize from 'normalize-path';
import { resolve } from 'path';

const debug = debugLib('lint-recently:chunkFiles');

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
