import { AsyncEvent } from '../src/AsyncEvent.js';
import { createAsyncSubscribable } from '../src/createAsyncSubscribable.js';
import { createEventAdapter } from '../src/createEventAdapter.js';
import { Event } from '../src/Event.js';
import { EventEmitter } from 'node:events';

const events = [
	[ 'Event', () => new Event<null, [ number ]>(null) ],
	[ 'AsyncEvent', () => new AsyncEvent<null, [ number ]>(null) ]
] as const;

describe('AbortSignal', function() {
	for(const [ name, create ] of events) {
		describe(name, function() {
			it('subscribe unsubscribes when the signal aborts', async function() {
				const event = create();
				const controller = new AbortController();
				const received: number[] = [];

				await event.subscribe(n => {
					received.push(n);
				}, { signal: controller.signal });

				await event.emit(1);
				controller.abort();
				await new Promise(resolve => setTimeout(resolve, 0));
				await event.emit(2);

				expect(received).toEqual([ 1 ]);
				expect(event.hasListeners).toBe(false);
			});

			it('subscribe with an aborted signal does not subscribe', async function() {
				const event = create();

				const handle = await event.subscribe(() => undefined, { signal: AbortSignal.abort() });

				expect(event.hasListeners).toBe(false);
				await handle.unsubscribe();
			});

			it('subscribe via filter unsubscribes when the signal aborts', async function() {
				const event = create();
				const controller = new AbortController();

				await event.filter(() => true).subscribe(() => undefined, { signal: controller.signal });
				expect(event.hasListeners).toBe(true);

				controller.abort();
				await new Promise(resolve => setTimeout(resolve, 0));
				expect(event.hasListeners).toBe(false);
			});

			it('once rejects with the reason when the signal aborts', async function() {
				const event = create();
				const controller = new AbortController();

				const promise = event.once({ signal: controller.signal });
				await new Promise(resolve => setTimeout(resolve, 0));
				expect(event.hasListeners).toBe(true);

				controller.abort(new Error('stopped'));
				await expect(promise).rejects.toThrow('stopped');

				await new Promise(resolve => setTimeout(resolve, 0));
				expect(event.hasListeners).toBe(false);
			});

			it('once rejects at once with an aborted signal', async function() {
				const event = create();

				await expect(event.once({ signal: AbortSignal.abort(new Error('early')) })).rejects.toThrow('early');
				expect(event.hasListeners).toBe(false);
			});

			it('once resolves when the event comes before the abort', async function() {
				const event = create();
				const controller = new AbortController();

				const promise = event.once({ signal: controller.signal });
				await new Promise(resolve => setTimeout(resolve, 0));
				await event.emit(5);
				controller.abort();

				expect(await promise).toEqual([ 5 ]);
			});

			it('once rejects with TimeoutError for AbortSignal.timeout', async function() {
				const event = create();

				const err = await event.once({ signal: AbortSignal.timeout(10) }).catch(e => e);
				expect(err.name).toBe('TimeoutError');
			});

			it('iterator ends when the signal aborts', async function() {
				const event = create();
				const controller = new AbortController();
				const received: number[] = [];

				setTimeout(async () => {
					await event.emit(1);
					controller.abort();
				}, 10);

				for await (const [ n ] of event.iterator({ signal: controller.signal })) {
					received.push(n);
				}

				expect(received).toEqual([ 1 ]);
				expect(event.hasListeners).toBe(false);
			});

			it('iterator with an aborted signal is done at once', async function() {
				const event = create();
				const iterator = event.iterator({ signal: AbortSignal.abort() });

				expect(await iterator.next()).toEqual({ value: undefined, done: true });
				expect(event.hasListeners).toBe(false);
			});
		});
	}

	it('AsyncSubscribable unsubscribes if the signal aborts during subscribe', async function() {
		let count = 0;
		const controller = new AbortController();
		const subscribable = createAsyncSubscribable<null, []>({
			subscribe: async () => {
				count++;
				controller.abort();
			},
			unsubscribe: async () => {
				count--;
			}
		});

		await subscribable.subscribe(() => undefined, { signal: controller.signal });
		expect(count).toBe(0);
	});

	it('Adapter unsubscribes from EventEmitter when the signal aborts', function() {
		const emitter = new EventEmitter();
		const controller = new AbortController();
		const subscribable = createEventAdapter(emitter, 'test');

		subscribable(() => undefined, { signal: controller.signal });
		expect(emitter.listenerCount('test')).toBe(1);

		controller.abort();
		expect(emitter.listenerCount('test')).toBe(0);
	});
});
