import fs from 'node:fs';
import path from 'node:path';
import { cosmiconfig } from 'cosmiconfig';
import Ajv from 'ajv';
import { configName, pkgName, __dirname } from './constants.mjs';

const ajv = new Ajv();
const configSchema = JSON.parse(fs.readFileSync(path.join(__dirname, 'schema.json')).toString().trim());

export interface IConfig {
  days?: number;
  patterns: Record<string, string | Array<string>>;
}

export function loadConfig(configPath?: string) {
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

type ILogger = Console;
export function validateConfig(config: IConfig, logger: ILogger): IConfig {
  const validateFn = ajv.compile(configSchema);
  if (!validateFn(config)) {
    const message = validateFn.errors?.map((item) => `${item.instancePath} incorrect`).join('\n');
    logger.error(`Could not parse ${pkgName} config.\n${message}`);
    throw new Error(message);
  }

  return config;
}
