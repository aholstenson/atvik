import { AsyncListener } from './AsyncListener';
import { AsyncSubscriptionFunctions } from './AsyncSubscriptionFunctions';
import { AsyncSubscriptionHandle } from './AsyncSubscriptionHandle';

/**
 * Functions used to asynchronously subscribe and unsubscribe to an event.
 */
export interface AsyncSubscribable<This, Args extends any[] = []> extends AsyncSubscriptionFunctions<This, Args> {
	/**
	 * Subscribe to this event using the given listener. The listener will
	 * be invoked any time the event is emitted. The returned handle can be
	 * used to unsubscribe.
	 *
	 * @param listener -
	 *   listener to subscribe
	 * @returns
	 *   handle to the subscription, can be used to unsubscribe. Resolves
	 *   when the subscription is fully registered
	 */
	(listener: AsyncListener<This, Args>): Promise<AsyncSubscriptionHandle>;
}
