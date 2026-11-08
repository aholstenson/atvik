import type { Listener } from './Listener.js';

/**
 * Invoke listeners in parallel and wait for all of them to finish.
 *
 * All listeners are invoked, also if one of them throws. If one listener
 * fails the promise rejects with its error. If more than one listener fails
 * the promise rejects with an `AggregateError` that holds all of the errors.
 *
 * @param listeners -
 *   listeners to invoke
 * @param thisArg -
 *   value of `this` for the listeners
 * @param args -
 *   arguments for the listeners
 * @returns
 *   promise that resolves when all listeners are done
 */
export async function invokeInParallel<This, Args extends any[]>(
	listeners: readonly Listener<This, Args>[],
	thisArg: This,
	args: Args
): Promise<void> {
	// An async function changes a synchronous throw into a rejection
	const results = await Promise.allSettled(listeners.map(async listener => listener.apply(thisArg, args)));

	const errors: unknown[] = [];
	for(const result of results) {
		if(result.status === 'rejected') {
			errors.push(result.reason);
		}
	}

	if(errors.length === 1) {
		throw errors[0];
	} else if(errors.length > 1) {
		throw new AggregateError(errors, 'Multiple listeners failed');
	}
}
