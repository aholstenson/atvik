import type { AsyncSubscribable } from './AsyncSubscribable.js';
import type { AsyncSubscriptionFunctions } from './AsyncSubscriptionFunctions.js';
import type { AsyncSubscriptionHandle } from './AsyncSubscriptionHandle.js';
import { createAsyncSubscribable } from './createAsyncSubscribable.js';
import { type ErrorStrategy, rethrowErrors } from './ErrorStrategy.js';
import type { EventIterator } from './EventIterator.js';
import type { EventIteratorOptions } from './EventIteratorOptions.js';
import type { Listener } from './Listener.js';
import type { OnceOptions, SubscribeOptions } from './SubscribeOptions.js';
import { ListenerRegistry } from './ListenerRegistry.js';

/**
 * Options that can be passed when creating an instance of {@link AsyncEvent}.
 */
export interface AsyncEventOptions {
	/**
	 * The default options that are applied to iterators. Use this to setup
	 * default limits and overflow behavior for iterators of this event.
	 */
	defaultIterator?: EventIteratorOptions;

	/**
	 * The error strategy to use by default. If not specified this will
	 * default to {@link rethrowErrors}.
	 */
	defaultErrorStrategy?: ErrorStrategy;
}

/**
 * An event that handles subscription in an asynchronous way.
 *
 * Each instance represents a single event:
 *
 * ```javascript
 * const event = new AsyncEvent(valueForThisInListeners);
 * ```
 *
 * The event can be emitted via the `emit` method:
 *
 * ```javascript
 * await event.emit('first-param', 'second-param');
 * ```
 *
 * Listeners can be added directly on the event, but it is recommended to
 * use `.subscribable` for any API that is public:
 *
 * ```javascript
 * // Adding a listener directly on the event
 * await event.subscribe(() => ...);
 *
 * // Subscribable provides a public API
 * await event.subscribable(() => ..)
 * await event.subscribable.subscribe(() => ...);
 * ```
 *
 * Listeners can be unsubscribed either via their handle or via the event:
 *
 * ```javascript
 * // Use handle for easier unsubscription
 * const handle = await event.subscribe(() => ...);
 * await handle.unsubscribe();
 *
 * // Unsubscribe the actual listener
 * const listener = () => ...;
 * await eventOrSubscribable.subscribe(listener);
 * await eventOrSubscribable.unsubscribe(listener);
 * ```
 */
export class AsyncEvent<Parent, Args extends unknown[] = []> implements AsyncSubscriptionFunctions<Parent, Args> {
	/**
	 * Public AsyncSubscribable that can safely be shared with consumers that
	 * should be able to listen for events.
	 */
	public readonly subscribable: AsyncSubscribable<Parent, Args>;

	/**
	 * Parent of this handler, used to apply the correct this to event listeners.
	 */
	readonly #parent: Parent;
	/**
	 * Listeners and monitors of this event.
	 */
	readonly #registry: ListenerRegistry<Parent, Args, this>;

	/**
	 * Create a new event.
	 *
	 * @param parent -
	 *   the parent that will be passed to listener as their `this`
	 * @param options -
	 *   options for this event
	 */
	public constructor(
		parent: Parent,
		options?: AsyncEventOptions
	) {
		this.#parent = parent;
		this.#registry = new ListenerRegistry(this);

		this.subscribable = createAsyncSubscribable({
			subscribe: this.subscribe0.bind(this),
			unsubscribe: this.unsubscribe0.bind(this),
			defaultIterator: options?.defaultIterator,
			defaultErrorStrategy: options?.defaultErrorStrategy ?? rethrowErrors
		});
	}

	/**
	 * Emit this event. This will invoke all of the listeners with the passed
	 * arguments. The listeners are invoked in order, and each listener is
	 * awaited before the next listener is invoked.
	 *
	 * @param args -
	 *   arguments that listeners will receive
	 * @returns
	 *   promise that resolves when all listeners have handled the event, or
	 *   rejects with the first error
	 */
	public emit(...args: Args): Promise<void> {
		return this.#registry.invokeSerial(this.#parent, args);
	}

	/**
	 * Emit this event in parallel. This will invoke all of the listeners
	 * with the passed arguments. Triggering of the listeners will be done in
	 * parallel.
	 *
	 * This method will not use the current {@link ErrorStrategy}. All listeners
	 * are invoked, also if one of them fails. If one listener fails the promise
	 * rejects with its error. If more than one listener fails the promise
	 * rejects with an `AggregateError` that holds all of the errors.
	 *
	 * @param args -
	 *   arguments that the listeners will receive
	 * @returns -
	 *   promise that resolves when all listeners have handled the event
	 */
	public parallelEmit(...args: Args): Promise<void> {
		return this.#registry.invokeParallel(this.#parent, args);
	}

