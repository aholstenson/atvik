import type { AsyncSubscribable } from './AsyncSubscribable.js';
import type { AsyncSubscriptionHandle } from './AsyncSubscriptionHandle.js';
import type { EventIterator } from './EventIterator.js';
import type { EventIteratorOptions } from './EventIteratorOptions.js';
import type { Listener } from './Listener.js';
import type { OnceOptions, SubscribeOptions } from './SubscribeOptions.js';

/**
 * Functions used to asynchronously subscribe and unsubscribe to an event.
 */
export interface AsyncSubscriptionFunctions<This, Args extends unknown[] = []>
	extends AsyncIterable<Args> {
	/**
	 * Subscribe to this event using the given listener. The listener will
	 * be invoked any time the event is emitted. The returned handle can be
	 * used to unsubscribe.
	 *
	 * @param listener -
	 *   listener to subscribe
	 * @param options -
	 *   options for the subscription, such as a signal that unsubscribes
	 * @returns
	 *   promise with handle to the subscription, can be used to unsubscribe.
	 *   Resolves when the subscription is fully registered
	 */
	subscribe(listener: Listener<This, Args>, options?: SubscribeOptions): Promise<AsyncSubscriptionHandle>;

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
	 * @param options -
	 *   options, such as a signal that stops the wait
	 * @returns
	 *   promise that resolves the next time the event is fired
	 */
	once(options?: OnceOptions): Promise<Args>;

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
	 * Create a subscribable that changes the arguments of events before
	 * listeners receive them. The mapper returns the new arguments as an
	 * array, or a promise of the array:
	 *
	 * ```javascript
	 * const doubled = subscribable.map(n => [ n * 2 ]);
	 * ```
	 *
	 * @param mapper -
	 *   function that returns the new arguments
	 * @returns
	 *   mapped `AsyncSubscribable`
	 */
	map<NewArgs extends [ unknown, ...unknown[] ] | []>(
		mapper: (this: This, ...args: Args) => NewArgs | Promise<NewArgs>
	): AsyncSubscribable<This, NewArgs>;

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
	iterator(options?: EventIteratorOptions): EventIterator<Args>;

	/**
	 * Create an iterator with the default options of this subscribable.
	 *
	 * @returns
	 *   iterable/iterator
	 */
	[Symbol.asyncIterator](): EventIterator<Args>;
}
