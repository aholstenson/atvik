/**
 * Listener type. Defines the function signature that a listener is expected
 * to have.
 */
export type Listener<This, Args extends unknown[]> = (this: This, ...args: Args) => void | Promise<void>;
