import { Listener } from './Listener';

import { Subscribable } from './Subscribable';
import { SubscriptionHandle } from './SubscriptionHandle';

export type SubscribeFunction<This, Args extends any[]> = (listener: Listener<This, Args>) => void;
export type UnsubscribeFunction<This, Args extends any[]> = (listener: Listener<This, Args>) => boolean;

/**
 * Create a Subscribable given a subscribe, unsubscribe and a once function.
 *
 * @param subscribe
 * @param unsubscribe
 */
export function createSubscribable<This, Args extends any[]>(
	subscribe: SubscribeFunction<This, Args>,
	unsubscribe: UnsubscribeFunction<This, Args>,
): Subscribable<This, Args> {
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

	subscribable.once = () => new Promise<Args>((resolve, reject) => {
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

	return subscribable;
}

/**
 * Create a Subscribable that is filtered via the specified function.
 *
 * @param subscribe
 * @param unsubscribe
 * @param filterToApply
 */
function createFilteredSubscribable<This, Args extends any[]>(
	subscribe: SubscribeFunction<This, Args>,
	unsubscribe: UnsubscribeFunction<This, Args>,
	filterToApply: (this: This, ...args: Args) => boolean
): Subscribable<This, Args> {
	// Map used to keep track of the filtered listener of an added listener
	const listenerMapping = new Map<Listener<This, Args>, Listener<This, Args>>();

	return createSubscribable(
		listener => {
			const actualListener = function(this: This, ...args: Args) {
				if(filterToApply.apply(this, args)) {
					listener.call(this, ...args);
				}
			};

			listenerMapping.set(listener, actualListener);
			subscribe(actualListener);
		},
		listener => {
			const actual = listenerMapping.get(listener);
			if(actual) {
				listenerMapping.delete(listener);
				return unsubscribe(actual);
			} else {
				return false;
			}
		}
	);
}

/**
 * Create a Subscribable that changes what this is used for listeners.
 *
 * @param subscribe
 * @param unsubscribe
 * @param filterToApply
 */
function createNewThisSubscribable<CurrentThis, NewThis, Args extends any[]>(
	subscribe: SubscribeFunction<CurrentThis, Args>,
	unsubscribe: UnsubscribeFunction<CurrentThis, Args>,
	newThis: NewThis
): Subscribable<NewThis, Args> {
	// Map used to keep track of the modified listeners
	const listenerMapping = new Map<Listener<NewThis, Args>, Listener<CurrentThis, Args>>();

	return createSubscribable(
		listener => {
			const actualListener = function(this: CurrentThis, ...args: Args) {
				listener.call(newThis, ...args);
			};

			listenerMapping.set(listener, actualListener);
			subscribe(actualListener);
		},
		listener => {
			const actual = listenerMapping.get(listener);
			if(actual) {
				listenerMapping.delete(listener);
				return unsubscribe(actual);
			} else {
				return false;
			}
		}
	);
}
