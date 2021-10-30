import { PackageJson } from 'type-fest';

const { name }: PackageJson = require('../../package.json'); // eslint-disable-line

export const pkgName = name!;
export const configName = pkgName.replace(/-/g, '');
