import { execGit, getLatestCommitDate } from './git.mjs';
import { IConfig as ILintRecentlyConfig } from './config.mjs';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import pMap from 'p-map';
import { debugLib } from './debug.mjs';

dayjs.extend(customParseFormat);
const debug = debugLib('lintStaged');

type lintStagedConfigFn = (files: Array<string>) => string | Array<string> | Promise<string | Array<string>>;

export async function getConfigObj(lintRecentlyConfig: ILintRecentlyConfig) {
  const filePatterns = Object.keys(lintRecentlyConfig);

  const commitDateLatest = await getLatestCommitDate('HEAD');
  const dayjsFormat = 'YYYY-MM-DD HH:mm:ss ZZ';
  const commitDateBefore = dayjs(commitDateLatest, dayjsFormat)
    .subtract(lintRecentlyConfig.days ?? 3, 'day')
    .format(dayjsFormat);

  return filePatterns.reduce((config: Record<string, lintStagedConfigFn>, filePattern) => {
    let commands = lintRecentlyConfig.patterns[filePattern];
    config[filePattern] = async (files: Array<string>) => {
      if (!Array.isArray(commands)) {
        commands = [commands];
      }

      //#region sort files by latest commited datetime
      const filteredFiles = (
        await pMap(files, (file) => getLatestCommitDate(file).then<[string, string]>((date) => [date, file]), {
          concurrency: 5,
        })
      ).filter((item) => item[0] >= commitDateBefore);
      filteredFiles.sort((a, b) => (a[0] >= b[0] ? -1 : 1));
      debug('concurrency loaded recently files list: %O', filteredFiles);
      //#endregion

      return commands.map((command: string) => `${command} ${filteredFiles.join(' ')}`);
    };
    return config;
  }, {});
}

export async function getDiffOption(lintRecentlyConfig: ILintRecentlyConfig): Promise<string> {
  const commitDateLatest = await getLatestCommitDate('HEAD');

  // empty git history
  if (!commitDateLatest) {
    console.log('No recently files found');
    process.exit(0);
  }

  const dayjsFormat = 'YYYY-MM-DD HH:mm:ss ZZ';
  const commitDateBefore = dayjs(commitDateLatest, dayjsFormat)
    .subtract(lintRecentlyConfig.days ?? 3, 'day')
    .format(dayjsFormat);

  const commitHashLatest = await execGit(['log', '-1', '--pretty=format:%H', 'HEAD']);
  let commitHashBefore = await execGit([
    'log',
    '-1',
    '--date-order',
    `--before='${commitDateBefore}'`,
    '--pretty=format:%H',
  ]);

  // 找不到 N 天前的 commit, 说明天数不够, git 时间很新, 就取第一个 commit
  if (!commitHashBefore) {
    commitHashBefore = await execGit(['rev-list', '--max-parents=0', 'HEAD']);
  }

  return `${commitHashBefore} ${commitHashLatest}`;
}
