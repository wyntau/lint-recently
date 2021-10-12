import { IContext } from './context';

export function printTaskOutput(ctx: IContext, logger: any) {
  if (!Array.isArray(ctx.output)) return;
  const log = ctx.errors && ctx.errors.size > 0 ? logger.error : logger.log;
  for (const line of ctx.output) {
    log(line);
  }
}
