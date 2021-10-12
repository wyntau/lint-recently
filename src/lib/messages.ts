'use strict';

import { redBright, bold, yellow } from 'colorette';
import { error, info, warning } from './figures';

export const NOT_GIT_REPO = redBright(`${error} Current directory is not a git directory!`);

export const FAILED_GET_RECENTLY_FILES = redBright(`${error} Failed to get recently files!`);

export const incorrectBraces = (before: string, after: string) =>
  yellow(
    `${warning} Detected incorrect braces with only single value: \`${before}\`. Reformatted as: \`${after}\`
`
  );

export const NO_RECENTLY_FILES = `${info} No recently files found.`;

export const NO_TASKS = `${info} No recently files match any configured task.`;

export const TASK_ERROR = 'Skipped because of errors from tasks.';

export const invalidOption = (name: string, value: string, message: string) => `${redBright(
  `${error} Validation Error:`
)}

  Invalid value for option '${bold(name)}': ${bold(value)}

  ${message}

See https://github.com/okonet/lint-recently#command-line-flags`;

export const CONFIG_STDIN_ERROR = 'Error: Could not read config from stdin.';
