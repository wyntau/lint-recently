import { blue, redBright, yellow } from 'colorette';
import { figures } from 'listr2';
import { IContext } from './context';

export type ILogger = Console;

export function printTaskOutput(ctx: IContext, logger: ILogger) {
  if (!Array.isArray(ctx.output)) return;
  const log = ctx.errors && ctx.errors.size > 0 ? logger.error : logger.log;
  for (const line of ctx.output) {
    log(line);
  }
}

export const info = blue(figures.arrowRight);
export const error = redBright(figures.cross);
export const warning = yellow(figures.warning);
