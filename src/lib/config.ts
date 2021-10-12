import { cosmiconfig } from 'cosmiconfig';
import debugLib from 'debug';
import { configurationError } from './messages';
import validateBraces from './validateBraces';

export type IConfig = Record<string, any>;

const debug = debugLib('lint-recently:cfg');

function resolveConfig(configPath: string) {
  try {
    return require.resolve(configPath);
  } catch {
    return configPath;
  }
}

export function loadConfig(configPath: string) {
  const explorer = cosmiconfig('lint-recently', {
    searchPlaces: ['.lintrecentlyrc.json', '.lintrecentlyrc.js', 'package.json'],
  });

  return configPath ? explorer.load(resolveConfig(configPath)) : explorer.search();
}

export function validateConfig(config: IConfig, logger: any) {
  debug('Validating config');

  if (!config || (typeof config !== 'object' && typeof config !== 'function')) {
    throw new Error('Configuration should be an object or a function!');
  }

  /**
   * Function configurations receive all staged files as their argument.
   * They are not further validated here to make sure the function gets
   * evaluated only once.
   *
   * @see makeCmdTasks
   */
  if (typeof config === 'function') {
    return { '*': config };
  }

  if (Object.entries(config).length === 0) {
    throw new Error('Configuration should not be empty!');
  }

  const errors: Array<string> = [];

  /**
   * Create a new validated config because the keys (patterns) might change.
   * Since the Object.reduce method already loops through each entry in the config,
   * it can be used for validating the values at the same time.
   */
  const validatedConfig = Object.entries(config).reduce((collection, [pattern, task]) => {
    if (
      (!Array.isArray(task) || task.some((item) => typeof item !== 'string' && typeof item !== 'function')) &&
      typeof task !== 'string' &&
      typeof task !== 'function'
    ) {
      errors.push(
        configurationError(pattern, 'Should be a string, a function, or an array of strings and functions.', task)
      );
    }

    /**
     * A typical configuration error is using invalid brace expansion, like `*.{js}`.
     * These are automatically fixed and warned about.
     */
    const fixedPattern = validateBraces(pattern, logger);

    return { ...collection, [fixedPattern]: task };
  }, {});

  if (errors.length) {
    const message = errors.join('\n\n');

    logger.error(`Could not parse lint-recently config.

${message}

See https://github.com/okonet/lint-recently#configuration.`);

    throw new Error(message);
  }

  return validatedConfig;
}
