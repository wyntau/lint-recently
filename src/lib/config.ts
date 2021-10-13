import { cosmiconfig } from 'cosmiconfig';
import debugLib from 'debug';
import { validateBraces } from './validator';
import Ajv from 'ajv';
import { ILogger } from './logger';

const configSchema = require('./schema.json'); // eslint-disable-line

const ajv = new Ajv();
const debug = debugLib('lint-recently:cfg');

export interface IConfig {
  days?: number;
  patterns: Record<string, string | Array<string>>;
}

function resolveConfig(configPath: string) {
  try {
    return require.resolve(configPath);
  } catch {
    return configPath;
  }
}

export function loadConfig(configPath?: string) {
  const explorer = cosmiconfig('lint-recently', {
    searchPlaces: ['.lintrecentlyrc.json', '.lintrecentlyrc.js', 'package.json'],
  });

  return configPath ? explorer.load(resolveConfig(configPath)) : explorer.search();
}

export function validateConfig(config: IConfig, logger: ILogger): IConfig {
  debug('Validating config');

  const validateFn = ajv.compile(configSchema);
  if (!validateFn(config)) {
    const message = validateFn.errors?.map((item) => item.message).join('\n\n');
    logger.error(`Could not parse lint-recently config.
${message}`);
    throw new Error(message);
  }

  const errors: Array<string> = [];
  const validatedConfig: IConfig = Object.assign({}, config);
  validatedConfig.patterns = Object.entries(validatedConfig.patterns).reduce((collection, [pattern, task]) => {
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
${message}`);
    throw new Error(message);
  }

  return validatedConfig;
}
