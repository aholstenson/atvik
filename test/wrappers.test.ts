import { AsyncEvent } from '../src/AsyncEvent.js';
import type { ErrorStrategy } from '../src/ErrorStrategy.js';
import { Event } from '../src/Event.js';

/**
 * Listener that resolves after a short delay and records that it is done.
 *
 * @param state -
 *   object that is marked as done
 * @returns
 *   listener
 */
function slowListener(state: { done: boolean }) {
	return async () => {
		await new Promise(resolve => setTimeout(resolve, 10));
		state.done = true;
	};
}

describe('Derived subscribables', function() {
	describe('AsyncEvent.emit waits for listeners', function() {
		it('added via withThis', async function() {
			const event = new AsyncEvent<null, []>(null);
			const state = { done: false };
			await event.withThis({}).subscribe(slowListener(state));

			await event.emit();
			expect(state.done).toBe(true);
		});

		it('added via filter', async function() {
			const event = new AsyncEvent<null, []>(null);
			const state = { done: false };
			await event.filter(() => true).subscribe(slowListener(state));

			await event.emit();
			expect(state.done).toBe(true);
		});
	});

	describe('Event.asyncEmit waits for listeners', function() {
		it('added via withThis', async function() {
			const event = new Event<null, []>(null);
			const state = { done: false };
			event.withThis({}).subscribe(slowListener(state));

			await event.asyncEmit();
			expect(state.done).toBe(true);
		});

		it('added via sync filter', async function() {
			const event = new Event<null, []>(null);
			const state = { done: false };
			event.filter(() => true).subscribe(slowListener(state));

			await event.asyncEmit();
			expect(state.done).toBe(true);
		});

		it('added via async filter', async function() {
			const event = new Event<null, []>(null);
			const state = { done: false };
			event.filter(async () => true).subscribe(slowListener(state));

			await event.asyncEmit();
			expect(state.done).toBe(true);
		});
	});

	describe('Errors of listeners go to the error strategy', function() {
		for(const [ name, derive ] of [
			[ 'filter', (e: Event<null, []>) => e.filter(() => true) ],
			[ 'async filter', (e: Event<null, []>) => e.filter(async () => true) ],
			[ 'withThis', (e: Event<null, []>) => e.withThis({}) ]
		] as const) {
			it(name, async function() {
				const errors: unknown[] = [];
				const event = new Event<null, []>(null, {
					defaultErrorStrategy: { handle: err => errors.push(err) }
				});

				derive(event).subscribe(async () => {
					throw new Error('failed');
				});

				event.emit();
				await new Promise(resolve => setTimeout(resolve, 0));

				expect(errors).toHaveLength(1);
			});
		}
	});

	it('AsyncEvent.emit rejects when a filtered listener fails', async function() {
		const event = new AsyncEvent<null, []>(null);
		await event.filter(() => true).subscribe(async () => {
			throw new Error('failed');
		});

		await expect(event.emit()).rejects.toThrow('failed');
	});

	it('Error strategy can use this', async function() {
		const strategy: ErrorStrategy & { errors: unknown[] } = {
			errors: [],
			handle(err) {
				this.errors.push(err);
			}
		};
		const event = new Event<null, []>(null, { defaultErrorStrategy: strategy });
		event.subscribe(async () => {
			throw new Error('failed');
		});

		event.emit();
		await new Promise(resolve => setTimeout(resolve, 0));

		expect(strategy.errors).toHaveLength(1);
	});

	describe('Same listener added twice', function() {
		it('filter subscribes it once', function() {
			const event = new Event<null, []>(null);
			const filtered = event.filter(() => true);
			const listener = () => undefined;

			filtered.subscribe(listener);
			filtered.subscribe(listener);
			expect(event.listeners).toHaveLength(1);

			filtered.unsubscribe(listener);
			expect(event.hasListeners).toBe(false);
		});

		it('withThis subscribes it once', async function() {
			const event = new AsyncEvent<null, []>(null);
			const withThis = event.withThis({});
			const listener = () => undefined;

			await withThis.subscribe(listener);
			await withThis.subscribe(listener);
			expect(event.listeners).toHaveLength(1);

			await withThis.unsubscribe(listener);
			expect(event.hasListeners).toBe(false);
		});
	});
});
