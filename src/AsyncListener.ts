/**
 * Async listener type. Defines the function signature that a listener is
 * expected to have.
 */
export type AsyncListener<This, Args extends any[]> = (this: This, ...args: Args) => Promise<any> | any;
