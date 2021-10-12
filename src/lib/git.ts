import execa from 'execa';
import debugLib from 'debug';
import normalize from 'normalize-path';
import { lstat } from 'fs';
import { join, resolve, sep } from 'path';
import { promisify } from 'util';
import { readFile } from './file';

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

const fsLstat = promisify(lstat);

/**
 * Resolve path to the .git directory, with special handling for
 * submodules and worktrees
 */
async function resolveGitConfigDir(gitDir: string) {
  const defaultDir = normalize(join(gitDir, '.git'));
  const stats = await fsLstat(defaultDir);
  // If .git is a directory, use it
  if (stats.isDirectory()) return defaultDir;
  // Otherwise .git is a file containing path to real location
  const file = (await readFile(defaultDir))!.toString();
  return resolve(gitDir, file.replace(/^gitdir: /, '')).trim();
}

function determineGitDir(cwd: string, relativeDir: string) {
  // if relative dir and cwd have different endings normalize it
  // this happens under windows, where normalize is unable to normalize git's output
  if (relativeDir && relativeDir.endsWith(sep)) {
    relativeDir = relativeDir.slice(0, -1);
  }
  if (relativeDir) {
    // the current working dir is inside the git top-level directory
    return normalize(cwd.substring(0, cwd.lastIndexOf(relativeDir)));
  } else {
    // the current working dir is the top-level git directory
    return normalize(cwd);
  }
}

/**
 * Resolve git directory and possible submodule paths
 */
export async function resolveGitRepo(cwd = process.cwd()) {
  try {
    debug('Resolving git repo from `%s`', cwd);

    // Unset GIT_DIR before running any git operations in case it's pointing to an incorrect location
    debug('Unset GIT_DIR (was `%s`)', process.env.GIT_DIR);
    delete process.env.GIT_DIR;
    debug('Unset GIT_WORK_TREE (was `%s`)', process.env.GIT_WORK_TREE);
    delete process.env.GIT_WORK_TREE;

    // read the path of the current directory relative to the top-level directory
    // don't read the toplevel directly, it will lead to an posix conform path on non posix systems (cygwin)
    const gitRel = normalize(await execGit(['rev-parse', '--show-prefix']));
    const gitDir = determineGitDir(normalize(cwd), gitRel);
    const gitConfigDir = normalize(await resolveGitConfigDir(gitDir));

    debug('Resolved git directory to be `%s`', gitDir);
    debug('Resolved git config directory to be `%s`', gitConfigDir);

    return { gitDir, gitConfigDir };
  } catch (error) {
    debug('Failed to resolve git repo with error:', error);
    return { error, gitDir: null, gitConfigDir: null };
  }
}
