import { createSubscribable } from './createSubscribable';
import { Listener } from './Listener';
import { Subscribable } from './Subscribable';
import { SubscriptionFunctions } from './SubscriptionFunctions';
import { SubscriptionHandle } from './SubscriptionHandle';

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
 * const handle = event.addListener(() => ...);
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
 *   private countUpdatedEvent: Event<this, [ number ]>;
 *
 *   public constructor() {
 *     this.countUpdatedEvent = new Event(this);
 *     this.count = 0;
 *   }
 *
 *   public get onCountUpdated(): Subscribable<this, [ number ]> {
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
export class Event<Parent, Args extends any[] = []> implements SubscriptionFunctions<Parent, Args> {
	/**
	 * Public Subscribable that can safely be shared with consumers that should
	 * be able to listen for events.
	 */
	public readonly subscribable: Subscribable<Parent, Args>;

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
	 */
	public constructor(parent: Parent) {
		this.parent = parent;

		this.subscribable = createSubscribable(
			this.subscribe0.bind(this),
			this.unsubscribe0.bind(this)
		);
	}

	/**
	 * Emit this event. This will invoke all of the listeners with the passed
	 * arguments.
	 *
	 * @param args -
	 *   arguments that the listeners will receive
	 */
	public emit(...args: Args): void {
		if(Array.isArray(this.registeredListeners)) {
			/*
			 * Array is present, iterate over array and invoke all of the
			 * listeners.
			 */
			for(const listener of this.registeredListeners) {
				listener.apply(this.parent, args);
			}
		} else if(this.registeredListeners) {
			/*
			 * Single listener is present, simply invoke the listener.
			 */
			this.registeredListeners.apply(this.parent, args);
		}
	}

	/**
	 * Subscribe to this event using the given listener. The listener will
	 * be invoked any time the event is emitted.
	 *
	 * @param listener -
	 *   listener to subscribe
	 */
	protected subscribe0(listener: Listener<Parent, Args>) {
		if(Array.isArray(this.registeredListeners)) {
			// Listeners is already an array, create a copy with the new listener appended
			const idx = this.registeredListeners.indexOf(listener);
			if(idx >= 0) {
				// If the listener is already in the array, skip registering
				return;
			}

			this.registeredListeners = [ ...this.registeredListeners, listener ];
		} else if(this.registeredListeners) {
			if(this.registeredListeners === listener) {
				// This is the active listener, skip registering
				return;
			}

			this.registeredListeners = [ this.registeredListeners, listener ];
		} else {
			this.registeredListeners = listener;
		}

		if(this.monitor) {
			// Trigger the monitor if available
			this.monitor(this);
		}

		return;
	}

	/**
	 * Unsubscribe a listener from this handler. The specified listener will
	 * no longer be invoked when the event is emitted.
	 *
	 * @param listener -
	 *   listener to unsubscribe
	 * @returns
	 *   `true` if the listener was subscribed
	 */
	protected unsubscribe0(listener: Listener<Parent, Args>): boolean {
		if(Array.isArray(this.registeredListeners)) {
			/*
			 * Array has been allocated, find the index of the listener and
			 * then remove it from the array.
			 */
			const idx = this.registeredListeners.indexOf(listener);
			if(idx < 0) return false;

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

			return true;
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

			return true;
		}

		// Listener is not active
		return false;
	}

	/**
	 * Subscribe to this event using the given listener. The listener will
	 * be invoked any time the event is emitted. The returned handle can be
	 * used to unsubscribe.
	 *
	 * @param listener -
	 *   listener to subscribe
	 * @returns
	 *   handle to the subscription, can be used to unsubscribe
	 */
	public subscribe(listener: Listener<Parent, Args>): SubscriptionHandle {
		return this.subscribable.subscribe(listener);
	}

	/**
	 * Unsubscribe a listener from this handler. The specified listener will
	 * no longer be invoked when the event is emitted.
	 *
	 * @param listener -
	 *   listener to unsubscribe
	 * @returns
	 *   `true` if the listener was subscribed
	 */
	public unsubscribe(listener: Listener<Parent, Args>): boolean {
		return this.subscribable.unsubscribe(listener);
	}

	/**
	 * Get a promise that will resolve the first time this event is fired
	 * after this call.
	 *
	 * @returns
	 *   promise that resolves the next time the event is fired
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
	 *   filtered `Subscription`
	 */
	public filter(filter: (...args: Args) => boolean | Promise<boolean>): Subscribable<Parent, Args> {
		return this.subscribable.filter(filter);
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
