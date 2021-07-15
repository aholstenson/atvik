/* eslint-disable @typescript-eslint/no-empty-function */
import { EventEmitter } from 'events';

import { createEventAdapter } from '../src/createEventAdapter';

describe('createEventAdapter', function() {
	it('Can trigger single listener for Add/RemoveListener', function() {
		const emitter = new EventEmitter();
		const onTest = createEventAdapter(emitter, 'test');

		let triggered = false;

		onTest.subscribe(v1 => {
			triggered = v1 === 'v1';
		});

		expect(triggered).toEqual(false);

		emitter.emit('test', 'v1');

		expect(triggered).toEqual(true);
	});

	it('Can trigger multiple listeners for Add/RemoveListener', function() {
		const emitter = new EventEmitter();
		const onTest = createEventAdapter(emitter, 'test');

		let triggered1 = false;
		let triggered2 = false;
		let triggered3 = false;

		onTest.subscribe(() => {
			triggered1 = true;
		});

		onTest.subscribe(() => {
			triggered2 = true;
		});

		onTest.subscribe(() => {
			triggered3 = true;
		});

		expect(triggered1).toEqual(false);
		expect(triggered2).toEqual(false);
		expect(triggered3).toEqual(false);

		emitter.emit('test', 'v1');

		expect(triggered1).toEqual(true);
		expect(triggered2).toEqual(true);
		expect(triggered3).toEqual(true);
	});

	it('Can unsubscribe listener for Add/RemoveListener', function() {
		const emitter = new EventEmitter();
		const onTest = createEventAdapter(emitter, 'test');

		let triggered = false;

		const h = onTest.subscribe(() => {
			triggered = true;
		});

		h.unsubscribe();

		emitter.emit('test', 'v1');

		expect(triggered).toEqual(false);
	});

	it('Can trigger single listener for on/off', function() {
		const emitter = new EventEmitter();
		(emitter as any).addListener = undefined;
		(emitter as any).removeListener = undefined;
		const onTest = createEventAdapter(emitter, 'test');

		let triggered = false;

		onTest.subscribe(v1 => {
			triggered = v1 === 'v1';
		});

		expect(triggered).toEqual(false);

		emitter.emit('test', 'v1');

		expect(triggered).toEqual(true);
	});

	it('Can trigger multiple listeners for on/off', function() {
		const emitter = new EventEmitter();
		(emitter as any).addListener = undefined;
		(emitter as any).removeListener = undefined;
		const onTest = createEventAdapter(emitter, 'test');

		let triggered1 = false;
		let triggered2 = false;
		let triggered3 = false;

		onTest.subscribe(() => {
			triggered1 = true;
		});

		onTest.subscribe(() => {
			triggered2 = true;
		});

		onTest.subscribe(() => {
			triggered3 = true;
		});

		expect(triggered1).toEqual(false);
		expect(triggered2).toEqual(false);
		expect(triggered3).toEqual(false);

		emitter.emit('test', 'v1');

		expect(triggered1).toEqual(true);
		expect(triggered2).toEqual(true);
		expect(triggered3).toEqual(true);
	});

	it('Can unsubscribe listener for on/off', function() {
		const emitter = new EventEmitter();
		(emitter as any).addListener = undefined;
		(emitter as any).removeListener = undefined;
		const onTest = createEventAdapter(emitter, 'test');

		let triggered = false;

		const h = onTest.subscribe(() => {
			triggered = true;
		});

		h.unsubscribe();

		emitter.emit('test', 'v1');

		expect(triggered).toEqual(false);
	});

	it('Can trigger single listener for add/removeEventListener', function() {
		const emitter = new EventEmitter();
		delete (emitter as any).addListener;
		delete (emitter as any).removeListener;
		(emitter as any).addEventListener = emitter.on;
		(emitter as any).removeEventListener = emitter.off;
		const onTest = createEventAdapter(emitter, 'test');

		let triggered = false;

		onTest.subscribe(v1 => {
			triggered = v1 === 'v1';
		});

		expect(triggered).toEqual(false);

		emitter.emit('test', 'v1');

		expect(triggered).toEqual(true);
	});

	it('Can trigger multiple listeners for add/removeEventListener', function() {
		const emitter = new EventEmitter();
		delete (emitter as any).addListener;
		delete (emitter as any).removeListener;
		(emitter as any).addEventListener = emitter.on;
		(emitter as any).removeEventListener = emitter.off;
		const onTest = createEventAdapter(emitter, 'test');

		let triggered1 = false;
		let triggered2 = false;
		let triggered3 = false;

		onTest.subscribe(() => {
			triggered1 = true;
		});

		onTest.subscribe(() => {
			triggered2 = true;
		});

		onTest.subscribe(() => {
			triggered3 = true;
		});

		expect(triggered1).toEqual(false);
		expect(triggered2).toEqual(false);
		expect(triggered3).toEqual(false);

		emitter.emit('test', 'v1');

		expect(triggered1).toEqual(true);
		expect(triggered2).toEqual(true);
		expect(triggered3).toEqual(true);
	});

	it('Can unsubscribe listener for add/removeEventListener', function() {
		const emitter = new EventEmitter();
		delete (emitter as any).addListener;
		delete (emitter as any).removeListener;
		(emitter as any).addEventListener = emitter.on;
		(emitter as any).removeEventListener = emitter.off;
		const onTest = createEventAdapter(emitter, 'test');

		let triggered = false;

		const h = onTest.subscribe(() => {
			triggered = true;
		});

		h.unsubscribe();

		emitter.emit('test', 'v1');

		expect(triggered).toEqual(false);
	});
});
