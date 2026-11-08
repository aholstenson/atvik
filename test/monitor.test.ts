import { AsyncEvent } from '../src/AsyncEvent.js';
import { Event } from '../src/Event.js';

describe('Listener monitors and counts', function() {
	for(const [ name, create ] of [
		[ 'Event', () => new Event<null, []>(null) ],
		[ 'AsyncEvent', () => new AsyncEvent<null, []>(null) ]
	] as const) {
		describe(name, function() {
			it('listenerCount counts listeners', async function() {
				const event = create();
				expect(event.listenerCount).toBe(0);

				const a = () => undefined;
				const b = () => undefined;
				await event.subscribe(a);
				expect(event.listenerCount).toBe(1);

				await event.subscribe(b);
				await event.subscribe(b);
				expect(event.listenerCount).toBe(2);

				await event.unsubscribe(a);
				expect(event.listenerCount).toBe(1);
			});

			it('removeMonitor removes one monitor', async function() {
				const event = create();
				let first = 0;
				let second = 0;
				const firstMonitor = () => first++;

				event.monitorListeners(firstMonitor);
				event.monitorListeners(() => second++);
				event.removeMonitor(firstMonitor);

				await event.subscribe(() => undefined);
				expect([ first, second ]).toEqual([ 0, 1 ]);
			});

			it('removeMonitor without argument removes all monitors', async function() {
				const event = create();
				let count = 0;

				event.monitorListeners(() => count++);
				event.monitorListeners(() => count++);
				event.removeMonitor();

				await event.subscribe(() => undefined);
				expect(count).toBe(0);
			});

			it('using removes a monitor', async function() {
				const event = create();
				let count = 0;

				{
					using handle = event.monitorListeners(() => count++);
					expect(handle).toBeDefined();
					await event.subscribe(() => undefined);
				}

				event.clear();
				expect(count).toBe(1);
			});
		});
	}
});
