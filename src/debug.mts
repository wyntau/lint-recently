import _debugLib from 'debug';
import { pkgName } from './constants.mjs';

export function debugLib(moduleName: string) {
  return _debugLib(`${pkgName}:${moduleName}`);
}

export function enableDebug() {
  return _debugLib.enable(`${pkgName}:*`);
}
