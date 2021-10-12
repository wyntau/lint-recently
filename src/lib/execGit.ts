import execa from 'execa';
import debugLib from 'debug';

const debug = debugLib('lint-recently:git');

/**
 * Explicitly never recurse commands into submodules, overriding local/global configuration.
 * @see https://git-scm.com/docs/git-config#Documentation/git-config.txt-submodulerecurse
 */
const NO_SUBMODULE_RECURSE = ['-c', 'submodule.recurse=false'];

const GIT_GLOBAL_OPTIONS = [...NO_SUBMODULE_RECURSE];

export type IExecGitOptions = execa.Options;
export async function execGit(cmd: Array<string>, options: IExecGitOptions = {}) {
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
