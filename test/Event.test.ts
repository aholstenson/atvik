/* eslint-disable @typescript-eslint/no-empty-function */
import exp from 'constants';
import { Event } from '../src/Event';
import { OverflowBehavior } from '../src/EventIteratorOptions';

describe('Synchronous event', function() {
	it('Can create', function() {
		const parent = {};
		new Event(parent);
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

		expect(handler.hasListeners).toEqual(true);
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

		expect(handler.hasListeners).toEqual(true);
		handle.unsubscribe();
		expect(handler.hasListeners).toEqual(false);

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

		handler.unsubscribe(() => {});

		expect(handler.hasListeners).toEqual(true);

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
		expect(handler.hasListeners).toEqual(false);
	});

	it('Can attach and trigger single listener with single argument', function() {
		const parent = {};
		const handler = new Event<object, [ string ]>(parent);

		let triggered = false;

		handler.subscribe(v1 => {
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

	it('Can attach and trigger single async listener', function() {
		const parent = {};
		const handler = new Event<object, [ string ]>(parent);

		let triggered = false;

		handler.subscribe(async v1 => {
			triggered = v1 === 'test';
		});

		expect(triggered).toEqual(false);

		handler.emit('test');

		expect(triggered).toEqual(true);
	});

	it('Can attach and trigger single async listener - emit does not wait', async function() {
		const parent = {};
		const handler = new Event<object, [ string ]>(parent);

		let triggered = false;

		handler.subscribe(async v1 => {
			await new Promise(resolve => setTimeout(resolve, 100));
			triggered = v1 === 'test';
		});

		expect(triggered).toEqual(false);

		handler.emit('test');

		expect(triggered).toEqual(false);
	});

	it('Can attach and trigger single async listener via asyncEmit', async function() {
		const parent = {};
		const handler = new Event<object, [ string ]>(parent);

		let triggered = false;

		handler.subscribe(async v1 => {
			await new Promise(resolve => setTimeout(resolve, 100));
			triggered = v1 === 'test';
		});

		expect(triggered).toEqual(false);

		await handler.asyncEmit('test');

		expect(triggered).toEqual(true);
	});

	it('Can attach and trigger single async listener via parallelEmit', async function() {
		const parent = {};
		const handler = new Event<object, [ string ]>(parent);

		let triggered = false;

		handler.subscribe(async v1 => {
			await new Promise(resolve => setTimeout(resolve, 100));
			triggered = v1 === 'test';
		});

		expect(triggered).toEqual(false);

		await handler.parallelEmit('test');

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

	it('Can attach and trigger multiple async/non-async listeners', function() {
		const parent = {};
		const handler = new Event(parent);

		let triggered1 = false;
		let triggered2 = false;
		let triggered3 = false;

		handler.subscribe(async () => {
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

	it('Can attach and trigger multiple async/non-async listeners - emit does not wait', function() {
		const parent = {};
		const handler = new Event(parent);

		let triggered1 = false;
		let triggered2 = false;
		let triggered3 = false;

		handler.subscribe(async () => {
			await new Promise(resolve => setTimeout(resolve, 100));
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

		expect(triggered1).toEqual(false);
		expect(triggered2).toEqual(true);
		expect(triggered3).toEqual(true);
	});

	it('Can attach and trigger multiple listeners via asyncEmit', async function() {
		const parent = {};
		const handler = new Event(parent);

		let triggered1 = false;
		let triggered2 = false;
		let triggered3 = false;

		handler.subscribe(async () => {
			await new Promise(resolve => setTimeout(resolve, 100));
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

		await handler.asyncEmit();

		expect(triggered1).toEqual(true);
		expect(triggered2).toEqual(true);
		expect(triggered3).toEqual(true);
	});


	it('Can attach and trigger multiple listeners via parallelEmit', async function() {
		const parent = {};
		const handler = new Event(parent);

		let triggered1 = false;
		let triggered2 = false;
		let triggered3 = false;

		handler.subscribe(async () => {
			await new Promise(resolve => setTimeout(resolve, 100));
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

		await handler.parallelEmit();

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

		handler.subscribe(() => {
			triggered1 = true;
		});

		const handle2 = handler.subscribe(() => {
			triggered2 = true;

			handle2.unsubscribe();
		});

		handler.subscribe(() => {
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

		handler.unsubscribe(() => {});

		handler.emit();

		expect(triggered1).toEqual(true);
		expect(triggered2).toEqual(true);
		expect(triggered3).toEqual(true);
	});

	it('Can attach multiple and detach first listener', function() {
		const parent = {};
		const handler = new Event(parent);

		let triggered1 = false;
		let triggered2 = false;
		let triggered3 = false;

		const handle1 = handler.subscribe(() => {
			triggered1 = true;
		});

		handler.subscribe(() => {
			triggered2 = true;
		});

		handler.subscribe(() => {
			triggered3 = true;
		});

		handle1.unsubscribe();
		handler.emit();

		expect(triggered1).toEqual(false);
		expect(triggered2).toEqual(true);
		expect(triggered3).toEqual(true);
	});

	it('Can attach multiple and detach second listener', function() {
		const parent = {};
		const handler = new Event(parent);

		let triggered1 = false;
		let triggered2 = false;
		let triggered3 = false;

		handler.subscribe(() => {
			triggered1 = true;
		});

		const handle2 = handler.subscribe(() => {
			triggered2 = true;
		});

		handler.subscribe(() => {
			triggered3 = true;
		});

		handle2.unsubscribe();
		handler.emit();

		expect(triggered1).toEqual(true);
		expect(triggered2).toEqual(false);
		expect(triggered3).toEqual(true);
	});

	it('Can attach multiple and detach last listener', function() {
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

		const handle3 = handler.subscribe(() => {
			triggered3 = true;
		});

		handle3.unsubscribe();
		handler.emit();

		expect(triggered1).toEqual(true);
		expect(triggered2).toEqual(true);
		expect(triggered3).toEqual(false);
	});

	it('Can attach and trigger multiple listeners with single argument', function() {
		const parent = {};
		const handler = new Event<object, [ string ]>(parent);

		let triggered1 = false;
		let triggered2 = false;

		handler.subscribe(v1 => {
			triggered1 = v1 === 'test';
		});

		handler.subscribe(v1 => {
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

	it('Can iterate over event', async function() {
		const parent = {};
		const event = new Event<object, [ string ]>(parent);

		setTimeout(() => event.emit('value'), 50);

		for await (const value of event) {
			expect(value).toEqual([ 'value' ]);
			return;
		}
	});

	it('Event iteration queues events', async function() {
		const parent = {};
		const event = new Event<object, [ string ]>(parent);

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
		const event = new Event<object, [ string ]>(parent);

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
		const event = new Event<object, [ string ]>(parent);

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
		const event = new Event<object, [ string ]>(parent, {
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
		const event = new Event<object, [ string ]>(parent, {
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
		const event = new Event<object, [ string ]>(parent);

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
		const handler = new Event<object, [ number ]>(parent);

		const filtered = handler.filter(i => i < 10);
		let triggered = 0;
		filtered(() => {
			triggered++;
		});

		handler.emit(2);
		handler.emit(12);

		expect(triggered).toEqual(1);
	});

	it('Can filter event via subscribable', async function() {
		const parent = {};
		const handler = new Event<object, [ number ]>(parent);

		const filtered = handler.subscribable.filter(i => i < 10);
		let triggered = 0;
		filtered(() => {
			triggered++;
		});

		handler.emit(2);
		handler.emit(12);

		expect(triggered).toEqual(1);
	});

	it('Can remove filtered event', async function() {
		const parent = {};
		const handler = new Event<object, [ number ]>(parent);

		const filtered = handler.subscribable.filter(i => i < 10);
		let triggered = 0;
		const handle = filtered(() => {
			triggered++;
		});

		handler.emit(2);

		handle.unsubscribe();

		handler.emit(2);

		expect(triggered).toEqual(1);
	});

	it('Can filter event async', async function() {
		const parent = {};
		const handler = new Event<object, [ number ]>(parent);

		const filtered = handler.filter(async i => i < 10);
		let triggered = 0;
		filtered(() => {
			triggered++;
		});

		await handler.asyncEmit(2);
		await handler.asyncEmit(12);

		expect(triggered).toEqual(1);
	});

	it('Can change this via withThis', async function() {
		const parent = {};
		const otherParent = {};
		const handler = new Event<object>(parent);

		const withNewThis = handler.withThis(otherParent);
		let triggered = 0;
		withNewThis(function() {
			if(this === otherParent) triggered++;
		});

		handler.emit();

		expect(triggered).toEqual(1);
	});

	it('Can change this via withThis via subscribable', async function() {
		const parent = {};
		const otherParent = {};
		const handler = new Event<object>(parent);

		const withNewThis = handler.subscribable.withThis(otherParent);
		let triggered = 0;
		withNewThis(function() {
			if(this === otherParent) triggered++;
		});

		handler.emit();

		expect(triggered).toEqual(1);
	});


	it('Can remove handler added via withThis', async function() {
		const parent = {};
		const otherParent = {};
		const handler = new Event<object>(parent);

		const withNewThis = handler.subscribable.withThis(otherParent);
		let triggered = 0;

		const handle = withNewThis(function() {
			if(this === otherParent) triggered++;
		});

		handler.emit();

		handle.unsubscribe();

		handler.emit();

		expect(triggered).toEqual(1);
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
		expect(handler.hasListeners).toEqual(false);

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

	it('Monitor can be removed', function() {
		const parent = {};
		const handler = new Event(parent);
		let triggerCount = 0;
		handler.monitorListeners(() => {
			triggerCount++;
		});

		handler.removeMonitor();

		handler.subscribe(() => {});

		expect(triggerCount).toEqual(0);
	});

	it('Multiple monitors fail', function() {
		const parent = {};
		const handler = new Event(parent);

		handler.monitorListeners(() => {});

		expect(() => {
			handler.monitorListeners(() => {});
		}).toThrow();
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

		const listener = () => {};
		handler.subscribe(listener);

		const listeners = handler.listeners;
		expect(listeners).toEqual([ listener ]);
	});

	it('listeners returns multiple listeners', function() {
		const parent = {};
		const handler = new Event(parent);

		const l1 = () => {};
		const l2 = () => {};
		handler.subscribe(l1);
		handler.subscribe(l2);

		const listeners = handler.listeners;
		expect(listeners).toEqual([ l1, l2 ]);
	});
});
