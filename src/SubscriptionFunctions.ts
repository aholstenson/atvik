import { Listener } from './Listener';
import { SubscriptionHandle } from './SubscriptionHandle';
import { Subscribable } from './Subscribable';

/**
 * Functions used to subscribe and unsubscribe to an event.
 */
export interface SubscriptionFunctions<This, Args extends any[] = []> {
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

	/**
	 * Filter this subscribable.
	 *
	 * @param filter
	 */
	filter(filter: (this: This, ...args: Args) => boolean | Promise<boolean>): Subscribable<This, Args>;

	/**
	 * Create a Subscribable that changes the this argument used for listeners.
	 *
	 * @param newThis
	 */
	withThis<NewThis>(newThis: NewThis): Subscribable<NewThis, Args>;
}
