/* eslint-disable @typescript-eslint/no-empty-function */
import { AsyncEvent } from '../src/AsyncEvent';
import { OverflowBehavior } from '../src/EventIteratorOptions';

describe('AsyncEvent', function() {
	it('Can create', function() {
		const parent = {};
		new AsyncEvent(parent);
	});

	it('Can emit event without listeners', function() {
		const parent = {};
		const handler = new AsyncEvent(parent);
		handler.emit();
	});

	it('Can attach and trigger single listener', async function() {
		const parent = {};
		const handler = new AsyncEvent(parent);

		let triggered = false;

		await handler.subscribe(() => {
			triggered = true;
		});

		expect(triggered).toEqual(false);

		expect(handler.hasListeners).toEqual(true);
		handler.emit();

		expect(triggered).toEqual(true);
	});

	it('Can attach and trigger single async listener', async function() {
		const parent = {};
		const handler = new AsyncEvent(parent);

		let triggered = false;

		await handler.subscribe(async () => {
			await new Promise(resolve => setTimeout(resolve, 100));
			triggered = true;
		});

		expect(triggered).toEqual(false);

		expect(handler.hasListeners).toEqual(true);
		await handler.emit();

		expect(triggered).toEqual(true);
	});

	it('Can attach and detach single listener', async function() {
		const parent = {};
		const handler = new AsyncEvent(parent);

		let triggered = false;

		const handle = await handler.subscribe(() => {
			triggered = true;
		});

		expect(handler.hasListeners).toEqual(true);
		handle.unsubscribe();
		expect(handler.hasListeners).toEqual(false);

		handler.emit();

		expect(triggered).toEqual(false);
	});

	it('Can detach unknown listener with single listener', async function() {
		const parent = {};
		const handler = new AsyncEvent(parent);

		let triggered = false;

		await handler.subscribe(() => {
			triggered = true;
		});

		await handler.unsubscribe(() => null);

		expect(handler.hasListeners).toEqual(true);

		await handler.emit();

		expect(triggered).toEqual(true);
	});

	it('Can attach single listener and detach during emit', async function() {
		const parent = {};
		const handler = new AsyncEvent(parent);

		let triggered = false;

		const handle = await handler.subscribe(() => {
			triggered = true;

			handle.unsubscribe();
		});

		await handler.emit();

		expect(triggered).toEqual(true);
		expect(handler.hasListeners).toEqual(false);
	});

	it('Can attach and trigger single listener with single argument', async function() {
		const parent = {};
		const handler = new AsyncEvent<object, [ string ]>(parent);

		let triggered = false;

		await handler.subscribe(v1 => {
			triggered = v1 === 'test';
		});

		expect(triggered).toEqual(false);

		await handler.emit('test');

		expect(triggered).toEqual(true);
	});

	it('Can attach and trigger single listener with multiple arguments', async function() {
		const parent = {};
		const handler = new AsyncEvent<object, [ string, number ]>(parent);

		let triggered = false;

		await handler.subscribe((v1, v2) => {
			triggered = v1 === 'test' && v2 === 2;
		});

		expect(triggered).toEqual(false);

		await handler.emit('test', 2);

		expect(triggered).toEqual(true);
	});

	it('Can attach and trigger multiple listeners', async function() {
		const parent = {};
		const handler = new AsyncEvent(parent);

		let triggered1 = false;
		let triggered2 = false;
		let triggered3 = false;

		await handler.subscribe(() => {
			triggered1 = true;
		});

		await handler.subscribe(() => {
			triggered2 = true;
		});

		await handler.subscribe(() => {
			triggered3 = true;
		});

		expect(triggered1).toEqual(false);
		expect(triggered2).toEqual(false);
		expect(triggered3).toEqual(false);

		await handler.emit();

		expect(triggered1).toEqual(true);
		expect(triggered2).toEqual(true);
		expect(triggered3).toEqual(true);
	});

	it('Can attach and detach multiple listeners', async function() {
		const parent = {};
		const handler = new AsyncEvent(parent);

		let triggered1 = false;
		let triggered2 = false;
		let triggered3 = false;

		const handle1 = await handler.subscribe(() => {
			triggered1 = true;
		});

		const handle2 = await handler.subscribe(() => {
			triggered2 = true;
		});

		const handle3 = await handler.subscribe(() => {
			triggered3 = true;
		});

		await handle1.unsubscribe();
		await handle2.unsubscribe();
		await handle3.unsubscribe();

		await handler.emit();

		expect(triggered1).toEqual(false);
		expect(triggered2).toEqual(false);
		expect(triggered3).toEqual(false);
	});

	it('Can attach multiple listeners and detach during emit', async function() {
		const parent = {};
		const handler = new AsyncEvent(parent);

		let triggered1 = false;
		let triggered2 = false;
		let triggered3 = false;

		await handler.subscribe(() => {
			triggered1 = true;
		});

		const handle2 = await handler.subscribe(() => {
			triggered2 = true;

			handle2.unsubscribe();
		});

		await handler.subscribe(() => {
			triggered3 = true;
		});

		await handler.emit();

		expect(triggered1).toEqual(true);
		expect(triggered2).toEqual(true);
		expect(triggered3).toEqual(true);
	});

	it('Can detach unknown listener with multiple listeners', async function() {
		const parent = {};
		const handler = new AsyncEvent(parent);

		let triggered1 = false;
		let triggered2 = false;
		let triggered3 = false;

		await handler.subscribe(() => {
			triggered1 = true;
		});

		await handler.subscribe(() => {
			triggered2 = true;
		});

		await handler.subscribe(() => {
			triggered3 = true;
		});

		await handler.unsubscribe(() => null);

		await handler.emit();

		expect(triggered1).toEqual(true);
		expect(triggered2).toEqual(true);
		expect(triggered3).toEqual(true);
	});

	it('Can attach and trigger multiple listeners with single argument', async function() {
		const parent = {};
		const handler = new AsyncEvent<object, [ string ]>(parent);

		let triggered1 = false;
		let triggered2 = false;

		await handler.subscribe(v1 => {
			triggered1 = v1 === 'test';
		});

		await handler.subscribe(v1 => {
			triggered2 = v1 === 'test';
		});

		expect(triggered1).toEqual(false);
		expect(triggered2).toEqual(false);

		await handler.emit('test');

		expect(triggered1).toEqual(true);
		expect(triggered2).toEqual(true);
	});

	it('Can attach and trigger multiple listeners with multiple arguments', async function() {
		const parent = {};
		const handler = new AsyncEvent<object, [ string, number ]>(parent);

		let triggered1 = false;
		let triggered2 = false;

		await handler.subscribe((v1, v2) => {
			triggered1 = v1 === 'test' && v2 === 2;
		});

		await handler.subscribe((v1, v2) => {
			triggered2 = v1 === 'test' && v2 === 2;
		});

		expect(triggered1).toEqual(false);
		expect(triggered2).toEqual(false);

		await handler.emit('test', 2);

		expect(triggered1).toEqual(true);
		expect(triggered2).toEqual(true);
	});

	it('Can await event with no arguments', async function() {
		const parent = {};
		const handler = new AsyncEvent<object>(parent);

		setTimeout(() => handler.emit(), 50);

		await handler.once();
	});

	it('Can iterate over event', async function() {
		const parent = {};
		const event = new AsyncEvent<object, [ string ]>(parent);

		setTimeout(() => event.emit('value'), 50);

		for await (const value of event) {
			expect(value).toEqual([ 'value' ]);
			return;
		}
	});

	it('Event iteration queues events', async function() {
		const parent = {};
		const event = new AsyncEvent<object, [ string ]>(parent);

		setTimeout(() => event.emit('v1'), 50);
		setTimeout(() => event.emit('v2'), 100);

		for await (const value of event) {
			switch(value[0]) {
				case 'v1':
					await new Promise(resolve => setTimeout(resolve, 200));
					break;
				case 'v2':
					// Test is done when v2 is received
					return;
				default:
					fail();
			}
		}
	});

	it('Event iteration drops oldest event when overflowing', async function() {
		const parent = {};
		const event = new AsyncEvent<object, [ string ]>(parent);

		setTimeout(() => event.emit('v1'), 50);
		setTimeout(() => event.emit('v2'), 100);
		setTimeout(() => event.emit('v3'), 150);

		for await (const value of event.iterator({ limit: 1 })) {
			switch(value[0]) {
				case 'v1':
					await new Promise(resolve => setTimeout(resolve, 200));
					break;
				case 'v2':
					fail('Received v2, but should have been dropped');
					break;
				case 'v3':
					return;
				default:
					fail();
			}
		}
	});

	it('Event iteration drops newest event when overflowing', async function() {
		const parent = {};
		const event = new AsyncEvent<object, [ string ]>(parent);

		setTimeout(() => event.emit('v1'), 50);
		setTimeout(() => event.emit('v2'), 100);
		setTimeout(() => event.emit('v3'), 150);

		for await (const value of event.iterator({ limit: 1, overflowBehavior: OverflowBehavior.DropNewest })) {
			switch(value[0]) {
				case 'v1':
					await new Promise(resolve => setTimeout(resolve, 200));
					break;
				case 'v2':
					return;
				case 'v3':
					fail('Received v3, but should have been dropped');
					break;
				default:
					fail();
			}
		}
	});


	it('Event iteration supports default options', async function() {
		const parent = {};
		const event = new AsyncEvent<object, [ string ]>(parent, {
			defaultIterator: {
				limit: 1
			}
		});

		setTimeout(() => event.emit('v1'), 50);
		setTimeout(() => event.emit('v2'), 100);
		setTimeout(() => event.emit('v3'), 150);

		for await (const value of event) {
			switch(value[0]) {
				case 'v1':
					await new Promise(resolve => setTimeout(resolve, 200));
					break;
				case 'v2':
					fail('Received v2, but should have been dropped');
					break;
				case 'v3':
					return;
				default:
					fail();
			}
		}
	});

	it('Event iteration can override default options', async function() {
		const parent = {};
		const event = new AsyncEvent<object, [ string ]>(parent, {
			defaultIterator: {
				limit: 1
			}
		});

		setTimeout(() => event.emit('v1'), 50);
		setTimeout(() => event.emit('v2'), 100);
		setTimeout(() => event.emit('v3'), 150);

		for await (const value of event.iterator({ overflowBehavior: OverflowBehavior.DropNewest })) {
			switch(value[0]) {
				case 'v1':
					await new Promise(resolve => setTimeout(resolve, 200));
					break;
				case 'v2':
					return;
				case 'v3':
					fail('Received v3, but should have been dropped');
					break;
				default:
					fail();
			}
		}
	});

	it('Event iteration removes listener when done', async function() {
		const parent = {};
		const event = new AsyncEvent<object, [ string ]>(parent);

		// Used to break out of the loop
		setTimeout(() => event.emit('value'), 50);

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		for await (const value of event) {
			break;
		}

		expect(event.hasListeners).toBe(false);
	});

	it('Can filter event', async function() {
		const parent = {};
		const handler = new AsyncEvent<object, [ number ]>(parent);

		const filtered = handler.filter(i => i < 10);
		let triggered = 0;
		filtered(() => triggered++);

		await handler.emit(2);
		await handler.emit(12);

		expect(triggered).toEqual(1);
	});

	it('Can filter event via subscribable', async function() {
		const parent = {};
		const handler = new AsyncEvent<object, [ number ]>(parent);

		const filtered = handler.subscribable.filter(i => i < 10);
		let triggered = 0;
		filtered(() => triggered++);

		await handler.emit(2);
		await handler.emit(12);

		expect(triggered).toEqual(1);
	});

	it('Can remove filtered event', async function() {
		const parent = {};
		const handler = new AsyncEvent<object, [ number ]>(parent);

		const filtered = handler.subscribable.filter(i => i < 10);
		let triggered = 0;
		const handle = await filtered(() => triggered++);

		await handler.emit(2);

		await handle.unsubscribe();

		await handler.emit(2);

		expect(triggered).toEqual(1);
	});

	it('Can change this via withThis', async function() {
		const parent = {};
		const otherParent = {};
		const handler = new AsyncEvent<object>(parent);

		const withNewThis = handler.withThis(otherParent);
		let triggered = 0;
		await withNewThis(function() {
			if(this === otherParent) triggered++;
		});

		await handler.emit();

		expect(triggered).toEqual(1);
	});

	it('Can change this via withThis via subscribable', async function() {
		const parent = {};
		const otherParent = {};
		const handler = new AsyncEvent<object>(parent);

		const withNewThis = handler.subscribable.withThis(otherParent);
		let triggered = 0;
		await withNewThis(function() {
			if(this === otherParent) triggered++;
		});

		await handler.emit();

		expect(triggered).toEqual(1);
	});

	it('Can remove handler added via withThis', async function() {
		const parent = {};
		const otherParent = {};
		const handler = new AsyncEvent<object>(parent);

		const withNewThis = handler.subscribable.withThis(otherParent);
		let triggered = 0;

		const handle = await withNewThis(function() {
			if(this === otherParent) triggered++;
		});

		await handler.emit();

		await handle.unsubscribe();

		await handler.emit();

		expect(triggered).toEqual(1);
	});

	it('Can attach listener during emit without it triggering', async function() {
		const parent = {};
		const handler = new AsyncEvent(parent);

		let triggered1 = false;
		let triggered2 = true;

		await handler.subscribe(() => {
			triggered1 = true;

			handler.subscribable(() => {
				triggered2 = false;
			});
		});

		await handler.emit();

		expect(triggered1).toEqual(true);
		expect(triggered2).toEqual(true);
	});

	it('Duplicate listener when single listener is skipped ', async function() {
		const parent = {};
		const handler = new AsyncEvent(parent);

		let triggered = 0;

		const listener = () => {
			triggered++;
		};

		await handler.subscribe(listener);
		await handler.subscribe(listener);

		await handler.emit();

		expect(triggered).toEqual(1);
	});

	it('Duplicate listener when multiple listeners is skipped', async function() {
		const parent = {};
		const handler = new AsyncEvent(parent);

		let triggered = 0;

		const listener = () => {
			triggered++;
		};

		await handler.subscribe(listener);
		await handler.subscribable(() => {
			triggered++;
		});
		await handler.subscribe(listener);

		await handler.emit();

		expect(triggered).toEqual(2);
	});

	it('clear removes all listeners', async function() {
		const parent = {};
		const handler = new AsyncEvent(parent);

		let triggered = 0;
		await handler.subscribable(() => {
			triggered++;
		});

		handler.clear();
		expect(handler.hasListeners).toEqual(false);

		await handler.emit();

		expect(triggered).toEqual(0);
	});

	it('Monitor is notified about single listener', async function() {
		const parent = {};
		const handler = new AsyncEvent(parent);
		let triggerCount = 0;
		handler.monitorListeners(() => {
			triggerCount++;
		});

		await handler.subscribe(() => {});

		expect(triggerCount).toEqual(1);
	});

	it('Monitor is notified about multiple listeners', async function() {
		const parent = {};
		const handler = new AsyncEvent(parent);
		let triggerCount = 0;
		handler.monitorListeners(() => {
			triggerCount++;
		});

		await handler.subscribe(() => {});
		await handler.subscribe(() => {});

		expect(triggerCount).toEqual(2);
	});

	it('Monitor is notified about single listener removal', async function() {
		const parent = {};
		const handler = new AsyncEvent(parent);

		const handle = await handler.subscribe(() => {});

		let triggerCount = 0;
		handler.monitorListeners(() => {
			triggerCount++;
		});

		await handle.unsubscribe();

		expect(triggerCount).toEqual(1);
	});

	it('Monitor is notified about multiple listener removal', async function() {
		const parent = {};
		const handler = new AsyncEvent(parent);

		const handle = await handler.subscribe(() => {});
		await handler.subscribe(() => {});

		let triggerCount = 0;
		handler.monitorListeners(() => {
			triggerCount++;
		});

		await handle.unsubscribe();

		expect(triggerCount).toEqual(1);
	});

	it('Monitor is notified about clear', async function() {
		const parent = {};
		const handler = new AsyncEvent(parent);

		await handler.subscribe(() => {});

		let triggerCount = 0;
		handler.monitorListeners(() => {
			triggerCount++;
		});

		handler.clear();

		expect(triggerCount).toEqual(1);
	});

	it('Monitor can be removed', async function() {
		const parent = {};
		const handler = new AsyncEvent(parent);
		let triggerCount = 0;
		handler.monitorListeners(() => {
			triggerCount++;
		});

		handler.removeMonitor();

		await handler.subscribe(() => {});

		expect(triggerCount).toEqual(0);
	});

	it('Multiple monitors fail', function() {
		const parent = {};
		const handler = new AsyncEvent(parent);

		handler.monitorListeners(() => {});

		expect(() => {
			handler.monitorListeners(() => {});
		}).toThrow();
	});

	it('listeners returns empty when no listener', function() {
		const parent = {};
		const handler = new AsyncEvent(parent);

		const listeners = handler.listeners;
		expect(listeners).toEqual([]);
	});

	it('listeners returns single listener', async function() {
		const parent = {};
		const handler = new AsyncEvent(parent);

		const listener = () => {};
		await handler.subscribe(listener);

		const listeners = handler.listeners;
		expect(listeners).toEqual([ listener ]);
	});

	it('listeners returns multiple listeners', async function() {
		const parent = {};
		const handler = new AsyncEvent(parent);

		const l1 = () => {};
		const l2 = () => {};
		await handler.subscribe(l1);
		await handler.subscribe(l2);

		const listeners = handler.listeners;
		expect(listeners).toEqual([ l1, l2 ]);
	});
});
