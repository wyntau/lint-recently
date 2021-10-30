import { debugLib } from './debug';
import { printTaskOutput } from './logger';
import { runAll } from './runAll';
import { ConfigNotFoundError } from './symbols';
import { IConfig, validateConfig } from './config';
import { validateShell } from './validator';

import { loadConfig } from './config';

const debugLog = debugLib('main');

export interface ILintRecentlyOptions {
  concurrent?: boolean | number;
  config?: IConfig;
  configPath?: string;
  cwd?: string;
  debug?: boolean;
  maxArgLength?: number;
  quiet?: boolean;
  relative?: boolean;
  shell?: boolean | string;
  verbose?: boolean;
}

export async function lintRecently(options: ILintRecentlyOptions = {}, logger = console) {
  const {
    concurrent = true,
    config: configObject,
    configPath,
    cwd = process.cwd(),
    debug = false,
    maxArgLength,
    quiet = false,
    relative = false,
    shell = false,
    verbose = false,
  } = options;

  await validateShell({ shell }, logger);

  debugLog('Loading config using `cosmiconfig`');

  const resolved = configObject ? { config: configObject, filepath: '(input)' } : await loadConfig(configPath);

  if (resolved == null) {
    logger.error(`${ConfigNotFoundError.message}.`);
    throw ConfigNotFoundError;
  }

  debugLog('Successfully loaded config from `%s`: %O', resolved.filepath, resolved.config);

  // resolved.config is the parsed configuration object
  // resolved.filepath is the path to the config file that was found
  const config = validateConfig(resolved.config, logger);
  debugLog('lint-recently config: %O', config);

  // Unset GIT_LITERAL_PATHSPECS to not mess with path interpretation
  debugLog('Unset GIT_LITERAL_PATHSPECS (was `%s`)', process.env.GIT_LITERAL_PATHSPECS);
  delete process.env.GIT_LITERAL_PATHSPECS;

  try {
    const ctx = await runAll(
      {
        concurrent,
        config,
        cwd,
        debug,
        maxArgLength,
        quiet,
        relative,
        shell,
        verbose,
      },
      logger
    );
    debugLog('Tasks were executed successfully!');
    printTaskOutput(ctx, logger);
    return true;
  } catch (runAllError: any) {
    if (runAllError && runAllError.ctx && runAllError.ctx.errors) {
      const { ctx } = runAllError;
      printTaskOutput(ctx, logger);
      return false;
    }

    // Probably a compilation error in the config js file. Pass it up to the outer error handler for logging.
    throw runAllError;
  }
}
