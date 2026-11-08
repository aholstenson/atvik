import { AsyncEvent } from '../src/AsyncEvent.js';
import { Event } from '../src/Event.js';

describe('parallelEmit', function() {
	for(const [ name, create ] of [
		[ 'Event', () => new Event<null, []>(null) ],
		[ 'AsyncEvent', () => new AsyncEvent<null, []>(null) ]
	] as const) {
		describe(name, function() {
			it('rejects with the error of a single failed listener', async function() {
				const event = create();
				await event.subscribe(async () => {
					throw new Error('a');
				});
				await event.subscribe(async () => undefined);

				await expect(event.parallelEmit()).rejects.toThrow('a');
			});

			it('rejects with AggregateError when more than one listener fails', async function() {
				const event = create();
				await event.subscribe(async () => {
					throw new Error('a');
				});
				await event.subscribe(() => {
					throw new Error('b');
				});

				const err = await event.parallelEmit().catch(e => e);
				expect(err).toBeInstanceOf(AggregateError);
				expect((err as AggregateError).errors.map(e => e.message)).toEqual([ 'a', 'b' ]);
			});

			it('invokes all listeners when one throws synchronously', async function() {
				const event = create();
				let done = false;
				await event.subscribe(() => {
					throw new Error('a');
				});
				await event.subscribe(async () => {
					await new Promise(resolve => setTimeout(resolve, 10));
					done = true;
				});

				await expect(event.parallelEmit()).rejects.toThrow('a');
				expect(done).toBe(true);
			});
		});
	}
});
