import { AsyncEvent } from '../src/AsyncEvent.js';
import { Event } from '../src/Event.js';

describe('Disposable handles and iterators', function() {
	it('using unsubscribes a SubscriptionHandle', function() {
		const event = new Event<null, []>(null);

		{
			using handle = event.subscribe(() => undefined);
			expect(handle).toBeDefined();
			expect(event.hasListeners).toBe(true);
		}

		expect(event.hasListeners).toBe(false);
	});

	it('using unsubscribes a filtered SubscriptionHandle', function() {
		const event = new Event<null, []>(null);

		{
			using handle = event.filter(() => true).subscribe(() => undefined);
			expect(handle).toBeDefined();
			expect(event.hasListeners).toBe(true);
		}

		expect(event.hasListeners).toBe(false);
	});

	it('await using unsubscribes an AsyncSubscriptionHandle', async function() {
		const event = new AsyncEvent<null, []>(null);

		{
			await using handle = await event.subscribe(() => undefined);
			expect(handle).toBeDefined();
			expect(event.hasListeners).toBe(true);
		}

		expect(event.hasListeners).toBe(false);
	});

	for(const [ name, create ] of [
		[ 'Event', () => new Event<null, [ number ]>(null) ],
		[ 'AsyncEvent', () => new AsyncEvent<null, [ number ]>(null) ]
	] as const) {
		it(`await using stops an iterator of ${name}`, async function() {
			const event = create();
			let pending: Promise<IteratorResult<[ number ]>>;

			{
				await using iterator = event.iterator();
				pending = iterator.next();
				await new Promise(resolve => setTimeout(resolve, 0));
				expect(event.hasListeners).toBe(true);
			}

			expect(event.hasListeners).toBe(false);
			expect(await pending).toEqual({ value: undefined, done: true });
		});
	}

	it('Handles use Symbol.dispose', function() {
		const event = new Event<null, []>(null);
		const handle = event.subscribe(() => undefined);

		handle[Symbol.dispose]();
		expect(event.hasListeners).toBe(false);
	});
});
