import { type ErrorStrategy, rethrowErrors } from './ErrorStrategy.js';
import { createEventIterator } from './createEventIterator.js';
import { disposeSymbol } from './disposeSymbols.js';
import type { EventIteratorOptions } from './EventIteratorOptions.js';
import type { Listener } from './Listener.js';
import { ListenerMapping } from './ListenerMapping.js';
import type { Subscribable } from './Subscribable.js';
import type { OnceOptions, SubscribeOptions } from './SubscribeOptions.js';
import type { SubscriptionHandle } from './SubscriptionHandle.js';

/**
 * Function used to subscribe a listener.
 */
export type SubscribeFunction<This, Args extends unknown[]> = (listener: Listener<This, Args>) => void;

/**
 * Function used to unsubscribe a listener.
 */
export type UnsubscribeFunction<This, Args extends unknown[]> = (listener: Listener<This, Args>) => void;

/**
 * Options for `createSubscribable`.
 */
export interface SubscribableOptions<This, Args extends unknown[]> {
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

	/**
	 * The error strategy to use by default.
	 */
	defaultErrorStrategy?: ErrorStrategy;
}

/**
 * Create a Subscribable given a subscribe, unsubscribe and a once function.
 *
 * @param options -
 *   options used to create this subscribable
 * @returns
 *   instance of `Subscribable`
 */
export function createSubscribable<This, Args extends unknown[]>(
	options: SubscribableOptions<This, Args>
): Subscribable<This, Args> {
	const subscribe = options.subscribe;
	const unsubscribe = options.unsubscribe;

	const defaultErrorStrategy = options.defaultErrorStrategy ?? rethrowErrors;

	const subscribable = (listener: Listener<This, Args>, subscribeOptions?: SubscribeOptions): SubscriptionHandle => {
		const signal = subscribeOptions?.signal;
		if(signal?.aborted) {
			// Same as addEventListener, an aborted signal does not subscribe
			return createHandle(() => undefined);
		}

		subscribe(listener);

		if(! signal) {
			return createHandle(() => unsubscribe(listener));
		}

		const onAbort = () => {
			try {
				unsubscribe(listener);
			} catch(err) {
				defaultErrorStrategy.handle(err);
			}
		};
		signal.addEventListener('abort', onAbort, { once: true });

		return createHandle(() => {
			signal.removeEventListener('abort', onAbort);
			unsubscribe(listener);
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

		const onAbort = () => {
			unsubscribe(listener);
			reject(signal?.reason);
		};

		const listener = (...args: Args) => {
			signal?.removeEventListener('abort', onAbort);
			unsubscribe(listener);

			resolve(args);
		};

		subscribe(listener);
		signal?.addEventListener('abort', onAbort, { once: true });
	});

	subscribable.filter = (filter: (this: This, ...args: Args) => boolean) => createFilteredSubscribable(
		subscribe,
		unsubscribe,
		filter,
		defaultErrorStrategy
	);

	subscribable.withThis = <NewThis>(newThis: NewThis) => createNewThisSubscribable(
		subscribe,
		unsubscribe,
		newThis,
		defaultErrorStrategy
	);

	const defaultIteratorOptions = options.defaultIterator;
	const iteratorSource = { subscribe, unsubscribe, allowBlock: false, errorStrategy: defaultErrorStrategy };
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
function createHandle(remove: () => void): SubscriptionHandle {
	return {
		unsubscribe: remove,
		[disposeSymbol]: remove
	};
}

/**
 * Create a Subscribable that is filtered via the specified function.
 *
 * The wrapped listener returns the result of the filter and the listener, so
 * that emitters can wait for them and handle their errors.
 *
 * @param subscribe -
 *   function used to subscribe listeners
 * @param unsubscribe -
 *   function used to unsubscribe listeners
 * @param filterToApply -
 *   function used to filter events
 * @param errorStrategy -
 *   error strategy of the returned subscribable
 * @returns
 *   `Subscribable`
 */
function createFilteredSubscribable<This, Args extends unknown[]>(
	subscribe: SubscribeFunction<This, Args>,
	unsubscribe: UnsubscribeFunction<This, Args>,
	filterToApply: (this: This, ...args: Args) => boolean | Promise<boolean>,
	errorStrategy: ErrorStrategy
): Subscribable<This, Args> {
	return createMappedSubscribable(subscribe, unsubscribe, errorStrategy, listener => function(this: This, ...args: Args) {
		const result = filterToApply.apply(this, args);
		if(typeof result === 'boolean') {
			return result ? listener.apply(this, args) : undefined;
		}

		return result.then(matches => matches ? listener.apply(this, args) : undefined);
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
 * @param errorStrategy -
 *   error strategy of the returned subscribable
 * @returns
 *   `Subscribable`
 */
function createNewThisSubscribable<CurrentThis, NewThis, Args extends unknown[]>(
	subscribe: SubscribeFunction<CurrentThis, Args>,
	unsubscribe: UnsubscribeFunction<CurrentThis, Args>,
	newThis: NewThis,
	errorStrategy: ErrorStrategy
): Subscribable<NewThis, Args> {
	return createMappedSubscribable(
		subscribe,
		unsubscribe,
		errorStrategy,
		(listener: Listener<NewThis, Args>) => (...args: Args) => listener.apply(newThis, args)
	);
}

/**
 * Create a Subscribable that wraps every listener before it is subscribed.
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
 *   `Subscribable`
 */
function createMappedSubscribable<This, Args extends unknown[], WrappedThis, WrappedArgs extends unknown[]>(
	subscribe: SubscribeFunction<WrappedThis, WrappedArgs>,
	unsubscribe: UnsubscribeFunction<WrappedThis, WrappedArgs>,
	errorStrategy: ErrorStrategy,
	wrap: (listener: Listener<This, Args>) => Listener<WrappedThis, WrappedArgs>
): Subscribable<This, Args> {
	const mapping = new ListenerMapping(wrap);

	return createSubscribable({
		subscribe: listener => {
			const wrapped = mapping.add(listener);
			if(wrapped) {
				subscribe(wrapped);
			}
		},
		unsubscribe: listener => {
			const wrapped = mapping.remove(listener);
			if(wrapped) {
				unsubscribe(wrapped);
			}
		},
		defaultErrorStrategy: errorStrategy
	});
}
