import { promises as fs, constants } from 'fs';

import { invalidOption } from './messages';
import { InvalidOptionsError } from './symbols';
import debugLib from 'debug';
import { ILogger } from './logger';

const debug = debugLib('lint-recently:options');

export async function validateOptions(options: Record<string, any> = {}, logger: ILogger) {
  debug('Validating options...');

  /** Ensure the passed shell option is executable */
  if (typeof options.shell === 'string') {
    try {
      await fs.access(options.shell, constants.X_OK);
    } catch (error: any) {
      logger.error(invalidOption('shell', options.shell, error.message));
      throw InvalidOptionsError;
    }
  }

  debug('Validated options!');
}
