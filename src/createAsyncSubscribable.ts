import { AsyncSubscribable } from './AsyncSubscribable';
import { AsyncSubscriptionHandle } from './AsyncSubscriptionHandle';
import { Listener } from './Listener';

/**
 * Function used to subscribe a listener.
 */
export type AsyncSubscribeFunction<This, Args extends any[]> = (listener: Listener<This, Args>) => Promise<void>;

/**
 * Function used to unsubscribe a listener, should return if the listener was
 * subscribed or not.
 */
export type AsyncUnsubscribeFunction<This, Args extends any[]> = (listener: Listener<This, Args>) => Promise<boolean>;

/**
 * Create a AsyncSubscribable instance that uses the give subscribe and
 * unsubscribe function to manage listeners.
 *
 * @param subscribe -
 *   function used to subscribe listeners
 * @param unsubscribe -
 *   function used to unsubscribe listeners
 * @returns
 *   instance of `AsyncSubscribable`
 */
export function createAsyncSubscribable<This, Args extends any[]>(
	subscribe: AsyncSubscribeFunction<This, Args>,
	unsubscribe: AsyncUnsubscribeFunction<This, Args>,
): AsyncSubscribable<This, Args> {
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
		filter
	);

	subscribable.withThis = <NewThis>(newThis: NewThis) => createNewThisAsyncSubscribable(subscribe, unsubscribe, newThis);

	return subscribable;
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
 * @returns
 *   `AsyncSubscribable`
 */
function createFilteredAsyncSubscribable<This, Args extends any[]>(
	subscribe: AsyncSubscribeFunction<This, Args>,
	unsubscribe: AsyncUnsubscribeFunction<This, Args>,
	filterToApply: (this: This, ...args: Args) => boolean
): AsyncSubscribable<This, Args> {
	// Map used to keep track of the filtered listener of an added listener
	const listenerMapping = new Map<Listener<This, Args>, Listener<This, Args>>();

	return createAsyncSubscribable(
		listener => {
			const actualListener = function(this: This, ...args: Args) {
				if(filterToApply.apply(this, args)) {
					listener.call(this, ...args);
				}
			};

			listenerMapping.set(listener, actualListener);
			return subscribe(actualListener);
		},
		listener => {
			const actual = listenerMapping.get(listener);
			if(actual) {
				listenerMapping.delete(listener);
				return unsubscribe(actual);
			} else {
				return Promise.resolve(false);
			}
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

	return createAsyncSubscribable(
		listener => {
			const actualListener = function(this: CurrentThis, ...args: Args) {
				listener.call(newThis, ...args);
			};

			listenerMapping.set(listener, actualListener);
			return subscribe(actualListener);
		},
		listener => {
			const actual = listenerMapping.get(listener);
			if(actual) {
				listenerMapping.delete(listener);
				return unsubscribe(actual);
			} else {
				return Promise.resolve(false);
			}
		}
	);
}
