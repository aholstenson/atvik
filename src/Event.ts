import { createSubscribable } from './createSubscribable.js';
import { type ErrorStrategy, rethrowErrors } from './ErrorStrategy.js';
import { disposeSymbol } from './disposeSymbols.js';
import type { EventIterator } from './EventIterator.js';
import type { EventIteratorOptions } from './EventIteratorOptions.js';
import type { Listener } from './Listener.js';
import type { OnceOptions, SubscribeOptions } from './SubscribeOptions.js';
import { ListenerRegistry } from './ListenerRegistry.js';
import type { Subscribable } from './Subscribable.js';
import type { SubscriptionFunctions } from './SubscriptionFunctions.js';
import type { SubscriptionHandle } from './SubscriptionHandle.js';

/**
 * Options that can be passed when creating an instance of {@link Event}.
 */
export interface EventOptions {
	/**
	 * The default options that are applied to iterators. Use this to setup
	 * default limits and overflow behavior for iterators of this event.
	 */
	defaultIterator?: EventIteratorOptions;

	/**
	 * The default error strategy to use. This allows for control over what
	 * happens when an asynchronous error happens during triggering of
	 * listeners or filtering.
	 */
	defaultErrorStrategy?: ErrorStrategy;
}

/**
 * An event that handles subscription and fires its listeners in a synchronous
 * fashion.
 *
 * Each instance represents a single event:
 *
 * ```javascript
 * const event = new Event(valueForThisInListeners);
 * ```
 *
 * The event can be emitted via the `emit` method:
 *
 * ```javascript
 * event.emit('first-param', 'second-param');
 * ```
 *
 * Listeners can be added directly on the event, but it is recommended to
 * use `.subscribable` for any API that is public:
 *
 * ```javascript
 * // Adding a listener directly on the event
 * event.subscribe(() => ...);
 *
 * // Subscribable provides a public API
 * event.subscribable(() => ..)
 * event.subscribable.subscribe(() => ...);
 * ```
 *
 * Listeners can be unsubscribed either via their handle or via the event:
 *
 * ```javascript
 * // Use handle for easier unsubscription
 * const handle = event.subscribe(() => ...);
 * handle.unsubscribe();
 *
 * // Unsubscribe the actual listener
 * const listener = () => ...;
 * eventOrSubscribable.subscribe(listener);
 * eventOrSubscribable.unsubscribe(listener);
 * ```
 *
 * Types are fully supported and especially useful when events are used in
 * classes:
 *
 * ```typescript
 * import { Event, Subscribable } from 'atvik';
 *
 * class Counter {
 *   // Declaration of the event including the parameters it supports
 *   private countUpdatedEvent: Event<this, [ count: number ]>;
 *
 *   public constructor() {
 *     this.countUpdatedEvent = new Event(this);
 *     this.count = 0;
 *   }
 *
 *   public get onCountUpdated(): Subscribable<this, [ count: number ]> {
 *     // Return `subscribable` of event - which only supports listening and not emitting
 *     return this.countUpdatedEvent.subscribable;
 *   }
 *
 *   public increment() {
 *     // Increments the count and emits the value
 *     this.count++;
 *     this.countUpdatedEvent.emit(this.count);
 *   }
 * }
 *
 * // Create the counter and register the event
 * const counter = new Counter();
 * counter.onCountUpdated(count => console.log('Count is now', count));
 *
 * // Request an increment triggering the listener
 * counter.increment();
 * ```
 */
export class Event<Parent, Args extends unknown[] = []> implements SubscriptionFunctions<Parent, Args> {
	/**
	 * Public Subscribable that can safely be shared with consumers that should
	 * be able to listen for events.
	 */
	public readonly subscribable: Subscribable<Parent, Args>;

	/**
	 * Parent of this handler, used to apply the correct this to event listeners.
	 */
	readonly #parent: Parent;
	/**
	 * Error strategy for asynchronous operations.
	 */
	readonly #errorStrategy: ErrorStrategy;
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
	 *   options for creating this event
	 */
	public constructor(
		parent: Parent,
		options?: EventOptions
	) {
		this.#parent = parent;
		this.#registry = new ListenerRegistry(this);

		this.#errorStrategy = options?.defaultErrorStrategy ?? rethrowErrors;
		this.subscribable = createSubscribable({
			subscribe: this.subscribe0.bind(this),
			unsubscribe: this.unsubscribe0.bind(this),
			defaultIterator: options?.defaultIterator,
			defaultErrorStrategy: this.#errorStrategy
		});
	}

