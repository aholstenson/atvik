import type { Listener } from './Listener.js';
import type { SubscribeOptions } from './SubscribeOptions.js';
import type { SubscriptionFunctions } from './SubscriptionFunctions.js';
import type { SubscriptionHandle } from './SubscriptionHandle.js';

/**
 * Function that can be used to subscribe, filter and iterate over events.
 * Subscribables are commonly fetched from an {@link Event}, adapted from
 * another event emitters using {@link createEventAdapter} or manually created
 * via {@link createSubscribable}.
 *
 * ## Subscribing and unsubscribing
 *
 * Subscribables are functions that allow them to be called directly to
 * subscribe to the event:
 *
 * ```javascript
 * // Subscribe to the event
 * const handle = subscribable(arg1 => console.log('event', arg1));
 *
 * // Unsubscribe via the returned handle
 * handle.unsubscribe();
 * ```
 *
 * It is also possible to subscribe/unsubscribe a listener using methods on
 * the subscribable:
 *
 * ```javascript
 * const listener = arg1 => console.log('event', arg1);
 * subscribable.subscribe(listener);
 * subscribable.unsubscribe(listener);
 * ```
 *
 * ## Filtering
 *
 * Subscribables may be filtered to create an instance that only emits certain
 * events:
 *
 * ```javascript
 * const filteredSubscribable = subscribable.filter(arg1 => arg1 > 10);
 * ```
 *
 * ## Listening to something once
 *
 * Listening for a single event may be done via {@link once} which returns
 * a promise:
 *
 * ```javascript
 * const [ arg1 ] = await subscribable.once();
 * ```
 *
 * ## Async iteration of events
 *
 * Subscribables can also be used with an async iterator to allow for event
 * loops:
 *
 * With default values:
 *
 * ```javascript
 * for await (const [ arg1 ] of subscribable) {
 *   console.log('event', arg1);
 * }
 * ```
 *
 * Sometimes events are emitted faster than they can be consumed, limiting and
 * controlling overflow of events can be done via `iterator()`.
 *
 * As an example this will limit to 10 queued events and then start dropping
 * the earliest ones:
 *
 * ```javascript
 * for await (const [ arg1 ] of subscribable.iterator({ limit: 10 })) {
 *   console.log('event', arg1);
 * }
 * ```
 *
 * The behavior to use when the queue is full can be controlled by setting the
 * overflow behavior to either `OverflowBehavior.DropNewest` or `OverflowBehavior.DropOldest`.
 *
 * ```javascript
 * const iteratorOptions = {
 *   limit: 10,
 *   overflowBehavior: OverflowBehavior.DropNewest
 * };
 *
 * for await (const [ arg1 ] of subscribable.iterator(iteratorOptions)) {
 *   console.log('event', arg1);
 * }
 * ```
 */
export interface Subscribable<This, Args extends unknown[] = []> extends SubscriptionFunctions<This, Args> {
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
	 *   handle to the subscription, can be used to unsubscribe
	 */
	(listener: Listener<This, Args>, options?: SubscribeOptions): SubscriptionHandle;
}
