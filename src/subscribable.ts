import { Listener } from './listener';
import { SubscriptionHandle } from './handle';

/**
 * Functions used to subscribe and unsubscribe to an event.
 */
export interface Subscribable<This, Args extends any[] = []> {
	/**
	 * Subscribe to the event, will invoke the given function when the event
	 * is emitted.
	 */
	(listener: Listener<This, Args>): SubscriptionHandle;

	/**
	 * Subscribe to the event, will invoke the given function when the event
	 * is emitted.
	 */
	subscribe(listener: Listener<This, Args>): SubscriptionHandle;

	/**
	 * Unsubscribe a previously subscribed listener.
	 *
	 * @param listener
	 */
	unsubscribe(listener: Listener<This, Args>): boolean;

	/**
	 * Subscribe to an event but only trigger the listener once.
	 *
	 * @param listener
	 */
	once(): Promise<Args>;
}
