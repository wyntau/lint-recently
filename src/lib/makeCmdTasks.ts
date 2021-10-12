import cliTruncate from 'cli-truncate';
import debugLib from 'debug';
import resolveTaskFn from './resolveTaskFn';

const debug = debugLib('lint-recently:make-cmd-tasks');
const STDOUT_COLUMNS_DEFAULT = 80;
const listrPrefixLength: Record<string, number> = {
  update: `    X `.length, // indented task title where X is a checkmark or a cross (failure)
  verbose: `[STARTED] `.length, // verbose renderer uses 7-letter STARTED/SUCCESS prefixes
};

function getTitleLength(renderer: string, columns = process.stdout.columns) {
  const prefixLength = listrPrefixLength[renderer] || 0;
  return (columns || STDOUT_COLUMNS_DEFAULT) - prefixLength;
}

export interface IMakeCmdTasksOptions {
  commands: string | Array<string>;
  files: Array<string>;
  gitDir: string;
  renderer: string;
  shell: boolean;
  verbose: boolean;
}

export async function makeCmdTasks(options: IMakeCmdTasksOptions) {
  const { commands, files, gitDir, renderer, shell, verbose } = options;
  debug('Creating listr tasks for commands %o', commands);
  const commandArray = Array.isArray(commands) ? commands : [commands];
  const cmdTasks = [];

  for (const command of commandArray) {
    // Truncate title to single line based on renderer
    const title = cliTruncate(command, getTitleLength(renderer));
    const task = resolveTaskFn({ command, files, gitDir, shell, verbose });
    cmdTasks.push({ title, command, task });
  }

  return cmdTasks;
}
