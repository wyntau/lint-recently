export interface IState {
  errors: Set<string>;
  output: Array<string>;
  quiet: boolean;
}

export interface IGetInitialStateParams {
  quiet?: boolean;
}

export function getInitialState(params: IGetInitialStateParams): IState {
  return {
    errors: new Set([]),
    output: [],
    quiet: params.quiet ?? false,
  };
}
