import fs from 'node:fs';
import path from 'node:path';
import { cosmiconfig } from 'cosmiconfig';
import Ajv from 'ajv';
import { configName, pkgName, __dirname, ConfigNotFoundError } from './constants.mjs';
import { debugLib } from './debug.mjs';

const debug = debugLib('config');
const ajv = new Ajv();
const configSchema = JSON.parse(fs.readFileSync(path.join(__dirname, 'schema.json')).toString().trim());

export interface IConfig {
  days?: number;
  patterns: Record<string, string | Array<string>>;
}

interface IGetConfigParams {
  configObject?: IConfig;
  configPath?: string;
}
export async function getConfig(params: IGetConfigParams): Promise<IConfig> {
  const resolved = params.configObject
    ? { config: params.configObject, filepath: '(input)' }
    : await loadConfig(params.configPath);

  if (resolved == null) {
    console.error(`${ConfigNotFoundError.message}.`);
    throw ConfigNotFoundError;
  }
  const validatedConfig = validateConfig(resolved.config);
  debug('Successfully loaded config from `%s`: %O', resolved.filepath, validatedConfig);

  return validatedConfig;
}

function loadConfig(configPath?: string) {
  const explorer = cosmiconfig(pkgName, {
    searchPlaces: [`.${configName}rc.json`, 'package.json'],
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

function validateConfig(config: IConfig): IConfig {
  const validateFn = ajv.compile(configSchema);
  if (!validateFn(config)) {
    const message = validateFn.errors?.map((item) => `${item.instancePath} incorrect`).join('\n');
    console.error(`Could not parse ${pkgName} config.\n${message}`);
    throw new Error(message);
  }

  return config;
}
