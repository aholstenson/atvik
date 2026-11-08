import type { Listener } from './Listener.js';

/**
 * Storage of listeners for {@link Event} and {@link AsyncEvent}.
 *
 * A single listener is kept without an array. When more listeners are added
 * the array is replaced on every change (copy-on-write), so that an emit
 * that is in progress is not changed by listeners that subscribe or
 * unsubscribe.
 *
 * Monitors are called after every change to the listeners.
 */
export class ListenerRegistry<This, Args extends unknown[], Owner> {
	readonly #owner: Owner;
	#listeners?: Listener<This, Args> | readonly Listener<This, Args>[];
	readonly #monitors = new Set<(owner: Owner) => void>();

	/**
	 * Create a new registry.
	 *
	 * @param owner -
	 *   value that is given to monitors
	 */
	public constructor(owner: Owner) {
		this.#owner = owner;
	}

	/**
	 * Add a listener. A listener that is already added is not added again.
	 *
	 * @param listener -
	 *   listener to add
	 */
	public add(listener: Listener<This, Args>): void {
		const current = this.#listeners;
		if(Array.isArray(current)) {
			if(current.includes(listener)) return;

			this.#listeners = [ ...current, listener ];
		} else if(current) {
			if(current === listener) return;

			this.#listeners = [ current as Listener<This, Args>, listener ];
		} else {
			this.#listeners = listener;
		}

		this.#notify();
	}

	/**
	 * Remove a listener.
	 *
	 * @param listener -
	 *   listener to remove
	 */
	public remove(listener: Listener<This, Args>): void {
		const current = this.#listeners;
		if(Array.isArray(current)) {
			const idx = current.indexOf(listener);
			if(idx < 0) return;

			const listeners = current.filter((_, i) => i !== idx);
			this.#listeners = listeners.length > 0 ? listeners : undefined;
		} else if(current === listener) {
			this.#listeners = undefined;
		} else {
			return;
		}

		this.#notify();
	}

	/**
	 * Remove all listeners.
	 */
	public clear(): void {
		this.#listeners = undefined;
		this.#notify();
	}

	/**
	 * Get if there are any listeners.
	 *
	 * @returns
	 *   `true` if at least one listener is added
	 */
	public get hasListeners(): boolean {
		return this.#listeners !== undefined;
	}

	/**
	 * Get the number of listeners.
	 *
	 * @returns
	 *   number of listeners
	 */
	public get size(): number {
		const current = this.#listeners;
		if(Array.isArray(current)) return current.length;
		return current ? 1 : 0;
	}

	/**
	 * Get a copy of the listeners.
	 *
	 * @returns
	 *   listeners as a new array
	 */
	public toArray(): Listener<This, Args>[] {
		const current = this.#listeners;
		if(Array.isArray(current)) return current.slice();
		return current ? [ current as Listener<This, Args> ] : [];
	}

	/**
	 * Invoke all listeners without waiting for them. Rejections of promises
	 * returned by listeners are given to `onError`.
	 *
	 * @param thisArg -
	 *   value of `this` for the listeners
	 * @param args -
	 *   arguments for the listeners
	 * @param onError -
	 *   function that handles asynchronous errors
	 */
	public invoke(thisArg: This, args: Args, onError: (err: unknown) => void): void {
		const current = this.#listeners;
		if(Array.isArray(current)) {
			for(const listener of current) {
				const result = listener.apply(thisArg, args);
				if(result?.catch) {
					result.catch(onError);
				}
			}
		} else if(current) {
			const result = (current as Listener<This, Args>).apply(thisArg, args);
			if(result?.catch) {
				result.catch(onError);
			}
		}
	}

	/**
	 * Invoke the listeners one at a time, and wait for each listener before
	 * the next listener is invoked.
	 *
	 * @param thisArg -
	 *   value of `this` for the listeners
	 * @param args -
	 *   arguments for the listeners
	 * @returns
	 *   promise that resolves when all listeners are done, or rejects with
	 *   the first error
	 */
	public async invokeSerial(thisArg: This, args: Args): Promise<void> {
		const current = this.#listeners;
		if(Array.isArray(current)) {
			for(const listener of current) {
				await listener.apply(thisArg, args);
			}
		} else if(current) {
			await (current as Listener<This, Args>).apply(thisArg, args);
		}
	}

	/**
	 * Invoke listeners in parallel and wait for all of them to finish.
	 *
	 * All listeners are invoked, also if one of them throws. If one listener
	 * fails the promise rejects with its error. If more than one listener
	 * fails the promise rejects with an `AggregateError` that holds all of the
	 * errors.
	 *
	 * @param thisArg -
	 *   value of `this` for the listeners
	 * @param args -
	 *   arguments for the listeners
	 * @returns
	 *   promise that resolves when all listeners are done
	 */
	public async invokeParallel(thisArg: This, args: Args): Promise<void> {
		const current = this.#listeners;
		if(! current) return;

		if(! Array.isArray(current)) {
			await (current as Listener<This, Args>).apply(thisArg, args);
			return;
		}

		// An async function changes a synchronous throw into a rejection
		const results = await Promise.allSettled(current.map(async listener => listener.apply(thisArg, args)));

		const errors: unknown[] = [];
		for(const result of results) {
			if(result.status === 'rejected') {
				errors.push(result.reason);
			}
		}

		if(errors.length === 1) {
			throw errors[0];
		} else if(errors.length > 1) {
			throw new AggregateError(errors, 'Multiple listeners failed');
		}
	}

	/**
	 * Get if at least one monitor is added.
	 *
	 * @returns
	 *   `true` if a monitor is added
	 */
	public get hasMonitors(): boolean {
		return this.#monitors.size > 0;
	}

	/**
	 * Add a monitor that is called after every change to the listeners.
	 *
	 * @param monitor -
	 *   monitor to add
	 */
	public addMonitor(monitor: (owner: Owner) => void): void {
		this.#monitors.add(monitor);
	}

	/**
	 * Remove a monitor. If no monitor is given, all monitors are removed.
	 *
	 * @param monitor -
	 *   monitor to remove
	 */
	public removeMonitor(monitor?: (owner: Owner) => void): void {
		if(monitor) {
			this.#monitors.delete(monitor);
		} else {
			this.#monitors.clear();
		}
	}

	/**
	 * Call all monitors.
	 */
	#notify(): void {
		for(const monitor of this.#monitors) {
			monitor(this.#owner);
		}
	}
}
