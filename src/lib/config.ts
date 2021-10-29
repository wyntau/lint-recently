import { cosmiconfig } from 'cosmiconfig';
import debugLib from 'debug';
import { validateAndFixBraces } from './validator';
import Ajv from 'ajv';
import { ILogger } from './logger';
import configSchema from './schema.json';

const ajv = new Ajv();
const debug = debugLib('lint-recently:cfg');

export interface IConfig {
  days?: number;
  patterns: Record<string, string | Array<string>>;
}

export function loadConfig(configPath?: string) {
  const explorer = cosmiconfig('lint-recently', {
    searchPlaces: ['.lintrecentlyrc.json', '.lintrecentlyrc.js', 'package.json'],
  });

  if (!configPath) {
    return explorer.search();
  }

  let resolvedConfig: string;
  try {
    resolvedConfig = require.resolve(configPath);
  } catch {
    resolvedConfig = configPath;
  }
  return explorer.load(resolvedConfig);
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
    const fixedPattern = validateAndFixBraces(pattern, logger);

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
