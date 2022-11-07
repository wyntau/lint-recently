// eslint-disable-next-line
// @ts-ignore
import lintStaged from 'lint-staged';
import { IConfig, loadConfig } from './config.mjs';
import { debugLib } from './debug.mjs';
import { ConfigNotFoundError } from './constants.mjs';
import { getConfigObj, getDiffOption } from './lintStaged.mjs';

const debugLog = debugLib('main');

export interface ILintRecentlyOptions {
  concurrent?: boolean | number;
  config?: IConfig;
  configPath?: string;
  cwd?: string;
  debug?: boolean;
  quiet?: boolean;
  relative?: boolean;
  shell?: boolean | string;
  verbose?: boolean;
}

export async function lintRecently(_options: ILintRecentlyOptions = {}, logger = console): Promise<any> {
  const { config: configObject, configPath, ...lintRecentlyOptions } = _options;

  debugLog('Loading config using `cosmiconfig`');

  const resolved = configObject ? { config: configObject, filepath: '(input)' } : await loadConfig(configPath);

  if (resolved == null) {
    logger.error(`${ConfigNotFoundError.message}.`);
    throw ConfigNotFoundError;
  }

  debugLog('Successfully loaded config from `%s`: %O', resolved.filepath, resolved.config);

  const lintStagedOptions = {
    ...lintRecentlyOptions,
    config: await getConfigObj(resolved.config),
    diff: await getDiffOption(resolved.config),
  };

  return lintStaged(lintStagedOptions);
}
