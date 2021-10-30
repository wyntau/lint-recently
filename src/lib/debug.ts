import _debugLib from 'debug';
import { pkgName } from './constant';

export function debugLib(moduleName: string) {
  return _debugLib(`${pkgName}:${moduleName}`);
}
