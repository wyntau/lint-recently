import debugLib from 'debug';
import { readFile as _readFile, unlink as _unlink, writeFile as _writeFile } from 'fs';
import { promisify } from 'util';

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
