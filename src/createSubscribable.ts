import { Listener } from './Listener';

import { Subscribable } from './Subscribable';
import { SubscriptionHandle } from './SubscriptionHandle';

/**
 * Create a Subscribable given a subscribe, unsubscribe and a once function.
 *
 * @param subscribe
 * @param unsubscribe
 */
export function createSubscribable<This, Args extends any[]>(
	subscribe: (listener: Listener<This, Args>) => void,
	unsubscribe: (listener: Listener<This, Args>) => boolean,
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
	subscribe: (listener: Listener<This, Args>) => void,
	unsubscribe: (listener: Listener<This, Args>) => boolean,
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
