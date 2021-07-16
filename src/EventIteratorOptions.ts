/**
 * Behavior to use when an iterator is overflowing.
 */
export enum OverflowBehavior {
	/**
	 * Drop the oldest event.
	 */
	DropOldest = 'drop-oldest',

	/**
	 * Drop the newest event.
	 */
	DropNewest = 'drop-newest',

	/**
	 * Block processing.
	 *
	 * *Warning*: This only works with {@link AsyncEvent} and {@link AsyncSubscribable}
	 * and may lead to unintended side effects.
	 */
	Block = 'block',
}

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
}
