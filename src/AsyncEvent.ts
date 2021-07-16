import { AsyncSubscribable } from './AsyncSubscribable';
import { AsyncSubscriptionFunctions } from './AsyncSubscriptionFunctions';
import { AsyncSubscriptionHandle } from './AsyncSubscriptionHandle';
import { createAsyncSubscribable } from './createAsyncSubscribable';
import { ErrorStrategy, rethrowErrors } from './ErrorStrategy';
import { EventIteratorOptions } from './EventIteratorOptions';
import { Listener } from './Listener';

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
 * const handle = await event.addListener(() => ...);
 * await handle.unsubscribe();
 *
 * // Unsubscribe the actual listener
 * const listener = () => ...;
 * await eventOrSubscribable.subscribe(listener);
 * await eventOrSubscribable.unsubscribe(listener);
 * ```
 */
export class AsyncEvent<Parent, Args extends any[] = []> implements AsyncSubscriptionFunctions<Parent, Args> {
	/**
	 * Public AsyncSubscribable that can safely be shared with consumers that
	 * should be able to listen for events.
	 */
	public readonly subscribable: AsyncSubscribable<Parent, Args>;

	/**
	 * Parent of this handler, used to apply the correct this to event listeners.
	 */
	private readonly parent: Parent;
	/**
	 * Listener(s) that have been attached to this event handler.
	 */
	private registeredListeners?: Listener<Parent, Args> | Listener<Parent, Args>[];

	/**
	 * Monitor that will be notified on any listener change.
	 */
	private monitor?: (event: this) => void;

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
		this.parent = parent;

		this.subscribable = createAsyncSubscribable({
			subscribe: this.subscribe0.bind(this),
			unsubscribe: this.unsubscribe0.bind(this),
			defaultIterator: options?.defaultIterator,
			defaultErrorStrategy: options?.defaultErrorStrategy ?? rethrowErrors
		});
	}

	/**
	 * Emit this event. This will invoke all of the listeners with the passed
	 * arguments.
	 *
	 * @param args -
	 *   arguments that listeners will receive
	 */
	public async emit(...args: Args): Promise<void> {
		if(Array.isArray(this.registeredListeners)) {
			/*
			 * Array is present, iterate over array and invoke all of the
			 * listeners.
			 */
			for(const listener of this.registeredListeners) {
				await listener.apply(this.parent, args);
			}
		} else if(this.registeredListeners) {
			/*
			 * Single listener is present, simply invoke the listener.
			 */
			await this.registeredListeners.apply(this.parent, args);
		}
	}

	/**
	 * Emit this event in parallel. This will invoke all of the listeners
	 * with the passed arguments. Triggering of the listeners will done in
	 * parallel.
	 *
	 * This method will not use the current {@link ErrorStrategy} and will
	 * instead reject if an error occurs.
	 *
	 * @param args -
	 *   arguments that the listeners will receive
	 * @returns -
	 *   promise that resolves when all listeners have handled the event
	 */
	public async parallelEmit(...args: Args): Promise<void> {
		if(Array.isArray(this.registeredListeners)) {
			/*
			 * Array is present, invoke listeners in parallel.
			 */
			await Promise.all(this.registeredListeners.map(l => l.apply(this.parent, args)));
		} else if(this.registeredListeners) {
			/*
			 * Single listener is present, simply invoke the listener.
			 */
			await this.registeredListeners.apply(this.parent, args);
		}
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
	protected subscribe0(listener: Listener<Parent, Args>): Promise<void> {
		if(Array.isArray(this.registeredListeners)) {
			// Listeners is already an array, create a copy with the new listener appended
			const idx = this.registeredListeners.indexOf(listener);
			if(idx >= 0) {
				// If the listener is already in the array, skip registering
				return Promise.resolve();
			}

			this.registeredListeners = [ ...this.registeredListeners, listener ];
		} else if(this.registeredListeners) {
			if(this.registeredListeners === listener) {
				// This is the active listener, skip registering
				return Promise.resolve();
			}

			this.registeredListeners = [ this.registeredListeners, listener ];
		} else {
			this.registeredListeners = listener;
		}

		if(this.monitor) {
			// Trigger the monitor if available
			this.monitor(this);
		}

		return Promise.resolve(undefined);
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
		if(Array.isArray(this.registeredListeners)) {
			/*
			 * Array has been allocated, find the index of the listener and
			 * then remove it from the array.
			 */
			const idx = this.registeredListeners.indexOf(listener);
			if(idx < 0) return;

			// Copy-on-write for deletions
			const listeners = [ ...this.registeredListeners ];
			listeners.splice(idx);
			this.registeredListeners = listener;

			/*
			 * If the array is empty, remove it. Otherwise at this point the
			 * array has already been allocated so keep the array in case a
			 * subscription happens again.
			 */
			if(this.registeredListeners.length === 0) {
				this.registeredListeners = undefined;
			}

			if(this.monitor) {
				// Trigger the monitor if available
				this.monitor(this);
			}
		} else if(this.registeredListeners === listener) {
			/*
			 * Single listener is present and its the current match. Reset
			 * listeners property.
			 */
			this.registeredListeners = undefined;

			if(this.monitor) {
				// Trigger the monitor if available
				this.monitor(this);
			}
		}
	}

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
	public subscribe(listener: Listener<Parent, Args>): Promise<AsyncSubscriptionHandle> {
		return this.subscribable.subscribe(listener);
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
	 * @returns
	 *   listener that resolves the next time the event is emitted
	 */
	public once(): Promise<Args> {
		return this.subscribable.once();
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
	public [Symbol.asyncIterator]() {
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
	public iterator(options?: EventIteratorOptions) {
		return this.subscribable.iterator(options);
	}

	/**
	 * Get if there are any listeners available.
	 *
	 * @returns
	 *   `true` if listeners are present
	 */
	public get hasListeners() {
		return this.registeredListeners !== undefined;
	}

	/**
	 * Get a copy of the listeners as an array.
	 *
	 * @returns
	 *   listeners as array
	 */
	public get listeners() {
		if(Array.isArray(this.registeredListeners)) {
			return this.registeredListeners.slice(0);
		} else if(this.registeredListeners) {
			return [ this.registeredListeners ];
		} else {
			return [];
		}
	}

	/**
	 * Clear all listeners for this event.
	 */
	public clear() {
		this.registeredListeners = undefined;

		if(this.monitor) {
			// Trigger the monitor if available
			this.monitor(this);
		}
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
		if(this.monitor) {
			throw new Error('A monitor is already registered, call removeMonitor before registering a new monitor');
		}

		this.monitor = monitor;
	}

	/**
	 * Stop monitoring for listener changes.
	 */
	public removeMonitor() {
		this.monitor = undefined;
	}
}
