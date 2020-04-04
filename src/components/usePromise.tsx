import React from 'react';

type State<T> = {
  isPending: boolean;
  promise: Promise<T> | null;
  result?: T;
  error?: Object;
};

type Action<T> = {
  type: string;
  promise: Promise<T> | null;
  result?: T;
  error?: Object;
};

function usePromiseReducer<T>(state: State<T>, action: Action<T>): State<T> {
  if (action.type === 'set_promise') {
    return {
      ...state,
      promise: action.promise,
      isPending: action.promise != null,
    };
  } else if (action.type === 'resolve') {
    if (action.promise !== state.promise) return state;
    return {
      ...state,
      isPending: false,
      result: action.result,
      error: undefined,
    };
  } else if (action.type === 'reject') {
    if (action.promise !== state.promise) return state;
    return {
      ...state,
      isPending: false,
      result: undefined,
      error: action.error,
    };
  } else {
    throw new Error();
  }
}

export type IPromiser<T> = State<T> & {
  setPromise: (p: Promise<T> | null) => void;
};

export function usePromise<T>(): IPromiser<T> {
  const [state, dispatch] = React.useReducer<
    (s: State<T>, a: Action<T>) => State<T>
  >(usePromiseReducer, {
    promise: null,
    isPending: false,
    result: undefined,
    error: undefined,
  });

  React.useEffect(() => {
    return () => dispatch({ type: 'set_promise', promise: null });
  }, [dispatch]);

  const setPromise = React.useCallback(
    (promise: Promise<T> | null) => {
      dispatch({ type: 'set_promise', promise });

      promise != null &&
        promise.then(
          (result) => dispatch({ type: 'resolve', promise, result }),
          (error) => dispatch({ type: 'reject', promise, error })
        );
    },
    [dispatch]
  );

  return { setPromise, ...state };
}
