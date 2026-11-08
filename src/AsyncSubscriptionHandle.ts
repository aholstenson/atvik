/**
 * Handle that points to a previously subscribed listener. This handle is
 * returned when a subscription occurs and can be used to remove the
 * subscription.
 *
 * The handle is `AsyncDisposable`, so `await using` can unsubscribe the
 * listener at the end of a block:
 *
 * ```javascript
 * {
 *   await using handle = await event.subscribe(listener);
 *   // listener receives events here
 * }
 * // listener is unsubscribed here
 * ```
 */
export interface AsyncSubscriptionHandle extends AsyncDisposable {
	/**
	 * Unsubscribe, the listener will no longer receive events.
	 *
	 * @returns
	 *   promise that resolves when the listener is fully unsubscribed
	 */
	unsubscribe(): Promise<void>;
}
