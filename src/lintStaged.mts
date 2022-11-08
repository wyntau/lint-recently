import path from 'node:path';
import { execGit, getLatestCommitDate, getLatestCommitHash, getRootDir } from './git.mjs';
import { IConfig as ILintRecentlyConfig } from './config.mjs';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat.js';
import pMap from 'p-map';
import { debugLib } from './debug.mjs';
import { ILintRecentlyOptions } from 'index.mjs';

dayjs.extend(customParseFormat);
const debug = debugLib('lintStaged');

type lintStagedConfigFn = (files: Array<string>) => string | Array<string> | Promise<string | Array<string>>;

async function getConfig(lintRecentlyConfig: ILintRecentlyConfig) {
  const filePatterns = Object.keys(lintRecentlyConfig.patterns);
  const ROOT_DIR = await getRootDir();

  const commitDateLatest = await getLatestCommitDate('HEAD');
  const dayjsFormat = 'YYYY-MM-DD HH:mm:ss ZZ';
  const commitDateBefore = dayjs(commitDateLatest, dayjsFormat)
    .subtract(lintRecentlyConfig.days ?? 3, 'day')
    .format(dayjsFormat);

  const lintStagedConfig = filePatterns.reduce((config: Record<string, lintStagedConfigFn>, filePattern) => {
    let commands = lintRecentlyConfig.patterns[filePattern];
    config[filePattern] = async (files: Array<string>) => {
      if (!Array.isArray(commands)) {
        commands = [commands];
      }

      //#region sort files by latest commited datetime
      const filteredFiles = (
        await pMap(
          files.map((item) => path.relative(ROOT_DIR, item)), // remove absolute path, just leave relative path
          (file) => getLatestCommitDate(file).then<[string, string]>((date) => [date, file]),
          {
            concurrency: 5,
          }
        )
      ).filter((item) => item[0] >= commitDateBefore);
      filteredFiles.sort((a, b) => (a[0] >= b[0] ? -1 : 1));
      debug("loaded recently files list for `%s': %O", filePattern, filteredFiles);
      //#endregion

      return filteredFiles.length
        ? commands.map((command: string) => `${command} ${filteredFiles.map((item) => item[1]).join(' ')}`)
        : []; // 如果没有符合条件的文件, 则返回空数组, 不执行任何命令
    };
    return config;
  }, {});

  debug('get lint-staged config: %O', lintStagedConfig);
  return lintStagedConfig;
}

async function getDiffArgs(lintRecentlyConfig: ILintRecentlyConfig): Promise<string> {
  const commitDateLatest = await getLatestCommitDate();

  // empty git history
  if (!commitDateLatest) {
    console.log('No recently files found');
    process.exit(0);
  }

  const dayjsFormat = 'YYYY-MM-DD HH:mm:ss ZZ';
  const commitDateBefore = dayjs(commitDateLatest, dayjsFormat)
    .subtract(lintRecentlyConfig.days ?? 3, 'day')
    .format(dayjsFormat);

  const commitHashLatest = await getLatestCommitHash();
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

  const diffArgs = `${commitHashBefore}...${commitHashLatest}`;
  debug("get lint-staged --diff args: '%s'", diffArgs);
  return diffArgs;
}

export async function getOptions(lintRecentlyOptions: ILintRecentlyOptions): Promise<Record<string, any>> {
  const lintRecentlyConfig = lintRecentlyOptions.config!;
  const lintStagedOptions = {
    ...lintRecentlyOptions,
    diff: await getDiffArgs(lintRecentlyConfig),
    config: await getConfig(lintRecentlyConfig),
  };

  debug('get lint-staged options: %O', lintStagedOptions);
  return lintStagedOptions;
}
