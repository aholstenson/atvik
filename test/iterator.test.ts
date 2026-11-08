import { AsyncEvent } from '../src/AsyncEvent.js';
import { createAsyncSubscribable } from '../src/createAsyncSubscribable.js';
import { Event } from '../src/Event.js';
import { OverflowBehavior } from '../src/EventIteratorOptions.js';

/**
 * Resolve with the value of the promise, or with `'pending'` if the promise
 * does not settle within a short time.
 *
 * @param promise -
 *   promise to check
 * @returns
 *   settled value or `'pending'`
 */
function settled<T>(promise: Promise<T>): Promise<T | 'pending'> {
	return Promise.race([
		promise,
		new Promise<'pending'>(resolve => setTimeout(() => resolve('pending'), 50))
	]);
}

describe('Event iterators', function() {
	for(const [ name, create ] of [
		[ 'Event', () => new Event<null, [ number ]>(null) ],
		[ 'AsyncEvent', () => new AsyncEvent<null, [ number ]>(null) ]
	] as const) {
		describe(name, function() {
			it('next() after return() is done', async function() {
				const event = create();
				const iterator = event.iterator();

				await iterator.return?.();

				expect(await settled(iterator.next())).toEqual({ value: undefined, done: true });
			});

			it('Pending next() is done when return() is called', async function() {
				const event = create();
				const iterator = event.iterator();

				const pending = iterator.next();
				await iterator.return?.();

				expect(await settled(pending)).toEqual({ value: undefined, done: true });
				expect(event.hasListeners).toBe(false);
			});

			it('Does not subscribe before next() is called', async function() {
				const event = create();
				event.iterator();

				expect(event.hasListeners).toBe(false);
			});

			it('Delivers events to concurrent next() calls in order', async function() {
				const event = create();
				const iterator = event.iterator();

				const first = iterator.next();
				const second = iterator.next();
				await new Promise(resolve => setTimeout(resolve, 0));

				await event.emit(1);
				await event.emit(2);

				expect(await first).toEqual({ value: [ 1 ], done: false });
				expect(await second).toEqual({ value: [ 2 ], done: false });

				await iterator.return?.();
			});

			it('Queues events after the first next()', async function() {
				const event = create();
				const iterator = event.iterator();

				const first = iterator.next();
				await new Promise(resolve => setTimeout(resolve, 0));
				await event.emit(1);
				await event.emit(2);
				await event.emit(3);

				expect(await first).toEqual({ value: [ 1 ], done: false });
				expect(await iterator.next()).toEqual({ value: [ 2 ], done: false });
				expect(await iterator.next()).toEqual({ value: [ 3 ], done: false });

				await iterator.return?.();
			});
		});
	}

	it('Sync event subscribes in the same tick as the first next()', async function() {
		const event = new Event<null, [ number ]>(null);
		const iterator = event.iterator();

		const first = iterator.next();
		expect(event.hasListeners).toBe(true);

		event.emit(1);
		expect(await first).toEqual({ value: [ 1 ], done: false });

		await iterator.return?.();
	});

	it('Sync event rejects blocking iterators', function() {
		const event = new Event<null, [ number ]>(null);

		expect(() => event.iterator({ limit: 1, overflowBehavior: OverflowBehavior.Block })).toThrow();
	});

	describe('Blocking overflow', function() {
		it('Blocks emit until the queue has space', async function() {
			const event = new AsyncEvent<null, [ number ]>(null);
			const iterator = event.iterator({ limit: 1, overflowBehavior: OverflowBehavior.Block });

			const first = iterator.next();
			await new Promise(resolve => setTimeout(resolve, 0));
			await event.emit(1);
			expect(await first).toEqual({ value: [ 1 ], done: false });

			// Fills the queue
			await event.emit(2);

			const blocked = event.emit(3);
			expect(await settled(blocked)).toBe('pending');

			expect(await iterator.next()).toEqual({ value: [ 2 ], done: false });
			expect(await settled(blocked)).toBeUndefined();
			expect(await iterator.next()).toEqual({ value: [ 3 ], done: false });

			await iterator.return?.();
		});

		it('Releases blocked emitters on return()', async function() {
			const event = new AsyncEvent<null, [ number ]>(null);
			const iterator = event.iterator({ limit: 1, overflowBehavior: OverflowBehavior.Block });

			const first = iterator.next();
			await new Promise(resolve => setTimeout(resolve, 0));
			await event.emit(1);
			await first;
			await event.emit(2);

			const blocked = event.emit(3);
			await iterator.return?.();

			expect(await settled(blocked)).toBeUndefined();
			expect(event.hasListeners).toBe(false);
		});

		it('Keeps all blocked emitters', async function() {
			const event = new AsyncEvent<null, [ number ]>(null);
			const iterator = event.iterator({ limit: 1, overflowBehavior: OverflowBehavior.Block });

			const first = iterator.next();
			await new Promise(resolve => setTimeout(resolve, 0));
			await event.emit(1);
			await first;
			await event.emit(2);

			const blocked3 = event.emit(3);
			const blocked4 = event.emit(4);

			expect(await iterator.next()).toEqual({ value: [ 2 ], done: false });
			expect(await iterator.next()).toEqual({ value: [ 3 ], done: false });
			expect(await iterator.next()).toEqual({ value: [ 4 ], done: false });

			expect(await settled(Promise.all([ blocked3, blocked4 ]))).toEqual([ undefined, undefined ]);

			await iterator.return?.();
		});
	});

	it('Unsubscribes when return() is called during an async subscribe', async function() {
		let subscribed = 0;
		let resolveSubscribe: () => void = () => undefined;

		const subscribable = createAsyncSubscribable<null, [ number ]>({
			subscribe: () => new Promise<void>(resolve => {
				subscribed++;
				resolveSubscribe = resolve;
			}),
			unsubscribe: async () => {
				subscribed--;
			}
		});

		const iterator = subscribable.iterator();
		const pending = iterator.next();
		const returned = iterator.return?.();
		resolveSubscribe();
		await returned;

		expect(await pending).toEqual({ value: undefined, done: true });
		await new Promise(resolve => setTimeout(resolve, 0));
		expect(subscribed).toBe(0);
	});
});