	/**
	 * Emit this event. This will invoke all of the listeners with the passed
	 * arguments. If a listener is asynchronous this method will use the
	 * current {@link ErrorStrategy} to handle errors, and will continue to
	 * trigger listeners while the listener is handling the event.
	 *
	 * @param args -
	 *   arguments that the listeners will receive
	 */
	public emit(...args: Args): void {
		this.#registry.invoke(this.#parent, args, err => this.#errorStrategy.handle(err));
	}

	/**
	 * Emit this event asynchronously. This will invoke all of the listeners
	 * with the passed arguments. Triggering of the listeners will be done
	 * in order, waiting for a previous listener to finish before invoking the
	 * next one.
	 *
	 * This method will not use the current {@link ErrorStrategy} and will
	 * instead reject if an error occurs.
	 *
	 * @param args -
	 *   arguments that the listeners will receive
	 * @returns -
	 *   promise that resolves when all listeners have handled the event
	 */
	public asyncEmit(...args: Args): Promise<void> {
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
	 */
	protected subscribe0(listener: Listener<Parent, Args>): void {
		this.#registry.add(listener);
	}

	/**
	 * Unsubscribe a listener from this handler. The specified listener will
	 * no longer be invoked when the event is emitted.
	 *
	 * @param listener -
	 *   listener to unsubscribe
	 */
	protected unsubscribe0(listener: Listener<Parent, Args>): void {
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
	 *   handle to the subscription, can be used to unsubscribe
	 */
	public subscribe(listener: Listener<Parent, Args>, options?: SubscribeOptions): SubscriptionHandle {
		return this.subscribable.subscribe(listener, options);
	}

	/**
	 * Unsubscribe a listener from this handler. The specified listener will
	 * no longer be invoked when the event is emitted.
	 *
	 * @param listener -
	 *   listener to unsubscribe
	 */
	public unsubscribe(listener: Listener<Parent, Args>): void {
		this.subscribable.unsubscribe(listener);
	}

	/**
	 * Get a promise that will resolve the first time this event is fired
	 * after this call.
	 *
	 * @param options -
	 *   options, such as a signal that stops the wait
	 * @returns
	 *   promise that resolves the next time the event is fired
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
	 *   filtered `Subscription`
	 */
	public filter(filter: (...args: Args) => boolean | Promise<boolean>): Subscribable<Parent, Args> {
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
	 *   mapped `Subscribable`
	 */
	public map<NewArgs extends [ unknown, ...unknown[] ] | []>(
		mapper: (this: Parent, ...args: Args) => NewArgs | Promise<NewArgs>
	): Subscribable<Parent, NewArgs> {
		return this.subscribable.map(mapper);
	}

	/**
	 * Create a subscribable that changes the this argument used for listeners.
	 *
	 * @param newThis -
	 *   what should be treated as this for event listeners
	 * @returns
	 *   modified `Subscribable`
	 */
	public withThis<NewThis>(newThis: NewThis): Subscribable<NewThis, Args> {
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
	 * Get the number of listeners.
	 *
	 * @returns
	 *   number of listeners
	 */
	public get listenerCount(): number {
		return this.#registry.size;
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
	 * Monitor for changes to listeners. The monitor is called after every
	 * subscribe, unsubscribe and clear. This is intended to be used to react
	 * to if listeners are currently registered. This can be used for things
	 * such as only listening to events from other objects when this event is
	 * active.
	 *
	 * More than one monitor can be added. The same monitor is only added one
	 * time.
	 *
	 * @param monitor -
	 *   function used to monitor for changes to listeners
	 * @returns
	 *   handle that removes the monitor, also with `using`
	 */
	public monitorListeners(monitor: (event: this) => void): SubscriptionHandle {
		this.#registry.addMonitor(monitor);

		const remove = () => this.#registry.removeMonitor(monitor);
		return {
			unsubscribe: remove,
			[disposeSymbol]: remove
		};
	}

	/**
	 * Stop monitoring for listener changes.
	 *
	 * @param monitor -
	 *   monitor to remove. If not given, all monitors are removed
	 */
	public removeMonitor(monitor?: (event: this) => void): void {
		this.#registry.removeMonitor(monitor);
	}
}