	/**
	 * Subscribe to this event using the given listener. The listener will
	 * be invoked any time the event is emitted.
	 *
	 * @param listener -
	 *   listener to subscribe
	 * @returns
	 *   promise
	 */
	protected async subscribe0(listener: Listener<Parent, Args>): Promise<void> {
		this.#registry.add(listener);
	}

	/**
	 * Unsubscribe a listener from this handler. The specified listener will
	 * no longer be invoked when the event is emitted.
	 *
	 * @param listener -
	 *   listener to unsubscribe
	 * @returns
	 *   promise that resolves when the listener is removed
	 */
	protected async unsubscribe0(listener: Listener<Parent, Args>): Promise<void> {
		this.#registry.remove(listener);
	}

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
	 *   handle to the subscription, can be used to unsubscribe. Resolves
	 *   when the subscription is fully registered
	 */
	public subscribe(listener: Listener<Parent, Args>, options?: SubscribeOptions): Promise<AsyncSubscriptionHandle> {
		return this.subscribable.subscribe(listener, options);
	}

	/**
	 * Unsubscribe a listener from this handler. The specified listener will
	 * no longer be invoked when the event is emitted.
	 *
	 * @param listener -
	 *   listener to unsubscribe
	 * @returns
	 *   promise that resolves when the listener is fully unsubscribed
	 */
	public unsubscribe(listener: Listener<Parent, Args>): Promise<void> {
		return this.subscribable.unsubscribe(listener);
	}

	/**
	 * Get a promise that will resolve the first time this event is fired
	 * after this call.
	 *
	 * @param options -
	 *   options, such as a signal that stops the wait
	 * @returns
	 *   listener that resolves the next time the event is emitted
	 */
	public once(options?: OnceOptions): Promise<Args> {
		return this.subscribable.once(options);
	}

	/**
	 * Create a subscribable that will apply the specified filter to any
	 * listeners added.
	 *
	 * @param filter -
	 *   function used to filter events
	 * @returns
	 *   filtered `AsyncSubscribable`
	 */
	public filter(filter: (...args: Args) => boolean | Promise<boolean>): AsyncSubscribable<Parent, Args> {
		return this.subscribable.filter(filter);
	}

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
	public map<NewArgs extends [ unknown, ...unknown[] ] | []>(
		mapper: (this: Parent, ...args: Args) => NewArgs | Promise<NewArgs>
	): AsyncSubscribable<Parent, NewArgs> {
		return this.subscribable.map(mapper);
	}

	/**
	 * Create a Subscribable that changes the this argument used for listeners.
	 *
	 * @param newThis -
	 *   what should be treated as this for event listeners
	 * @returns
	 *   modified `AsyncSubscribable`
	 */
	public withThis<NewThis>(newThis: NewThis): AsyncSubscribable<NewThis, Args> {
		return this.subscribable.withThis(newThis);
	}

	/**
	 * Return an async iterator for this event.
	 *
	 * @returns
	 *   async iterator for this event
	 */
	public [Symbol.asyncIterator](): EventIterator<Args> {
		return this.subscribable[Symbol.asyncIterator]();
	}

	/**
	 * Create an iterator that supports async iteration of events emitted.
	 *
	 * @param options -
	 *   options for this iterator
	 * @returns
	 *   iterable/iterator
	 */
	public iterator(options?: EventIteratorOptions): EventIterator<Args> {
		return this.subscribable.iterator(options);
	}

	/**
	 * Get if there are any listeners available.
	 *
	 * @returns
	 *   `true` if listeners are present
	 */
	public get hasListeners(): boolean {
		return this.#registry.hasListeners;
	}

	/**
	 * Get a copy of the listeners as an array.
	 *
	 * @returns
	 *   listeners as array
	 */
	public get listeners(): Listener<Parent, Args>[] {
		return this.#registry.toArray();
	}

	/**
	 * Clear all listeners for this event.
	 */
	public clear(): void {
		this.#registry.clear();
	}

	/**
	 * Monitor for changes to listeners. Only a single monitor is supported at
	 * a single time. This is intended to be used to react to if listeners are
	 * currently registered. This can be used for things such as only listening
	 * to events from other objects when this event is active.
	 *
	 * @param monitor -
	 *   function used to monitor for changes to listeners
	 */
	public monitorListeners(monitor: (event: this) => void): void {
		if(this.#registry.hasMonitors) {
			throw new Error('A monitor is already registered, call removeMonitor before registering a new monitor');
		}

		this.#registry.addMonitor(monitor);
	}

	/**
	 * Stop monitoring for listener changes.
	 */
	public removeMonitor(): void {
		this.#registry.removeMonitor();
	}
}
