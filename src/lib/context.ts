export interface IContext {
  errors: Set<string | symbol>;
  output: Array<string>;
  quiet: boolean;
}

export interface IGetInitialStateParams {
  quiet?: boolean;
}

export function getInitialState(params: IGetInitialStateParams = {}): IContext {
  return {
    errors: new Set([]),
    output: [],
    quiet: params.quiet ?? false,
  };
}
