import micromatch from 'micromatch';
import normalize from 'normalize-path';
import path from 'path';
import debugLib from 'debug';
import { IConfig } from './config';

const debug = debugLib('lint-recently:task');

export interface IGenerateTasksOptions {
  config: IConfig;
  cwd?: string;
  gitDir: string;
  files: Array<string>;
  relative?: boolean;
}

export function generateTasks({ config, cwd = process.cwd(), gitDir, files, relative = false }: IGenerateTasksOptions) {
  debug('Generating linter tasks');

  const absoluteFiles = files.map((file: string) => normalize(path.resolve(gitDir, file)));
  const relativeFiles = absoluteFiles.map((file: string) => normalize(path.relative(cwd, file)));

  return Object.entries(config).map(([rawPattern, commands]) => {
    const pattern = rawPattern;

    const isParentDirPattern = pattern.startsWith('../');

    // Only worry about children of the CWD unless the pattern explicitly
    // specifies that it concerns a parent directory.
    const filteredFiles = relativeFiles.filter((file) => {
      if (isParentDirPattern) return true;
      return !file.startsWith('..') && !path.isAbsolute(file);
    });

    const matches = micromatch(filteredFiles, pattern, {
      cwd,
      dot: true,
      // If the pattern doesn't look like a path, enable `matchBase` to
      // match against filenames in every directory. This makes `*.js`
      // match both `test.js` and `subdirectory/test.js`.
      matchBase: !pattern.includes('/'),
      strictBrackets: true,
    });

    const fileList = matches.map((file) => normalize(relative ? file : path.resolve(cwd, file)));

    const task = { pattern, commands, fileList };
    debug('Generated task: \n%O', task);

    return task;
  });
}
