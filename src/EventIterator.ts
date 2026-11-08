/**
 * Async iterator over the events of a {@link Subscribable} or
 * {@link AsyncSubscribable}. Each value is the array of arguments of an
 * event.
 *
 * The iterator subscribes on the first call to `next()` and unsubscribes when
 * `return()` is called. A `for await ... of` loop calls `return()` when the
 * loop exits. The iterator is also `AsyncDisposable`, so `await using` can
 * stop it:
 *
 * ```javascript
 * await using iterator = event.iterator();
 * const { value } = await iterator.next();
 * ```
 */
export interface EventIterator<Args extends unknown[]> extends AsyncIterableIterator<Args>, AsyncDisposable {
	/**
	 * Stop the iterator and unsubscribe its listener.
	 *
	 * @param value -
	 *   value to return
	 * @returns
	 *   promise that resolves when the listener is unsubscribed
	 */
	return(value?: any): Promise<IteratorResult<Args>>;

	/**
	 * Get this iterator.
	 *
	 * @returns
	 *   this iterator
	 */
	[Symbol.asyncIterator](): EventIterator<Args>;
}
