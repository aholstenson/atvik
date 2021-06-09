import { Listener } from './Listener';
import { SubscriptionFunctions } from './SubscriptionFunctions';
import { SubscriptionHandle } from './SubscriptionHandle';

/**
 * Functions used to subscribe and unsubscribe to an event.
 */
export interface Subscribable<This, Args extends any[] = []> extends SubscriptionFunctions<This, Args> {
	/**
	 * Subscribe to this event using the given listener. The listener will
	 * be invoked any time the event is emitted. The returned handle can be
	 * used to unsubscribe.
	 *
	 * @param listener -
	 *   listener to subscribe
	 * @returns
	 *   handle to the subscription, can be used to unsubscribe
	 */
	(listener: Listener<This, Args>): SubscriptionHandle;
}
