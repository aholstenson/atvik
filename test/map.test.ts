import { AsyncEvent } from '../src/AsyncEvent.js';
import { Event } from '../src/Event.js';

describe('map', function() {
	it('Event changes the arguments', function() {
		const event = new Event<null, [ number ]>(null);
		const received: [ string, number ][] = [];

		event.map(n => [ String(n), n * 2 ]).subscribe((s, doubled) => {
			received.push([ s, doubled ]);
		});

		event.emit(2);
		expect(received).toEqual([ [ '2', 4 ] ]);
	});

	it('Event supports async mappers', async function() {
		const event = new Event<null, [ number ]>(null);
		const received: number[] = [];

		event.map(async n => [ n + 1 ]).subscribe(n => {
			received.push(n);
		});

		await event.asyncEmit(1);
		expect(received).toEqual([ 2 ]);
	});

	it('AsyncEvent changes the arguments and waits for the listener', async function() {
		const event = new AsyncEvent<null, [ number ]>(null);
		let done = false;

		await event.map(n => [ n * 10 ]).subscribe(async n => {
			await new Promise(resolve => setTimeout(resolve, 10));
			done = n === 20;
		});

		await event.emit(2);
		expect(done).toBe(true);
	});

	it('Keeps this of the event', function() {
		const parent = { name: 'parent' };
		const event = new Event<typeof parent, [ number ]>(parent);
		const names: string[] = [];

		event.map(n => [ n ]).subscribe(function(this: typeof parent) {
			names.push(this.name);
		});

		event.emit(1);
		expect(names).toEqual([ 'parent' ]);
	});

	it('Can unsubscribe a mapped listener', function() {
		const event = new Event<null, [ number ]>(null);
		const mapped = event.map(n => [ n ]);
		const listener = () => undefined;

		mapped.subscribe(listener);
		expect(event.hasListeners).toBe(true);

		mapped.unsubscribe(listener);
		expect(event.hasListeners).toBe(false);
	});

	it('Can be combined with filter and once', async function() {
		const event = new Event<null, [ number ]>(null);
		const promise = event.map(n => [ n * 2 ]).filter(n => n > 5).once();

		event.emit(1);
		event.emit(3);

		expect(await promise).toEqual([ 6 ]);
	});

	it('Mapper errors go to the error strategy of Event', async function() {
		const errors: unknown[] = [];
		const event = new Event<null, [ number ]>(null, {
			defaultErrorStrategy: { handle: err => errors.push(err) }
		});

		event.map(async (): Promise<[ number ]> => {
			throw new Error('failed');
		}).subscribe(() => undefined);

		event.emit(1);
		await new Promise(resolve => setTimeout(resolve, 0));
		expect(errors).toHaveLength(1);
	});
});
