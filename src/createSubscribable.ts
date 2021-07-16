import { EventIteratorOptions, OverflowBehavior } from './EventIteratorOptions';
import { Listener } from './Listener';
import { Subscribable } from './Subscribable';
import { SubscriptionHandle } from './SubscriptionHandle';

/**
 * Function used to subscribe a listener.
 */
export type SubscribeFunction<This, Args extends any[]> = (listener: Listener<This, Args>) => void;

/**
 * Function used to unsubscribe a listener, should return if the listener was
 * subscribed or not.
 */
export type UnsubscribeFunction<This, Args extends any[]> = (listener: Listener<This, Args>) => boolean;

/**
 * Options for `createSubscribable`.
 */
export interface SubscribableOptions<This, Args extends any[]> {
	/**
	 * Function used to subscribe a listener.
	 */
	subscribe: SubscribeFunction<This, Args>;

	/**
	 * Function used to unsubscribe a listener.
	 */
	unsubscribe: UnsubscribeFunction<This, Args>;

	/**
	 * Options to apply to iterators created by this subscribable.
	 */
	defaultIterator?: EventIteratorOptions;
}

/**
 * Create a Subscribable given a subscribe, unsubscribe and a once function.
 *
 * @param options -
 *   options used to create this subscribable
 * @returns
 *   instance of `Subscribable`
 */
export function createSubscribable<This, Args extends any[]>(
	options: SubscribableOptions<This, Args>
): Subscribable<This, Args> {
	const subscribe = options.subscribe;
	const unsubscribe = options.unsubscribe;

	const subscribable = (listener: Listener<This, Args>): SubscriptionHandle => {
		subscribe(listener);

		// Return a handle that can be used to unsubscribe
		return {
			unsubscribe() {
				unsubscribe(listener);
			}
		};
	};

	subscribable.subscribe = subscribable;
	subscribable.unsubscribe = unsubscribe;

	subscribable.once = () => new Promise<Args>(resolve => {
		const listener = (...args: Args) => {
			unsubscribe(listener);

			resolve(args);
		};

		subscribe(listener);
	});

	subscribable.filter = (filter: (this: This, ...args: Args) => boolean) => createFilteredSubscribable(
		subscribe,
		unsubscribe,
		filter
	);

	subscribable.withThis = <NewThis>(newThis: NewThis) => createNewThisSubscribable(subscribe, unsubscribe, newThis);

	const defaultIteratorOptions = options.defaultIterator;
	subscribable.iterator = (itOptions?: EventIteratorOptions) => createAsyncIterator(subscribe, unsubscribe, {
		...defaultIteratorOptions,
		...itOptions
	});
	(subscribable as any)[Symbol.asyncIterator] = () => createAsyncIterator(subscribe, unsubscribe, defaultIteratorOptions);

	return subscribable as any;
}

/**
 * Create a Subscribable that is filtered via the specified function.
 *
 * @param subscribe -
 *   function used to subscribe listeners
 * @param unsubscribe -
 *   function used to unsubscribe listeners
 * @param filterToApply -
 *   function used to fitler events
 * @returns
 *   `Subscribable`
 */
function createFilteredSubscribable<This, Args extends any[]>(
	subscribe: SubscribeFunction<This, Args>,
	unsubscribe: UnsubscribeFunction<This, Args>,
	filterToApply: (this: This, ...args: Args) => boolean
): Subscribable<This, Args> {
	// Map used to keep track of the filtered listener of an added listener
	const listenerMapping = new Map<Listener<This, Args>, Listener<This, Args>>();

	return createSubscribable({
		subscribe: listener => {
			const actualListener = function(this: This, ...args: Args) {
				if(filterToApply.apply(this, args)) {
					listener.call(this, ...args);
				}
			};

			listenerMapping.set(listener, actualListener);
			subscribe(actualListener);
		},
		unsubscribe: listener => {
			const actual = listenerMapping.get(listener);
			if(actual) {
				listenerMapping.delete(listener);
				return unsubscribe(actual);
			} else {
				return false;
			}
		}
	});
}

/**
 * Create a Subscribable that changes what this is used for listeners.
 *
 * @param subscribe -
 *   function used to subscribe listeners
 * @param unsubscribe -
 *   function used to unsubscribe listeners
 * @param newThis -
 *   object to use as the new this
 * @returns
 *   `Subscribable`
 */
function createNewThisSubscribable<CurrentThis, NewThis, Args extends any[]>(
	subscribe: SubscribeFunction<CurrentThis, Args>,
	unsubscribe: UnsubscribeFunction<CurrentThis, Args>,
	newThis: NewThis
): Subscribable<NewThis, Args> {
	// Map used to keep track of the modified listeners
	const listenerMapping = new Map<Listener<NewThis, Args>, Listener<CurrentThis, Args>>();

	return createSubscribable({
		subscribe: listener => {
			const actualListener = function(this: CurrentThis, ...args: Args) {
				listener.call(newThis, ...args);
			};

			listenerMapping.set(listener, actualListener);
			subscribe(actualListener);
		},
		unsubscribe: listener => {
			const actual = listenerMapping.get(listener);
			if(actual) {
				listenerMapping.delete(listener);
				return unsubscribe(actual);
			} else {
				return false;
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
	subscribe: SubscribeFunction<unknown, Args>,
	unsubscribe: UnsubscribeFunction<unknown, Args>,
	options?: EventIteratorOptions
): AsyncIterableIterator<Args> {
	const limit = options?.limit ?? 0;
	const behavior = options?.overflowBehavior ?? OverflowBehavior.DropOldest;
	if(behavior === OverflowBehavior.Block) {
		throw new Error('Blocking is not a supported strategy for non-async events');
	}

	const queue: Args[] = [];
	let current: ((v: IteratorResult<Args>) => void) | null = null;

	const listener = (...args: Args) => {
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
					}
				}
			}

			queue.push(args);
		}
	};

	subscribe(listener);

	return {
		next() {
			if(queue.length > 0) {
				// There is data in the queue, pull it
				const result = queue.shift();
				if(! result) {
					return Promise.reject('Unexpected error, event queue is empty');
				}

				return Promise.resolve({
					value: result,
					done: false
				});
			} else {
				// Nothing in the queue, register the promise
				return new Promise<IteratorResult<Args>>(resolve => {
					current = resolve;
				});
			}
		},

		async return(value?: any) {
			unsubscribe(listener);
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
