import { createSubscribable } from './createSubscribable';
import { EventIteratorOptions } from './EventIteratorOptions';
import { Listener } from './Listener';
import { Subscribable } from './Subscribable';

/**
 * Event emitter that uses `addEventListener` and `removeEventListener`
 * methods.
 */
export interface AddRemoveEventListenerEventEmitter<Event extends string | symbol, Args extends any[]> {
	addEventListener(event: Event, listener: Listener<this, Args>): void;
	removeEventListener(event: Event, listener: Listener<this, Args>): void;
}

/**
 * Event emitter that uses `addListener` and `removeEventListener` methods.
 */
export interface AddRemoveListenerEventEmitter<Event extends string | symbol, Args extends any[]> {
	addListener(event: Event, listener: Listener<this, Args>): void;
	removeListener(event: Event, listener: Listener<this, Args>): void;
}

/**
 * Event emitter that uses `on` and `off` methods.
 */
export interface OnOffEventEmitter<Event extends string | symbol, Args extends any[]> {
	on(event: Event, listener: Listener<this, Args>): void;
	off(event: Event, listener: Listener<this, Args>): void;
}

/**
 * Supported types of event emitters.
 */
export type AdaptableEventEmitter<Event extends string | symbol, Args extends any[]>
	= AddRemoveEventListenerEventEmitter<Event, Args>
	| AddRemoveListenerEventEmitter<Event, Args>
	| OnOffEventEmitter<Event, Args>;

/**
 * Options that can be passed when using {@link createEventAdapter}.
 */
export interface EventAdapterOptions {
	/**
	 * The default options that are applied to iterators. Use this to setup
	 * default limits and overflow behavior for iterators of this event.
	 */
	defaultIterator?: EventIteratorOptions;
}

/**
 * Adapt an event emitted by a Node EventEmitter or by a DOM event target.
 * Adapters are useful when wanting to bridge events from a third-party library
 * or from the DOM.
 *
 * This adapter will register every listener with the event emitter, and let
 * you use the {@link Subscribable} API to subscribe, unsubscribe, filter and
 * iterate over events.
 *
 * Three different types of event emitters are supported:
 *
 * * Emitters with `on` and `off` methods, such as `EventEmitter` in NodeJS
 * * Emitters with `addEventListener` and `removeEventListener` methods such
 *   as DOM event targets like elements
 * * Emitters with `addListener` and `removeListener` methods
 *
 * **Limitations**: If the adapted event emitter has a method to clear all
 * listeners the returned {@link Subscribable} may falsely report `true` when
 * `unsubscribe` is called.
 *
 * ## Node EventEmitter
 *
 * ```javascript
 * const events = new EventEmitter();
 *
 * const onEcho = createEventAdapter(events, 'echo');
 * onEcho.subscribe(value => console.log('echo', value));
 *
 * events.emit('echo, 'argument');
 * ```
 *
 * ## DOM events
 *
 * DOM events can be adapted:
 *
 * ```javascript
 * // Adapt DOM events
 * await createEventAdapter(document, 'DOMContentLoaded').once();
 *
 * const onFocus = createEventAdapter(htmlElement, 'focus');
 * onFocus(event => console.log('focused', event));
 * ```
 *
 * @param emitter -
 *   emitter to adapt an event from
 * @param event -
 *   event to adapt
 * @param options -
 *   options for adapter
 * @returns
 *   subscribable
 */
export function createEventAdapter<
	Event extends string | symbol,
	Args extends any[],
	Emitter extends AdaptableEventEmitter<Event, Args>
>(
	emitter: Emitter,
	event: Event,
	options?: EventAdapterOptions
): Subscribable<Emitter, Args> {
	if(isAddRemoveEventListener(emitter)) {
		return createTrackingSubscribable(
			emitter,
			event,
			emitter.addEventListener,
			emitter.removeEventListener,
			options
		);
	} else if(isAddRemoveListener(emitter)) {
		return createTrackingSubscribable(
			emitter,
			event,
			emitter.addListener,
			emitter.removeListener,
			options
		);
	} else if(isOnOff(emitter)) {
		return createTrackingSubscribable(
			emitter,
			event,
			emitter.on,
			emitter.off,
			options
		);
	}

	throw new Error('Unsupported event emitter');
}

/**
 * Check if an object has add/removeEventListener methods.
 *
 * @param a -
 *   object to check
 * @returns
 *   if emitter has add/removeEventListener methods
 */
function isAddRemoveEventListener(a: any): a is AddRemoveEventListenerEventEmitter<any, any> {
	return a.addEventListener && a.removeEventListener;
}

/**
 * Check if an object has add/removeListener methods.
 *
 * @param a -
 *   object to check
 * @returns
 *   if emitter has add/removeListener methods
 */
function isAddRemoveListener(a: any): a is AddRemoveListenerEventEmitter<any, any> {
	return a.addListener && a.removeListener;
}

/**
 * Check if an object has on/off methods.
 *
 * @param a -
 *   object to check
 * @returns
 *   if emitter has on/off methods
 */
function isOnOff(a: any): a is OnOffEventEmitter<any, any> {
	return a.on && a.off;
}

/**
 * Create the actual {@link Subscribable} that adapts an event from the
 * emitter.
 *
 * @param emitter -
 *   the emitter to register listeners with
 * @param event -
 *   event to register for
 * @param subscribe -
 *   method used to subscribe listeners
 * @param unsubscribe -
 *   method used to unsubscribe listeners
 * @param options -
 *   options
 * @returns
 *   subscribable
 */
function createTrackingSubscribable<
	Event extends string | symbol,
	Args extends any[],
	Emitter extends AdaptableEventEmitter<Event, Args>
>(emitter: Emitter,
	event: Event,
	subscribe: (event: Event, listener: Listener<Emitter, Args>) => void,
	unsubscribe: (event: Event, listener: Listener<Emitter, Args>) => void,
	options?: EventAdapterOptions
): Subscribable<Emitter, Args> {
	return createSubscribable({
		subscribe(listener) {
			subscribe.call(emitter, event, listener);
		},

		unsubscribe(listener) {
			unsubscribe.call(emitter, event, listener);
		},

		defaultIterator: options?.defaultIterator
	});
}
