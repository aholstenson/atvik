/**
 * Handle that points to a previously subscribed listener. This handle is
 * returned when a subscription occurs and can be used to remove the
 * subscription.
 *
 * The handle is `Disposable`, so `using` can unsubscribe the listener at the
 * end of a block:
 *
 * ```javascript
 * {
 *   using handle = event.subscribe(listener);
 *   // listener receives events here
 * }
 * // listener is unsubscribed here
 * ```
 */
export interface SubscriptionHandle extends Disposable {
	/**
	 * Unsubscribe, the listener will no longer receive events.
	 */
	unsubscribe(): void;
}
