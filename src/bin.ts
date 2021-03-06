#!/usr/bin/env node

import fs from 'fs';
import supportsColor from 'supports-color';
import cmdline from 'commander';
import pleaseUpgradeNode from 'please-upgrade-node';

import { lintRecently } from '.';
import { CONFIG_STDIN_ERROR } from './messages';
import { enableDebug, debugLib } from './debug';
import { pkg, pkgName, pkgVersion } from './constant';

// Force colors for packages that depend on https://www.npmjs.com/package/supports-color
if (supportsColor.stdout) {
  process.env.FORCE_COLOR = supportsColor.stdout.level.toString();
}

// Do not terminate main Listr process on SIGINT
process.on('SIGINT', () => {}); // eslint-disable-line

pleaseUpgradeNode(
  Object.assign({}, pkg as Record<string, any>, {
    engines: {
      node: '>=12.13.0', // First LTS release of 'Erbium'
    },
  })
);

const debug = debugLib('bin');

cmdline
  .version(pkgVersion)
  .option('-c, --config [path]', 'path to configuration file, or - to read from stdin')
  .option('-d, --debug', 'print additional debug information', false)
  .option(
    '-p, --concurrent <parallel tasks>',
    'the number of tasks to run concurrently, or false to run tasks serially',
    true
  )
  .option('-q, --quiet', `disable ${pkgName}’s own console output`, false)
  .option('-r, --relative', 'pass relative filepaths to tasks', false)
  .option('-x, --shell [path]', 'skip parsing of tasks for better shell support', false)
  .option('-v, --verbose', 'show task output even when tasks succeed; by default only failed output is shown', false)
  .parse(process.argv);

const cmdlineOptions = cmdline.opts();

if (cmdlineOptions.debug) {
  enableDebug();
}

debug('Running `%s@%s`', pkgName, pkgVersion);

/**
 * Get the maximum length of a command-line argument string based on current platform
 *
 * https://serverfault.com/questions/69430/what-is-the-maximum-length-of-a-command-line-in-mac-os-x
 * https://support.microsoft.com/en-us/help/830473/command-prompt-cmd-exe-command-line-string-limitation
 * https://unix.stackexchange.com/a/120652
 */
const getMaxArgLength = () => {
  switch (process.platform) {
    case 'darwin':
      return 262144;
    case 'win32':
      return 8191;
    default:
      return 131072;
  }
};

const options: Record<string, any> = {
  concurrent: JSON.parse(cmdlineOptions.concurrent),
  configPath: cmdlineOptions.config,
  debug: !!cmdlineOptions.debug,
  maxArgLength: getMaxArgLength() / 2,
  quiet: !!cmdlineOptions.quiet,
  relative: !!cmdlineOptions.relative,
  shell: cmdlineOptions.shell /* Either a boolean or a string pointing to the shell */,
  verbose: !!cmdlineOptions.verbose,
};

debug('Options parsed from command-line: %O', options);

if (options.configPath === '-') {
  delete options.configPath;
  try {
    options.config = fs.readFileSync(process.stdin.fd, 'utf8').toString().trim();
  } catch {
    console.error(CONFIG_STDIN_ERROR);
    process.exit(1);
  }

  try {
    options.config = JSON.parse(options.config);
  } catch {
    // Let config parsing complain if it's not JSON
  }
}

lintRecently(options)
  .then((passed: boolean) => {
    process.exitCode = passed ? 0 : 1;
  })
  .catch(() => {
    process.exitCode = 1;
  });
