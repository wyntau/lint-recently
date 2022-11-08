// eslint-disable-next-line
// @ts-ignore
import lintStaged from 'lint-staged';
import { getConfig, IConfig } from './config.mjs';
import { getOptions as getLintStagedOptions } from './lintStaged.mjs';

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

export async function lintRecently(_options: ILintRecentlyOptions = {}): Promise<any> {
  const { config: configObject, configPath, ...lintRecentlyOptions } = _options;
  const lintRecentlyConfig = await getConfig({ configObject, configPath });
  const lintStagedOptions = await getLintStagedOptions({ ...lintRecentlyOptions, config: lintRecentlyConfig });
  return lintStaged(lintStagedOptions);
}
