/**
 * Strategy for handling errors that occur during certain asynchronous
 * operations.
 */
export interface ErrorStrategy {
	handle(err: any): void;
}

/**
 * {@link ErrorStrategy} that rethrows errors. This will cause asynchronous
 * errors to be unhandled, which by default will break the current flow and
 * output these as errors to the console in browsers and Node outputs a
 * warning.
 */
export const rethrowErrors: ErrorStrategy = {
	handle(err: any) {
		throw err;
	}
};
