#!/usr/bin/env node

import fs from 'node:fs';

import supportsColor from 'supports-color';
import cli from 'commander';

import { lintRecently } from './index.mjs';
import { enableDebug, debugLib } from './debug.mjs';
import { pkgName, pkgVersion, CONFIG_STDIN_ERROR } from './constants.mjs';

// Force colors for packages that depend on https://www.npmjs.com/package/supports-color
if (supportsColor.stdout) {
  process.env.FORCE_COLOR = supportsColor.stdout.level.toString();
}

// Do not terminate main Listr process on SIGINT
process.on('SIGINT', () => {}); // eslint-disable-line

const debug = debugLib('bin');

cli
  .version(pkgVersion)
  .option('-c, --config [path]', 'path to configuration file, or - to read from stdin')
  .option('--cwd [path]', 'run all tasks in specific directory, instead of the current')
  .option('-d, --debug', 'print additional debug information', false)
  .option('-p, --concurrent <number|boolean>', 'the number of tasks to run concurrently, or false for serial', true)
  .option('-q, --quiet', `disable ${pkgName}’s own console output`, false)
  .option('-r, --relative', 'pass relative filepaths to tasks', false)
  .option('-v, --verbose', 'show task output even when tasks succeed; by default only failed output is shown', false)
  .option('-x, --shell [path]', 'skip parsing of tasks for better shell support', false)
  .parse(process.argv);

const cliOptions = cli.parse(process.argv).opts();

if (cliOptions.debug) {
  enableDebug();
}

debug('Running `%s@%s`', pkgName, pkgVersion);

const options: Record<string, any> = {
  concurrent: JSON.parse(cliOptions.concurrent),
  configPath: cliOptions.config,
  cwd: cliOptions.cwd,
  debug: !!cliOptions.debug,
  quiet: !!cliOptions.quiet,
  relative: !!cliOptions.relative,
  shell: cliOptions.shell /* Either a boolean or a string pointing to the shell */,
  verbose: !!cliOptions.verbose,
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
  .then((passed) => {
    process.exitCode = passed ? 0 : 1;
  })
  .catch(() => {
    process.exitCode = 1;
  });
