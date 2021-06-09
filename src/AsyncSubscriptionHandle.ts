/**
 * Handle that points to a previously subscribed listener. This handle is
 * returned when a subscription occurs and can be used to remove the
 * subscription.
 */
export interface AsyncSubscriptionHandle {
	/**
	 * Unsubscribe, the listener will no longer receive events.
	 *
	 * @returns
	 *   promise that resolves when the listener is fully unsubscribed
	 */
	unsubscribe(): Promise<void>;
}
