import { SubscriptionHandle } from './SubscriptionHandle';
import { Listener } from './Listener';

import { Subscribable } from './Subscribable';
import { createSubscribable } from './createSubscribable';
import { SubscriptionFunctions } from './SubscriptionFunctions';

/**
 * An event that fires its listeners in a synchronous fashion.
 */
export class Event<Parent, Args extends any[] = []>
	implements SubscriptionFunctions<Parent, Args>
{
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
	 * @param parent
	 *   the parent that will be passed to listener as their `this`
	 */
	constructor(parent: Parent) {
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
	 * @param args
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
	 * be invoked any time the event is emitted. The returned handle can be
	 * used to unsubscribe.
	 *
	 * @param listener
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
	 * @param listener
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
	 * @param listener
	 */
	public subscribe(listener: Listener<Parent, Args>): SubscriptionHandle {
		return this.subscribable.subscribe(listener);
	}

	/**
	 * Unsubscribe a listener from this handler. The specified listener will
	 * no longer be invoked when the event is emitted.
	 *
	 * @param listener
	 */
	public unsubscribe(listener: Listener<Parent, Args>): boolean {
		return this.subscribable.unsubscribe(listener);
	}

	/**
	 * Get a promise that will resolve the first time this event is fired
	 * after this call.
	 */
	public once(): Promise<Args> {
		return this.subscribable.once();
	}

	/**
	 * Create a subscribable that will apply the specified filter to any
	 * listeners added.
	 *
	 * @param filter
	 */
	public filter(filter: (...args: Args) => boolean | Promise<boolean>): Subscribable<Parent, Args> {
		return this.subscribable.filter(filter);
	}

	/**
	 * Get if there are any listeners available.
	 */
	get hasListeners() {
		return this.registeredListeners !== undefined;
	}

	/**
	 * Get a copy of the listeners as an array.
	 */
	get listeners() {
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
	 * @param monitor
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