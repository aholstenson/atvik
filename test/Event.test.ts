import { Event } from '../src/Event';

describe('Synchronous event', function() {
	it('Can create', function() {
		const parent = {};
		const handler = new Event(parent);
	});

	it('Can emit event without listeners', function() {
		const parent = {};
		const handler = new Event(parent);
		handler.emit();
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

	it('Can attach single listener and detach during emit', function() {
		const parent = {};
		const handler = new Event(parent);

		let triggered = false;

		const handle = handler.subscribe(() => {
			triggered = true;

			handle.unsubscribe();
		});

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

	it('Can attach multiple listeners and detach during emit', function() {
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

			handle2.unsubscribe();
		});

		const handle3 = handler.subscribe(() => {
			triggered3 = true;
		});

		handler.emit();

		expect(triggered1).toEqual(true);
		expect(triggered2).toEqual(true);
		expect(triggered3).toEqual(true);
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

	it('Can await event with no arguments', async function() {
		const parent = {};
		const handler = new Event<object>(parent);

		setTimeout(() => handler.emit(), 50);

		await handler.once();
	});

	it('Can attach listener during emit without it triggering', function() {
		const parent = {};
		const handler = new Event(parent);

		let triggered1 = false;
		let triggered2 = true;

		handler.subscribe(() => {
			triggered1 = true;

			handler.subscribable(() => {
				triggered2 = false;
			});
		});

		handler.emit();

		expect(triggered1).toEqual(true);
		expect(triggered2).toEqual(true);
	});

	it('Duplicate listener when single listener is skipped ', function() {
		const parent = {};
		const handler = new Event(parent);

		let triggered = 0;

		const listener = () => {
			triggered++;
		};

		handler.subscribe(listener);
		handler.subscribe(listener);

		handler.emit();

		expect(triggered).toEqual(1);
	});

	it('Duplicate listener when multiple listeners is skipped', function() {
		const parent = {};
		const handler = new Event(parent);

		let triggered = 0;

		const listener = () => {
			triggered++;
		};

		handler.subscribe(listener);
		handler.subscribable(() => {
			triggered++;
		});
		handler.subscribe(listener);

		handler.emit();

		expect(triggered).toEqual(2);
	});

	it('clear removes all listeners', function() {
		const parent = {};
		const handler = new Event(parent);

		let triggered = 0;
		handler.subscribable(() => {
			triggered++;
		});

		handler.clear();
		handler.emit();

		expect(triggered).toEqual(0);
	});

	it('Monitor is notified about single listener', function() {
		const parent = {};
		const handler = new Event(parent);
		let triggerCount = 0;
		handler.monitorListeners(() => {
			triggerCount++;
		});

		handler.subscribe(() => {});

		expect(triggerCount).toEqual(1);
	});

	it('Monitor is notified about multiple listeners', function() {
		const parent = {};
		const handler = new Event(parent);
		let triggerCount = 0;
		handler.monitorListeners(() => {
			triggerCount++;
		});

		handler.subscribe(() => {});
		handler.subscribe(() => {});

		expect(triggerCount).toEqual(2);
	});

	it('Monitor is notified about single listener removal', function() {
		const parent = {};
		const handler = new Event(parent);

		const handle = handler.subscribe(() => {});

		let triggerCount = 0;
		handler.monitorListeners(() => {
			triggerCount++;
		});

		handle.unsubscribe();

		expect(triggerCount).toEqual(1);
	});

	it('Monitor is notified about multiple listener removal', function() {
		const parent = {};
		const handler = new Event(parent);

		const handle = handler.subscribe(() => {});
		handler.subscribe(() => {});

		let triggerCount = 0;
		handler.monitorListeners(() => {
			triggerCount++;
		});

		handle.unsubscribe();

		expect(triggerCount).toEqual(1);
	});

	it('Monitor is notified about clear', function() {
		const parent = {};
		const handler = new Event(parent);

		handler.subscribe(() => {});

		let triggerCount = 0;
		handler.monitorListeners(() => {
			triggerCount++;
		});

		handler.clear();

		expect(triggerCount).toEqual(1);
	});

	it('listeners returns empty when no listener', function() {
		const parent = {};
		const handler = new Event(parent);

		const listeners = handler.listeners;
		expect(listeners).toEqual([]);
	});

	it('listeners returns single listener', function() {
		const parent = {};
		const handler = new Event(parent);

		let listener = () => {};
		handler.subscribe(listener);

		const listeners = handler.listeners;
		expect(listeners).toEqual([ listener ]);
	});

	it('listeners returns multiple listeners', function() {
		const parent = {};
		const handler = new Event(parent);

		let l1 = () => {};
		let l2 = () => {};
		handler.subscribe(l1);
		handler.subscribe(l2);

		const listeners = handler.listeners;
		expect(listeners).toEqual([ l1, l2 ]);
	});
});
