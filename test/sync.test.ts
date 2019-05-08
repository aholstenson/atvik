import { Event } from '../src/sync';

describe('Synchronous event', function() {
	it('Can create', function() {
		const parent = {};
		const handler = new Event(parent);
	});

	it('Can attach and trigger single listener', function() {
		const parent = {};
		const handler = new Event(parent);

		let triggered = false;

		handler.subscribe(() => {
			triggered = true;
		});

		expect(triggered).toEqual(false);

		handler.emit();

		expect(triggered).toEqual(true);
	});

	it('Can attach and detach single listener', function() {
		const parent = {};
		const handler = new Event(parent);

		let triggered = false;

		const handle = handler.subscribe(() => {
			triggered = true;
		});

		handle.unsubscribe();

		handler.emit();

		expect(triggered).toEqual(false);
	});

	it('Can detach unknown listener with single listener', function() {
		const parent = {};
		const handler = new Event(parent);

		let triggered = false;

		handler.subscribe(() => {
			triggered = true;
		});

		handler.unsubscribe(() => null);

		handler.emit();

		expect(triggered).toEqual(true);
	});

	it('Can attach and trigger single listener with single argument', function() {
		const parent = {};
		const handler = new Event<object, [ string ]>(parent);

		let triggered = false;

		handler.subscribe((v1) => {
			triggered = v1 === 'test';
		});

		expect(triggered).toEqual(false);

		handler.emit('test');

		expect(triggered).toEqual(true);
	});

	it('Can attach and trigger single listener with multiple arguments', function() {
		const parent = {};
		const handler = new Event<object, [ string, number ]>(parent);

		let triggered = false;

		handler.subscribe((v1, v2) => {
			triggered = v1 === 'test' && v2 === 2;
		});

		expect(triggered).toEqual(false);

		handler.emit('test', 2);

		expect(triggered).toEqual(true);
	});

	it('Can attach and trigger multiple listeners', function() {
		const parent = {};
		const handler = new Event(parent);

		let triggered1 = false;
		let triggered2 = false;
		let triggered3 = false;

		handler.subscribe(() => {
			triggered1 = true;
		});

		handler.subscribe(() => {
			triggered2 = true;
		});

		handler.subscribe(() => {
			triggered3 = true;
		});

		expect(triggered1).toEqual(false);
		expect(triggered2).toEqual(false);
		expect(triggered3).toEqual(false);

		handler.emit();

		expect(triggered1).toEqual(true);
		expect(triggered2).toEqual(true);
		expect(triggered3).toEqual(true);
	});

	it('Can attach and detach multiple listeners', function() {
		const parent = {};
		const handler = new Event(parent);

		let triggered1 = false;
		let triggered2 = false;
		let triggered3 = false;

		const handle1 = handler.subscribe(() => {
			triggered1 = true;
		});

		const handle2 = handler.subscribe(() => {
			triggered2 = true;
		});

		const handle3 = handler.subscribe(() => {
			triggered3 = true;
		});

		handle1.unsubscribe();
		handle2.unsubscribe();
		handle3.unsubscribe();

		handler.emit();

		expect(triggered1).toEqual(false);
		expect(triggered2).toEqual(false);
		expect(triggered3).toEqual(false);
	});

	it('Can detach unknown listener with multiple listeners', function() {
		const parent = {};
		const handler = new Event(parent);

		let triggered1 = false;
		let triggered2 = false;
		let triggered3 = false;

		handler.subscribe(() => {
			triggered1 = true;
		});

		handler.subscribe(() => {
			triggered2 = true;
		});

		handler.subscribe(() => {
			triggered3 = true;
		});

		handler.unsubscribe(() => null);

		handler.emit();

		expect(triggered1).toEqual(true);
		expect(triggered2).toEqual(true);
		expect(triggered3).toEqual(true);
	});

	it('Can attach and trigger multiple listeners with single argument', function() {
		const parent = {};
		const handler = new Event<object, [ string ]>(parent);

		let triggered1 = false;
		let triggered2 = false;

		handler.subscribe((v1) => {
			triggered1 = v1 === 'test';
		});

		handler.subscribe((v1) => {
			triggered2 = v1 === 'test';
		});

		expect(triggered1).toEqual(false);
		expect(triggered2).toEqual(false);

		handler.emit('test');

		expect(triggered1).toEqual(true);
		expect(triggered2).toEqual(true);
	});

	it('Can attach and trigger multiple listeners with multiple arguments', function() {
		const parent = {};
		const handler = new Event<object, [ string, number ]>(parent);

		let triggered1 = false;
		let triggered2 = false;

		handler.subscribe((v1, v2) => {
			triggered1 = v1 === 'test' && v2 === 2;
		});

		handler.subscribe((v1, v2) => {
			triggered2 = v1 === 'test' && v2 === 2;
		});

		expect(triggered1).toEqual(false);
		expect(triggered2).toEqual(false);

		handler.emit('test', 2);

		expect(triggered1).toEqual(true);
		expect(triggered2).toEqual(true);
	});
});
