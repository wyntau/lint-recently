import fs from 'node:fs';
import path from 'node:path';

import { PackageJson } from 'type-fest';

export const pkg: PackageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json')).toString().trim());
export const pkgName = pkg.name || 'lint-recently';
export const pkgVersion = pkg.version || 'unknown';
export const configName = pkgName?.replace(/-/g, '') || '';

export const CONFIG_STDIN_ERROR = 'Error: Could not read config from stdin.';
export const ConfigNotFoundError = new Error('Config could not be found');
