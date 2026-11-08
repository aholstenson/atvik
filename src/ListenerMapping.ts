import type { Listener } from './Listener.js';

/**
 * Keeps track of the wrapped listener for each listener that is subscribed
 * through a derived subscribable, such as the result of `filter` or
 * `withThis`.
 *
 * Each listener is wrapped only one time. A listener that is already
 * subscribed is not subscribed again, which is the same behavior as for
 * listeners subscribed directly on an event.
 */
export class ListenerMapping<This, Args extends any[], WrappedThis, WrappedArgs extends any[]> {
	readonly #wrap: (listener: Listener<This, Args>) => Listener<WrappedThis, WrappedArgs>;
	readonly #mapping = new Map<Listener<This, Args>, Listener<WrappedThis, WrappedArgs>>();

	/**
	 * Create a new mapping.
	 *
	 * @param wrap -
	 *   function that creates the wrapped listener for a listener
	 */
	public constructor(wrap: (listener: Listener<This, Args>) => Listener<WrappedThis, WrappedArgs>) {
		this.#wrap = wrap;
	}

	/**
	 * Wrap and store a listener.
	 *
	 * @param listener -
	 *   listener to add
	 * @returns
	 *   the wrapped listener, or `undefined` if the listener is already added
	 */
	public add(listener: Listener<This, Args>): Listener<WrappedThis, WrappedArgs> | undefined {
		if(this.#mapping.has(listener)) return undefined;

		const wrapped = this.#wrap(listener);
		this.#mapping.set(listener, wrapped);
		return wrapped;
	}

	/**
	 * Remove a listener.
	 *
	 * @param listener -
	 *   listener to remove
	 * @returns
	 *   the wrapped listener, or `undefined` if the listener is not added
	 */
	public remove(listener: Listener<This, Args>): Listener<WrappedThis, WrappedArgs> | undefined {
		const wrapped = this.#mapping.get(listener);
		this.#mapping.delete(listener);
		return wrapped;
	}
}
