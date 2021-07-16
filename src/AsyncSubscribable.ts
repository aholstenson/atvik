import { AsyncSubscriptionFunctions } from './AsyncSubscriptionFunctions';
import { AsyncSubscriptionHandle } from './AsyncSubscriptionHandle';
import { Listener } from './Listener';

/**
 * Function that can be used to asynchronously subscribe, filter and iterate
 * over events. Async subscribables are commonly fetched from an {@link AsyncEvent}
 * or manually created using {@link createAsyncSubscribable}.
 *
 * ## Subscribing and unsubscribing
 *
 * Async subscribables are functions that allow them to be called directly to
 * subscribe to the event:
 *
 * ```javascript
 * // Subscribe to the event
 * const handle = await asyncSubscribable(arg1 => console.log('event', arg1));
 *
 * // Unsubscribe via the returned handle
 * await handle.unsubscribe();
 * ```
 *
 * It is also possible to subscribe/unsubscribe a listener using methods on
 * the subscribable:
 *
 * ```javascript
 * const listener = arg1 => console.log('event', arg1);
 * await subscribable.asyncSubscribable(listener);
 * await subscribable.asyncSubscribable(listener);
 * ```
 *
 * ## Filtering
 *
 * Async subscribables may be filtered to create an instance that only emits
 * certain events:
 *
 * ```javascript
 * const filteredSubscribable = asyncSubscribable.filter(arg1 => arg1 > 10);
 * ```
 *
 * ## Listening to something once
 *
 * Listening for a single event may be done via {@link once} which returns
 * a promise:
 *
 * ```javascript
 * const [ arg1 ] = await asyncSubscribable.once();
 * ```
 *
 * ## Async iteration of events
 *
 * Async subscribables can also be used with an async iterator to allow for
 * event loops:
 *
 * With default values:
 *
 * ```javascript
 * for await (const [ arg1 ] of asyncSubscribable) {
 *   console.log('event', arg1);
 * }
 * ```
 *
 * Sometimes events are emitted faster than they can be consumed, limiting and
 * controlling overflow of events can be done via {@link iterator}.
 *
 * As an example this will limit to 10 queued events and then start dropping
 * the earliest ones:
 *
 * ```javascript
 * for await (const [ arg1 ] of asyncSubscribable.iterator({ limit: 100 })) {
 *   console.log('event', arg1);
 * }
 * ```
 *
 * The behavior to use when the queue is full can be controlled by setting the
 * overflow behavior using one of the {@link OverflowBehavior} values.
 *
 * ```javascript
 * const iteratorOptions = {
 *   limit: 10,
 *   overflowBehavior: OverflowBehavior.Block
 * };
 *
 * for await (const [ arg1 ] of subscribable.iterator(iteratorOptions)) {
 *   console.log('event', arg1);
 * }
 * ```
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
	(listener: Listener<This, Args>): Promise<AsyncSubscriptionHandle>;
}
