import { PackageJson } from 'type-fest';

export const pkg: PackageJson = require('../package.json'); // eslint-disable-line
export const pkgName = pkg.name!;
export const pkgVersion = pkg.version!;
export const configName = pkgName.replace(/-/g, '');
