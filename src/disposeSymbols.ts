/**
 * Key for the `Disposable` protocol. Runtimes without `Symbol.dispose`, such
 * as older browsers, use `Symbol.for('Symbol.dispose')`. Polyfills and
 * transpilers such as core-js and Babel use the same key.
 */
export const disposeSymbol: typeof Symbol.dispose = Symbol.dispose
	?? Symbol.for('Symbol.dispose') as typeof Symbol.dispose;

/**
 * Key for the `AsyncDisposable` protocol. Runtimes without
 * `Symbol.asyncDispose`, such as older browsers, use
 * `Symbol.for('Symbol.asyncDispose')`. Polyfills and transpilers such as
 * core-js and Babel use the same key.
 */
export const asyncDisposeSymbol: typeof Symbol.asyncDispose = Symbol.asyncDispose
	?? Symbol.for('Symbol.asyncDispose') as typeof Symbol.asyncDispose;
