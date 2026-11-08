/**
 * Behavior to use when an iterator is overflowing.
 *
 * The values are plain strings, so `'drop-oldest'` and
 * `OverflowBehavior.DropOldest` are the same value.
 */
export const OverflowBehavior = {
	/**
	 * Drop the oldest event.
	 */
	DropOldest: 'drop-oldest',

	/**
	 * Drop the newest event.
	 */
	DropNewest: 'drop-newest',

	/**
	 * Block processing.
	 *
	 * *Warning*: This only works with {@link AsyncEvent} and {@link AsyncSubscribable}
	 * and may lead to unintended side effects.
	 */
	Block: 'block',
} as const;

/**
 * Behavior to use when an iterator is overflowing. One of the values in
 * the `OverflowBehavior` object.
 */
export type OverflowBehavior = typeof OverflowBehavior[keyof typeof OverflowBehavior];

/**
 * Options available for iterators of events.
 */
export interface EventIteratorOptions {
	/**
	 * The maximum number of events to keep queued. This is used for when
	 * processing of events is slow, and will let the iterator drop old or new
	 * events or when used with {@link AsyncEvent} block emits.
	 *
	 * Defaults to unlimited.
	 */
	limit?: number;

	/**
	 * Behavior to use when this iterator has reached its limit for queued
	 * events.
	 */
	overflowBehavior?: OverflowBehavior;

	/**
	 * Signal that stops the iterator. When the signal is aborted the iterator
	 * unsubscribes and the iteration ends with `done: true`, so a
	 * `for await ... of` loop exits without an error.
	 */
	signal?: AbortSignal;
}
