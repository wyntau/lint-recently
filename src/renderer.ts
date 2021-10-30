export interface IGetRendererOptions {
  debug?: boolean;
  quiet?: boolean;
}

export function getRenderer({ debug, quiet }: IGetRendererOptions, env = process.env) {
  if (quiet) {
    return { renderer: 'silent' };
  }
  // Better support for dumb terminals: https://en.wikipedia.org/wiki/Computer_terminal#Dumb_terminals
  const isDumbTerminal = env.TERM === 'dumb';
  if (debug || isDumbTerminal || env.NODE_ENV === 'test') {
    return { renderer: 'verbose' };
  }

  return { renderer: 'update', rendererOptions: { dateFormat: false } };
}
