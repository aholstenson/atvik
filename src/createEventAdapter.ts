import { createSubscribable } from './createSubscribable';
import { Listener } from './Listener';
import { Subscribable } from './Subscribable';


/**
 * Event emitter that uses `addEventListener` and `removeEventListener`
 * methods.
 */
export interface AddRemoveEventListener<Event extends string | symbol, Args extends any[]> {
	addEventListener(event: Event, listener: Listener<this, Args>): void;
	removeEventListener(event: Event, listener: Listener<this, Args>): void;
}

/**
 * Event emitter that uses `addListener` and `removeEventListener` methods.
 */
export interface AddRemoveListener<Event extends string | symbol, Args extends any[]> {
	addListener(event: Event, listener: Listener<this, Args>): void;
	removeListener(event: Event, listener: Listener<this, Args>): void;
}

/**
 * Event emitter that uses `on` and `off` methods.
 */
export interface OnOff<Event extends string | symbol, Args extends any[]> {
	on(event: Event, listener: Listener<this, Args>): void;
	off(event: Event, listener: Listener<this, Args>): void;
}

/**
 * Supported types of event emitters.
 */
export type AdaptableEventEmitter<Event extends string | symbol, Args extends any[]>
	= AddRemoveEventListener<Event, Args>
	| AddRemoveListener<Event, Args>
	| OnOff<Event, Args>;

/**
 * Adapt an event emitted by a Node EventEmitter or by a DOM event target.
 *
 * @param emitter -
 *   emitter to adapt an event from
 * @param event -
 *   event to adapt
 * @returns
 *   subscribable
 */
export function createEventAdapter<
	Event extends string | symbol,
	Args extends any[],
	Emitter extends AdaptableEventEmitter<Event, Args>
>(
	emitter: Emitter,
	event: Event
): Subscribable<Emitter, Args> {
	if(isAddRemoveEventListener(emitter)) {
		return createTrackingSubscribable(
			emitter,
			event,
			emitter.addEventListener,
			emitter.removeEventListener
		);
	} else if(isAddRemoveListener(emitter)) {
		return createTrackingSubscribable(
			emitter,
			event,
			emitter.addListener,
			emitter.removeListener
		);
	} else if(isOnOff(emitter)) {
		return createTrackingSubscribable(
			emitter,
			event,
			emitter.on,
			emitter.off
		);
	}

	throw new Error('Unsupported event emitter');
}

function isAddRemoveEventListener(a: any): a is AddRemoveEventListener<any, any> {
	return a.addEventListener && a.removeEventListener;
}

function isAddRemoveListener(a: any): a is AddRemoveListener<any, any> {
	return a.addListener && a.removeListener;
}

function isOnOff(a: any): a is OnOff<any, any> {
	return a.on && a.off;
}

function createTrackingSubscribable<
	Event extends string | symbol,
	Args extends any[],
	Emitter extends AdaptableEventEmitter<Event, Args>
>(emitter: Emitter,
	event: Event,
	subscribe: (event: Event, listener: Listener<Emitter, Args>) => void,
	unsubscribe: (event: Event, listener: Listener<Emitter, Args>) => void
): Subscribable<Emitter, Args> {
	const listeners = new Map<Listener<Emitter, Args>, boolean>();
	return createSubscribable({
		subscribe(listener) {
			if(listeners.has(listener)) {
				return;
			}

			listeners.set(listener, true);
			subscribe.call(emitter, event, listener);
		},

		unsubscribe(listener) {
			if(! listeners.has(listener)) {
				return false;
			}

			listeners.delete(listener);
			unsubscribe.call(emitter, event, listener);
			return true;
		}
	});
}
