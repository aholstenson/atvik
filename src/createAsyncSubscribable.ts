import { AsyncSubscribable } from './AsyncSubscribable';
import { AsyncSubscriptionHandle } from './AsyncSubscriptionHandle';
import { ErrorStrategy, rethrowErrors } from './ErrorStrategy';
import { EventIteratorOptions, OverflowBehavior } from './EventIteratorOptions';
import { Listener } from './Listener';

/**
 * Function used to subscribe a listener.
 */
export type AsyncSubscribeFunction<This, Args extends any[]> = (listener: Listener<This, Args>) => Promise<void>;

/**
 * Function used to unsubscribe a listener, should return if the listener was
 * subscribed or not.
 */
export type AsyncUnsubscribeFunction<This, Args extends any[]> = (listener: Listener<This, Args>) => Promise<void>;

/**
 * Options for `createAsyncSubscribable`.
 */
export interface AsyncSubscribableOptions<This, Args extends any[]> {
	/**
	 * Function used to subscribe a listener.
	 */
	subscribe: AsyncSubscribeFunction<This, Args>;

	/**
	 * Function used to unsubscribe a listener.
	 */
	unsubscribe: AsyncUnsubscribeFunction<This, Args>;

	/**
	 * Options to apply to iterators created by this subscribable.
	 */
	defaultIterator?: EventIteratorOptions;

	/**
	 * Default error strategy to use.
	 */
	defaultErrorStrategy?: ErrorStrategy;
}

/**
 * Create a AsyncSubscribable instance that uses the give subscribe and
 * unsubscribe function to manage listeners.
 *
 * @param options -
 *   options used to create this async subscribable
 * @returns
 *   instance of `AsyncSubscribable`
 */
export function createAsyncSubscribable<This, Args extends any[]>(
	options: AsyncSubscribableOptions<This, Args>
): AsyncSubscribable<This, Args> {
	const subscribe = options.subscribe;
	const unsubscribe = options.unsubscribe;

	const defaultErrorStrategy = options.defaultErrorStrategy ?? rethrowErrors;

	const subscribable = async (listener: Listener<This, Args>): Promise<AsyncSubscriptionHandle> => {
		await subscribe(listener);

		// Return a handle that can be used to unsubscribe
		return {
			async unsubscribe() {
				await unsubscribe(listener);
			}
		};
	};

	subscribable.subscribe = subscribable;
	subscribable.unsubscribe = unsubscribe;

	subscribable.once = () => new Promise<Args>((resolve, reject) => {
		const listener = (...args: Args) => {
			unsubscribe(listener)
				.catch(err => reject(err));

			resolve(args);
		};

		subscribe(listener)
			.catch(err => reject(err));
	});

	subscribable.filter = (filter: (this: This, ...args: Args) => boolean) => createFilteredAsyncSubscribable(
		subscribe,
		unsubscribe,
		filter,
		defaultErrorStrategy
	);

	subscribable.withThis = <NewThis>(newThis: NewThis) => createNewThisAsyncSubscribable(subscribe, unsubscribe, newThis);

	const defaultIteratorOptions = options.defaultIterator;
	subscribable.iterator = (itOptions?: EventIteratorOptions) => createAsyncIterator(subscribe, unsubscribe, {
		...defaultIteratorOptions,
		...itOptions
	});
	(subscribable as any)[Symbol.asyncIterator] = () => createAsyncIterator(subscribe, unsubscribe, defaultIteratorOptions);

	return subscribable as any;
}

/**
 * Create a AsyncSubscribable that is filtered via the specified function.
 *
 * @param subscribe -
 *   function used to subscribe listeners
 * @param unsubscribe -
 *   function used to unsubscribe listeners
 * @param filterToApply -
 *   the function used to filter events
 * @param errorStrategy -
 *   error strategy to use when filter or listener triggering fails
 * @returns
 *   `AsyncSubscribable`
 */
