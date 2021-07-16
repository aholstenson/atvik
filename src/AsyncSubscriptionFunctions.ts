import { AsyncSubscribable } from './AsyncSubscribable';
import { AsyncSubscriptionHandle } from './AsyncSubscriptionHandle';
import { EventIteratorOptions } from './EventIteratorOptions';
import { Listener } from './Listener';

/**
 * Functions used to asynchronously subscribe and unsubscribe to an event.
 */
export interface AsyncSubscriptionFunctions<This, Args extends any[] = []>
	extends AsyncIterable<Args> {
	/**
	 * Subscribe to this event using the given listener. The listener will
	 * be invoked any time the event is emitted. The returned handle can be
	 * used to unsubscribe.
	 *
	 * @param listener -
	 *   listener to subscribe
	 * @returns
	 *   promise with handle to the subscription, can be used to unsubscribe.
	 *   Resolves when the subscription is fully registered
	 */
	subscribe(listener: Listener<This, Args>): Promise<AsyncSubscriptionHandle>;

	/**
	 * Unsubscribe a listener from this handler. The specified listener will
	 * no longer be invoked when the event is emitted.
	 *
	 * @param listener -
	 *   listener to unsubscribe
	 * @returns
	 *   promise that resolves when the listener is unsubscribed
	 */
	unsubscribe(listener: Listener<This, Args>): Promise<void>;

	/**
	 * Get a promise that will resolve the first time this event is fired
	 * after this call.
	 *
	 * @returns
	 *   promise that resolves the next time the event is fired
	 */
	once(): Promise<Args>;

	/**
	 * Create a subscribable that will apply the specified filter to any
	 * listeners added.
	 *
	 * @param filter -
	 *   function used to filter events
	 * @returns
	 *   filtered `AsyncSubscribable`
	 */
	filter(filter: (this: This, ...args: Args) => boolean | Promise<boolean>): AsyncSubscribable<This, Args>;

	/**
	 * Create a Subscribable that changes the this argument used for listeners.
	 *
	 * @param newThis -
	 *   what should be treated as this for event listeners
	 * @returns
	 *   modified `AsyncSubscribable`
	 */
	withThis<NewThis>(newThis: NewThis): AsyncSubscribable<NewThis, Args>;

	/**
	 * Create an iterator that supports async iteration of events emitted.
	 *
	 * @param options -
	 *   options for this iterator
	 * @returns
	 *   iterable/iterator
	 */
	iterator(options?: EventIteratorOptions): AsyncIterableIterator<Args>;
}
