import { Listener } from './Listener';
import { SubscriptionHandle } from './SubscriptionHandle';
import { SubscriptionFunctions } from './SubscriptionFunctions';

/**
 * Functions used to subscribe and unsubscribe to an event.
 */
export interface Subscribable<This, Args extends any[] = []>
	extends SubscriptionFunctions<This, Args>
{
	/**
	 * Subscribe to the event, will invoke the given function when the event
	 * is emitted.
	 */
	(listener: Listener<This, Args>): SubscriptionHandle;
}