function createFilteredAsyncSubscribable<This, Args extends any[]>(
	subscribe: AsyncSubscribeFunction<This, Args>,
	unsubscribe: AsyncUnsubscribeFunction<This, Args>,
	filterToApply: (this: This, ...args: Args) => boolean | Promise<boolean>,
	errorStrategy: ErrorStrategy
): AsyncSubscribable<This, Args> {
	// Map used to keep track of the filtered listener of an added listener
	const listenerMapping = new Map<Listener<This, Args>, Listener<This, Args>>();

	return createAsyncSubscribable({
		subscribe: listener => {
			const actualListener = async function(this: This, ...args: Args) {
				try {
					if(await filterToApply.apply(this, args)) {
						listener.call(this, ...args);
					}
				} catch(ex) {
					errorStrategy.handle(ex);
				}
			};

			listenerMapping.set(listener, actualListener);
			return subscribe(actualListener);
		},
		unsubscribe: listener => {
			const actual = listenerMapping.get(listener);
			if(actual) {
				listenerMapping.delete(listener);
				return unsubscribe(actual);
			} else {
				return Promise.resolve(undefined);
			}
		}
	});
}

/**
 * Create a AsyncSubscribable that changes what this is used for listeners.
 *
 * @param subscribe -
 *   function used to subscribe listeners
 * @param unsubscribe -
 *   function used to unsubscribe listeners
 * @param newThis -
 *   object to use as the new this
 * @returns
 *   `AsyncSubscribable`
 */
function createNewThisAsyncSubscribable<CurrentThis, NewThis, Args extends any[]>(
	subscribe: AsyncSubscribeFunction<CurrentThis, Args>,
	unsubscribe: AsyncUnsubscribeFunction<CurrentThis, Args>,
	newThis: NewThis
): AsyncSubscribable<NewThis, Args> {
	// Map used to keep track of the modified listeners
	const listenerMapping = new Map<Listener<NewThis, Args>, Listener<CurrentThis, Args>>();

	return createAsyncSubscribable({
		subscribe: async listener => {
			const actualListener = function(this: CurrentThis, ...args: Args) {
				listener.call(newThis, ...args);
			};

			listenerMapping.set(listener, actualListener);
			return await subscribe(actualListener);
		},
		unsubscribe: async listener => {
			const actual = listenerMapping.get(listener);
			if(actual) {
				listenerMapping.delete(listener);
				return await unsubscribe(actual);
			}
		}
	});
}

/**
 * Create an async iterator that will register a listener and emit events as
 * they are received.
 *
 * @param subscribe -
 *   function used to subscribe listeners
 * @param unsubscribe -
 *   function used to unsubscribe listeners
 * @param options -
 *   options to apply to this iterator
 * @returns
 *   async iterator
 */
function createAsyncIterator<Args extends any[]>(
	subscribe: AsyncSubscribeFunction<unknown, Args>,
	unsubscribe: AsyncUnsubscribeFunction<unknown, Args>,
	options?: EventIteratorOptions
): AsyncIterableIterator<Args> {
	const limit = options?.limit ?? 0;
	const behavior = options?.overflowBehavior ?? OverflowBehavior.DropOldest;

	const queue: Args[] = [];
	let current: ((v: IteratorResult<Args>) => void) | null = null;
	let hasRegistered = false;
	let block: (() => void) | null = null;

	const listener = async (...args: Args) => {
		if(current) {
			current({
				value: args,
				done: false
			});
			current = null;
		} else {
			if(limit > 0) {
				if(queue.length >= limit) {
					switch(behavior) {
						case OverflowBehavior.DropNewest:
							return;
						case OverflowBehavior.DropOldest:
							queue.shift();
							break;
						case OverflowBehavior.Block:
							await new Promise<void>(resolve => {
								block = resolve;
							});
							break;
					}
				}
			}

			queue.push(args);
		}
	};

	return {
		async next() {
			if(! hasRegistered) {
				await subscribe(listener);
				hasRegistered = true;
			}

			if(block) {
				// If there's a block, resolve and clear it
				block();
				block = null;
			}

			if(queue.length > 0) {
				// There is data in the queue, pull it
				const result = queue.shift();
				if(! result) {
					throw new Error('Unexpected error, event queue is empty');
				}

				return {
					value: result,
					done: false
				};
			} else {
				// Nothing in the queue, register the promise
				return await new Promise<IteratorResult<Args>>(resolve => {
					current = resolve;
				});
			}
		},

		async return(value?: any) {
			await unsubscribe(listener);
			return {
				value: value,
				done: true
			};
		},

		[Symbol.asyncIterator]() {
			return this;
		}
	};
}
