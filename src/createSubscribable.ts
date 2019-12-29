import { Subscribable } from './Subscribable';
import { Listener } from './Listener';
import { SubscriptionHandle } from './SubscriptionHandle';

/**
 * Create a Subscribable given a subscribe, unsubscribe and a once function.
 *
 * @param subscribe
 * @param unsubscribe
 * @param once
 */
export function createSubscribable<This, Args extends any[]>(
	subscribe: (listener: Listener<This, Args>) => SubscriptionHandle,
	unsubscribe: (listener: Listener<This, Args>) => boolean,
	once: () => Promise<Args>
): Subscribable<This, Args> {
	const subscribable = (listener: Listener<This, Args>) => subscribe(listener);
	subscribable.subscribe = subscribe;
	subscribable.unsubscribe = unsubscribe;
	subscribable.once = once;

	return subscribable;
}
