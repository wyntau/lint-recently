import execa from 'execa';
import { debugLib } from './debug.mjs';

const debug = debugLib('git');

/**
 * Explicitly never recurse commands into submodules, overriding local/global configuration.
 * @see https://git-scm.com/docs/git-config#Documentation/git-config.txt-submodulerecurse
 */
const NO_SUBMODULE_RECURSE = ['-c', 'submodule.recurse=false'];
const GIT_GLOBAL_OPTIONS = [...NO_SUBMODULE_RECURSE];

export type IExecGitOptions = execa.Options;
export async function execGit(cmd: Array<string>, options: IExecGitOptions = {}): Promise<string> {
  debug('Running git command: %O', cmd);
  try {
    const { stdout } = await execa('git', GIT_GLOBAL_OPTIONS.concat(cmd), {
      ...options,
      all: true,
      cwd: options.cwd || process.cwd(),
    });
    return stdout;
  } catch ({ all }) {
    throw new Error(all as any);
  }
}

export function getLatestCommitDate(path: string): Promise<string> {
  try {
    // 使用 --no-merges 不记录合并节点, 因为合并节点会导致文件的修改时间很新, 做了无用的校验
    return execGit(['log', '-1', '--no-merges', `--date=iso8601`, `--pretty=format:%cd`, path]);
  } catch {
    return Promise.resolve('');
  }
}

export function getRootPath(): Promise<string> {
  return execGit(['git', 'rev-parse', '--show-toplevel']);
}
