import { PackageJson } from 'type-fest';

const pkg: PackageJson = require('../package.json'); // eslint-disable-line

export { pkg };
export const pkgName = pkg.name!;
export const configName = pkgName.replace(/-/g, '');
