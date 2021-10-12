#!/usr/bin/env node

import supportsColor from 'supports-color';
import cmdline from 'commander';
import debugLib from 'debug';
import pleaseUpgradeNode from 'please-upgrade-node';

import lintRecently from '../lib';

// Force colors for packages that depend on https://www.npmjs.com/package/supports-color
if (supportsColor.stdout) {
  process.env.FORCE_COLOR = supportsColor.stdout.level.toString();
}

// Do not terminate main Listr process on SIGINT
process.on('SIGINT', () => {}); // eslint-disable-line

const pkg = require('../../package.json'); // eslint-disable-line
pleaseUpgradeNode(
  Object.assign({}, pkg, {
    engines: {
      node: '>=12.13.0', // First LTS release of 'Erbium'
    },
  })
);

const debug = debugLib('lint-recently:bin');

cmdline
  .version(pkg.version)
  .option('-d, --debug', 'print additional debug information', false)
  .option(
    '-p, --concurrent <parallel tasks>',
    'the number of tasks to run concurrently, or false to run tasks serially',
    true
  )
  .option('-q, --quiet', 'disable lint-recently’s own console output', false)
  .option('-r, --relative', 'pass relative filepaths to tasks', false)
  .option('-x, --shell [path]', 'skip parsing of tasks for better shell support', false)
  .option('-v, --verbose', 'show task output even when tasks succeed; by default only failed output is shown', false)
  .parse(process.argv);

const cmdlineOptions = cmdline.opts();

// @ts-ignore
if (cmdlineOptions.debug) {
  debugLib.enable('lint-recently:*');
}

debug('Running `lint-recently@%s`', pkg.version);

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
  debug: !!cmdlineOptions.debug,
  maxArgLength: getMaxArgLength() / 2,
  quiet: !!cmdlineOptions.quiet,
  relative: !!cmdlineOptions.relative,
  shell: cmdlineOptions.shell /* Either a boolean or a string pointing to the shell */,
  verbose: !!cmdlineOptions.verbose,
};

debug('Options parsed from command-line: %O', options);

lintRecently(options)
  .then((passed: boolean) => {
    process.exitCode = passed ? 0 : 1;
  })
  .catch(() => {
    process.exitCode = 1;
  });
