import { SubscriptionHandle } from './handle';

/**
 * Listener type. Defines the function signature that a listener is expected
 * to have.
 */
export type Listener<This, Args extends any[]> = (this: This, ...args: Args) => void;

/**
 * Functions used to subscribe and unsubscribe to an event.
 */
export interface Subscribable<This, Args extends any[]> {
	/**
	 * Subscribe to the event, will invoke the given function when the event
	 * is emitted.
	 */
	(listener: Listener<This, Args>): SubscriptionHandle;

	/**
	 * Subscribe to the event, will invoke the given function when the event
	 * is emitted.
	 */
	subscribe(listener: Listener<This, Args>): SubscriptionHandle;

	/**
	 * Unsubscribe a previously subscribed listener.
	 *
	 * @param listener
	 */
	unsubscribe(listener: Listener<This, Args>): boolean;

	/**
	 * Subscribe to an event but only trigger the listener once.
	 *
	 * @param listener
	 */
	once(): Promise<Args>;
}

/**
 * An event that fires its listeners in a synchronous fashion.
 */
export class Event<Parent, Args extends any[] = []> {
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
	private listeners?: Listener<Parent, Args> | Listener<Parent, Args>[];

	/**
	 * Create a new event.
	 *
	 * @param parent
	 *   the parent that will be passed to listener as their `this`
	 */
	constructor(parent: Parent) {
		this.parent = parent;

		const subscribable = (listener: Listener<Parent, Args>) => this.subscribe(listener);
		subscribable.subscribe = subscribable;
		subscribable.unsubscribe = (listener: Listener<Parent, Args>) => this.unsubscribe(listener);
		subscribable.once = () => this.once();

		this.subscribable = subscribable;
	}

	/**
	 * Emit this event. This will invoke all of the listeners with the passed
	 * arguments.
	 *
	 * @param args
	 */
	public emit(...args: Args): void {
		if(Array.isArray(this.listeners)) {
			/*
			 * Array is present, iterate over array and invoke all of the
			 * listeners.
			 */
			for(const listener of this.listeners) {
				listener.apply(this.parent, args);
			}
		} else if(this.listeners) {
			/*
			 * Single listener is present, simply invoke the listener.
			 */
			this.listeners.apply(this.parent, args);
		}
	}

	/**
	 * Subscribe to this event using the given listener. The listener will
	 * be invoked any time the event is emitted. The returned handle can be
	 * used to unsubscribe.
	 *
	 * @param listener
	 */
	public subscribe(listener: Listener<Parent, Args>): SubscriptionHandle {
		if(Array.isArray(this.listeners)) {
			// Listeners is already an array, create a copy with the new listener appended
			this.listeners = [ ...this.listeners, listener ];
		} else if(this.listeners) {
			this.listeners = [ this.listeners, listener ];
		} else {
			this.listeners = listener;
		}

		const self = this;
		return {
			unsubscribe() {
				return self.unsubscribe(listener);
			}
		};
	}

	/**
	 * Unsubscribe a listener from this handler. The specified listener will
	 * no longer be invoked when the event is emitted.
	 *
	 * @param listener
	 */
	public unsubscribe(listener: Listener<Parent, Args>): boolean {
		if(Array.isArray(this.listeners)) {
			/*
			 * Array has been allocated, find the index of the listener and
			 * then remove it from the array.
			 */
			const idx = this.listeners.indexOf(listener);
			if(idx < 0) return false;

			// Copy-on-write for deletions
			const listeners = [ ...this.listeners ];
			listeners.splice(idx);
			this.listeners = listener;

			/*
			 * If the array is empty, remove it. Otherwise at this point the
			 * array has already been allocated so keep the array in case a
			 * subscription happens again.
			 */
			if(this.listeners.length === 0) {
				this.listeners = undefined;
			}

			return true;
		} else if(this.listeners === listener) {
			/*
			 * Single listener is present and its the current match. Reset
			 * listeners property.
			 */
			this.listeners = undefined;

			return true;
		}

		// Listener is not active
		return false;
	}

	/**
	 * Get a promise that will resolve the first time this event is fired
	 * after this call.
	 */
	public once(): Promise<Args> {
		return new Promise((resolve, reject) => {
			const listener = (...args: Args) => {
				this.unsubscribe(listener);

				resolve(args);
			};

			this.subscribe(listener);
		});
	}
}
