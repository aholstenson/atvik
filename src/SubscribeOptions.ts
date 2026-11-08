/**
 * Options for subscribing a listener.
 */
export interface SubscribeOptions {
	/**
	 * Signal that unsubscribes the listener when it is aborted. If the signal
	 * is already aborted, the listener is not subscribed.
	 */
	signal?: AbortSignal;
}

/**
 * Options for `once`.
 */
export interface OnceOptions {
	/**
	 * Signal that stops the wait. When the signal is aborted the promise
	 * rejects with the reason of the signal. Use `AbortSignal.timeout(ms)` to
	 * stop waiting after a time.
	 */
	signal?: AbortSignal;
}
