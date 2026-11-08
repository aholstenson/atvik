import type { AsyncSubscribable } from './AsyncSubscribable.js';
import type { AsyncSubscriptionHandle } from './AsyncSubscriptionHandle.js';
import { type ErrorStrategy, rethrowErrors } from './ErrorStrategy.js';
import { createEventIterator } from './createEventIterator.js';
import { asyncDisposeSymbol } from './disposeSymbols.js';
import type { EventIteratorOptions } from './EventIteratorOptions.js';
import type { Listener } from './Listener.js';
import type { OnceOptions, SubscribeOptions } from './SubscribeOptions.js';
import { ListenerMapping } from './ListenerMapping.js';

/**
 * Function used to subscribe a listener.
 */
export type AsyncSubscribeFunction<This, Args extends unknown[]> = (listener: Listener<This, Args>) => Promise<void>;

/**
 * Function used to unsubscribe a listener.
 */
export type AsyncUnsubscribeFunction<This, Args extends unknown[]> = (listener: Listener<This, Args>) => Promise<void>;

/**
 * Options for `createAsyncSubscribable`.
 */
export interface AsyncSubscribableOptions<This, Args extends unknown[]> {
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
export function createAsyncSubscribable<This, Args extends unknown[]>(
	options: AsyncSubscribableOptions<This, Args>
): AsyncSubscribable<This, Args> {
	const subscribe = options.subscribe;
	const unsubscribe = options.unsubscribe;

	const defaultErrorStrategy = options.defaultErrorStrategy ?? rethrowErrors;

	const subscribable = async (
		listener: Listener<This, Args>,
		subscribeOptions?: SubscribeOptions
	): Promise<AsyncSubscriptionHandle> => {
		const signal = subscribeOptions?.signal;
		if(signal?.aborted) {
			// Same as addEventListener, an aborted signal does not subscribe
			return createAsyncHandle(async () => undefined);
		}

		await subscribe(listener);

		if(! signal) {
			return createAsyncHandle(() => unsubscribe(listener));
		}

		if(signal.aborted) {
			// The signal was aborted while the listener was subscribed
			await unsubscribe(listener);
			return createAsyncHandle(async () => undefined);
		}

		const onAbort = () => {
			unsubscribe(listener)
				.catch(err => defaultErrorStrategy.handle(err));
		};
		signal.addEventListener('abort', onAbort, { once: true });

		return createAsyncHandle(() => {
			signal.removeEventListener('abort', onAbort);
			return unsubscribe(listener);
		});
	};

	subscribable.subscribe = subscribable;
	subscribable.unsubscribe = unsubscribe;

	subscribable.once = (onceOptions?: OnceOptions) => new Promise<Args>((resolve, reject) => {
		const signal = onceOptions?.signal;
		if(signal?.aborted) {
			reject(signal.reason);
			return;
		}

		let settled = false;

		const finish = () => {
			settled = true;
			signal?.removeEventListener('abort', onAbort);

			// Unsubscribe when the subscription is done, errors are ignored
			subscription
				.then(() => unsubscribe(listener))
				.catch(() => undefined);
		};

		const onAbort = () => {
			if(settled) return;

			finish();
			reject(signal?.reason);
		};

		const listener = (...args: Args) => {
			if(settled) return;

			finish();
			resolve(args);
		};

		const subscription = subscribe(listener);
		subscription.catch(err => {
			if(settled) return;

			settled = true;
			signal?.removeEventListener('abort', onAbort);
			reject(err);
		});

		signal?.addEventListener('abort', onAbort, { once: true });
	});

	subscribable.filter = (filter: (this: This, ...args: Args) => boolean) => createFilteredAsyncSubscribable(
		subscribe,
		unsubscribe,
		filter,
		defaultErrorStrategy
	);

	subscribable.map = <NewArgs extends [ unknown, ...unknown[] ] | []>(
		mapper: (this: This, ...args: Args) => NewArgs | Promise<NewArgs>
	) => createMappedAsyncSubscribable(subscribe, unsubscribe, mapper, defaultErrorStrategy);

	subscribable.withThis = <NewThis>(newThis: NewThis) => createNewThisAsyncSubscribable(
		subscribe,
		unsubscribe,
		newThis,
		defaultErrorStrategy
	);

	const defaultIteratorOptions = options.defaultIterator;
	const iteratorSource = { subscribe, unsubscribe, allowBlock: true, errorStrategy: defaultErrorStrategy };
	subscribable.iterator = (itOptions?: EventIteratorOptions) => createEventIterator(iteratorSource, {
		...defaultIteratorOptions,
		...itOptions
	});
	(subscribable as any)[Symbol.asyncIterator] = () => createEventIterator(iteratorSource, defaultIteratorOptions);

	return subscribable as any;
}

/**
 * Create a handle that runs the given function to unsubscribe.
 *
 * @param remove -
 *   function that unsubscribes the listener
 * @returns
 *   handle
 */
function createAsyncHandle(remove: () => Promise<void>): AsyncSubscriptionHandle {
	return {
		unsubscribe: remove,
		[asyncDisposeSymbol]: remove
	};
}

/**
 * Create a AsyncSubscribable that is filtered via the specified function.
 *
 * The wrapped listener returns the result of the filter and the listener, so
 * that emitters can wait for them and handle their errors.
 *
 * @param subscribe -
 *   function used to subscribe listeners
 * @param unsubscribe -
 *   function used to unsubscribe listeners
 * @param filterToApply -
 *   the function used to filter events
 * @param errorStrategy -
 *   error strategy of the returned subscribable
 * @returns
 *   `AsyncSubscribable`
 */
function createFilteredAsyncSubscribable<This, Args extends unknown[]>(
	subscribe: AsyncSubscribeFunction<This, Args>,
	unsubscribe: AsyncUnsubscribeFunction<This, Args>,
	filterToApply: (this: This, ...args: Args) => boolean | Promise<boolean>,
	errorStrategy: ErrorStrategy
): AsyncSubscribable<This, Args> {
	return createWrappedAsyncSubscribable(subscribe, unsubscribe, errorStrategy, listener => async function(this: This, ...args: Args) {
		if(await filterToApply.apply(this, args)) {
			await listener.apply(this, args);
		}
	});
}

/**
 * Create a AsyncSubscribable that changes the arguments of events.
 *
 * @param subscribe -
 *   function used to subscribe listeners
 * @param unsubscribe -
 *   function used to unsubscribe listeners
 * @param mapper -
 *   function that returns the new arguments
 * @param errorStrategy -
 *   error strategy of the returned subscribable
 * @returns
 *   `AsyncSubscribable`
 */
function createMappedAsyncSubscribable<This, Args extends unknown[], NewArgs extends unknown[]>(
	subscribe: AsyncSubscribeFunction<This, Args>,
	unsubscribe: AsyncUnsubscribeFunction<This, Args>,
	mapper: (this: This, ...args: Args) => NewArgs | Promise<NewArgs>,
	errorStrategy: ErrorStrategy
): AsyncSubscribable<This, NewArgs> {
	return createWrappedAsyncSubscribable(
		subscribe,
		unsubscribe,
		errorStrategy,
		(listener: Listener<This, NewArgs>) => async function(this: This, ...args: Args) {
			await listener.apply(this, await mapper.apply(this, args));
		}
	);
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
 * @param errorStrategy -
 *   error strategy of the returned subscribable
 * @returns
 *   `AsyncSubscribable`
 */
function createNewThisAsyncSubscribable<CurrentThis, NewThis, Args extends unknown[]>(
	subscribe: AsyncSubscribeFunction<CurrentThis, Args>,
	unsubscribe: AsyncUnsubscribeFunction<CurrentThis, Args>,
	newThis: NewThis,
	errorStrategy: ErrorStrategy
): AsyncSubscribable<NewThis, Args> {
	return createWrappedAsyncSubscribable(
		subscribe,
		unsubscribe,
		errorStrategy,
		(listener: Listener<NewThis, Args>) => (...args: Args) => listener.apply(newThis, args)
	);
}

/**
 * Create a AsyncSubscribable that wraps every listener before it is
 * subscribed.
 *
 * @param subscribe -
 *   function used to subscribe wrapped listeners
 * @param unsubscribe -
 *   function used to unsubscribe wrapped listeners
 * @param errorStrategy -
 *   error strategy of the returned subscribable
 * @param wrap -
 *   function that creates the wrapped listener
 * @returns
 *   `AsyncSubscribable`
 */
function createWrappedAsyncSubscribable<This, Args extends unknown[], WrappedThis, WrappedArgs extends unknown[]>(
	subscribe: AsyncSubscribeFunction<WrappedThis, WrappedArgs>,
	unsubscribe: AsyncUnsubscribeFunction<WrappedThis, WrappedArgs>,
	errorStrategy: ErrorStrategy,
	wrap: (listener: Listener<This, Args>) => Listener<WrappedThis, WrappedArgs>
): AsyncSubscribable<This, Args> {
	const mapping = new ListenerMapping(wrap);

	return createAsyncSubscribable({
		subscribe: async listener => {
			const wrapped = mapping.add(listener);
			if(! wrapped) return;

			try {
				await subscribe(wrapped);
			} catch(err) {
				// The subscription failed, forget the listener so it can be added again
				mapping.remove(listener);
				throw err;
			}
		},
		unsubscribe: async listener => {
			const wrapped = mapping.remove(listener);
			if(wrapped) {
				await unsubscribe(wrapped);
			}
		},
		defaultErrorStrategy: errorStrategy
	});
}
