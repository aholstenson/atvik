import { asyncDisposeSymbol } from './disposeSymbols.js';
import { type ErrorStrategy, rethrowErrors } from './ErrorStrategy.js';
import type { EventIterator } from './EventIterator.js';
import { type EventIteratorOptions, OverflowBehavior } from './EventIteratorOptions.js';
import type { Listener } from './Listener.js';

/**
 * Source of events for {@link createEventIterator}.
 */
export interface EventIteratorSource<Args extends unknown[]> {
	/**
	 * Function used to subscribe the listener of the iterator. It can return
	 * a promise if the subscription is asynchronous.
	 */
	subscribe(listener: Listener<unknown, Args>): void | Promise<void>;

	/**
	 * Function used to unsubscribe the listener of the iterator. It can
	 * return a promise if the unsubscription is asynchronous.
	 */
	unsubscribe(listener: Listener<unknown, Args>): void | Promise<void>;

	/**
	 * If `OverflowBehavior.Block` is permitted. Blocking only works when the
	 * emitter waits for the promise that listeners return.
	 */
	allowBlock: boolean;

	/**
	 * Strategy for errors that occur when an abort signal stops the iterator.
	 */
	errorStrategy?: ErrorStrategy;
}

/**
 * Create an async iterator that subscribes a listener and gives the events
 * as they are received.
 *
 * The iterator subscribes its listener on the first call to `next()`. Events
 * that are emitted before that call are not received.
 *
 * Calling `return()` unsubscribes the listener, resolves all pending calls to
 * `next()` with `done: true` and releases emitters that are blocked by
 * `OverflowBehavior.Block`. All later calls to `next()` resolve with
 * `done: true`. Disposing the iterator calls `return()`, and so does an abort
 * of `options.signal`.
 *
 * @param source -
 *   functions used to subscribe and unsubscribe the listener
 * @param options -
 *   options to apply to this iterator
 * @returns
 *   async iterator
 */
export function createEventIterator<Args extends unknown[]>(
	source: EventIteratorSource<Args>,
	options?: EventIteratorOptions
): EventIterator<Args> {
	const limit = options?.limit ?? 0;
	const behavior = options?.overflowBehavior ?? OverflowBehavior.DropOldest;
	if(behavior === OverflowBehavior.Block && ! source.allowBlock) {
		throw new Error('Blocking is not a supported strategy for non-async events');
	}

	// Events that are received but not yet consumed
	const queue: Args[] = [];
	// Calls to next() that wait for an event
	const waiting: ((result: IteratorResult<Args>) => void)[] = [];
	// Emitters that wait for space in the queue
	const blocked: (() => void)[] = [];

	// Promise for the subscription, set on the first call to next()
	let subscription: Promise<void> | null = null;
	const signal = options?.signal;
	let done = signal?.aborted ?? false;

	const listener = async (...args: Args) => {
		for(;;) {
			if(done) return;

			const nextWaiting = waiting.shift();
			if(nextWaiting) {
				nextWaiting({ value: args, done: false });
				return;
			}

			if(limit > 0 && queue.length >= limit) {
				switch(behavior) {
					case OverflowBehavior.DropNewest:
						return;
					case OverflowBehavior.DropOldest:
						queue.shift();
						break;
					case OverflowBehavior.Block:
						// Wait for next() or return() and then check again
						await new Promise<void>(resolve => blocked.push(resolve));
						continue;
				}
			}

			queue.push(args);
			return;
		}
	};

	const subscribe = (): Promise<void> => {
		if(! subscription) {
			try {
				// Subscribe now, so that synchronous events are received at once
				subscription = Promise.resolve(source.subscribe(listener));
			} catch(err) {
				subscription = Promise.reject(err);
			}
		}

		return subscription;
	};

	const finish = (): IteratorResult<Args> => ({ value: undefined, done: true });

	const iterator: EventIterator<Args> = {
		async next() {
			if(done) return finish();

			await subscribe();

			if(done) return finish();

			// Let one blocked emitter continue, as space becomes free in the queue
			blocked.shift()?.();

			const value = queue.shift();
			if(value) {
				return { value, done: false };
			}

			return new Promise<IteratorResult<Args>>(resolve => waiting.push(resolve));
		},

		async return(value?: any) {
			if(! done) {
				done = true;
				signal?.removeEventListener('abort', onAbort);

				queue.length = 0;
				for(const resolve of waiting.splice(0)) {
					resolve(finish());
				}
				for(const release of blocked.splice(0)) {
					release();
				}

				if(subscription) {
					// Wait for a subscription in progress, and then remove it
					await subscription.then(
						() => source.unsubscribe(listener),
						() => undefined
					);
				}
			}

			return { value, done: true };
		},

		[Symbol.asyncIterator]() {
			return this;
		},

		async [asyncDisposeSymbol]() {
			await iterator.return();
		}
	};

	const errorStrategy = source.errorStrategy ?? rethrowErrors;
	const onAbort = () => {
		iterator.return()
			.catch(err => errorStrategy.handle(err));
	};

	if(! done) {
		signal?.addEventListener('abort', onAbort, { once: true });
	}

	return iterator;
}
