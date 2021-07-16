# Atvik

[![npm version](https://img.shields.io/npm/v/atvik)](https://www.npmjs.com/package/atvik)
[![Build Status](https://github.com/aholstenson/atvik/actions/workflows/ci.yml/badge.svg)](https://github.com/aholstenson/atvik/actions/workflows/ci.yml)
[![Coverage Status](https://img.shields.io/coveralls/github/aholstenson/atvik)](https://coveralls.io/github/aholstenson/atvik)
[![Dependencies](https://img.shields.io/librariesio/release/npm/atvik)](https://libraries.io/npm/atvik)

Atvik is an event emitter for JavaScript and TypeScript. This library
provides emitters for individual events that work well with types and
inheritance.

```javascript
import { Event } from 'atvik';

// Create an event
const event = new Event(thisValueForListeners);

// Subscribe to the event
const handle = event.subscribe((arg1) => console.log('event', arg1));

// Emit the event, triggering all listeners
event.emit('first argument');

// Unsubscribe from the event
handle.unsubscribe();

// Using for await ... of listeners
for await (const [ arg1 ] of event) {
  console.log('event', arg1);
}

// Public API without emit is available
const subscribable = event.subscribable;
subscribable((arg1) => console.log('event', arg1));

for await (const [ arg1 ] of subscribable) {
  console.log('event', arg1);
}
```

## Use with classes

Events come with a public API called `Subscribable` for use with classes so
that users of a class can only subscribe to events and not emit them.

```javascript
class Counter {
  constructor() {
    this.countUpdatedEvent = new Event(this);
    this.count = 0;
  }

  get onCountUpdated() {
    /*
     * Return the subscribable of the event - which is a function that can be
     * used to listen to the event.
     */
    return this.countUpdatedEvent.subscribable;
  }

  increment() {
    this.count++;
    this.countUpdatedEvent.emit(this.count);
  }
}

const counter = new Counter();

// Subscribe to the event with a listener
counter.onCountUpdated(currentCount => console.log(currentCount));

// Increment and trigger the countUpdated event
counter.increment();
```

`Subscribable` is a function that can be used to directly subscribe a listener,
but can also be used for more advanced use cases. The following functions are
supported:

* `subscribe(listener: Listener): SubscriptionHandle` - Subscribe a listener, 
  the same as invoking the function directly
* `unsubscribe(listener: Listener): void` - Unsubscribe a listener
* `once(): Promise` - Create a promise that will resolve once the event is
  emitted
* `filter(filter: (...args) => boolean)` - Filter the subscribable, returning
  an up
* `withThis(newThis)` - Change the this used for listeners

## Types with TypeScript

Atvik is compatible with TypeScript and provides a type-safe interface to
listen to and emit events:

```typescript
import { Event } from 'atvik';

const parent = {};

// Create an event without any expected arguments
const noArgEvent = new Event<object>(parent);

// Subscribing will be checked so it takes in zero arguments
noArgEvent.subscribe(() => /* do stuff here */);

// Emitting the event can only be done without any parameters
noArgEvent.emit();
```

Events can have arguments that will be checked in the listeners and when
emitting:

```typescript
// Pass a second type in array form to specify the expected arguments
const argEvent = new Event<object, [ number ]>(parent);

// Subscribe will now check that the arguments are compatible
argEvent.subscribe((count) => /* do stuff here */);

// Emitting the event now requires arguments to be passed
argEvent.emit(10);
```

## Listening to something once

Listening for a single event can be done via promises:

```javascript
// Wait for the event to be emitted
const args = await event.once();

// Or using the subscribable
const args = await event.subscribable.once();
```

## Filtering events

In some cases it might be useful to filter events without managing a separate
`Event`. Atvik supports creating a filtered `Subscribable` for this purpose:

```javascript
const event = new Event(thisValueForListener);

const onlyEvenNumbers = event.filter((arg1) => arg1 % 2 === 0);
onlyEvenNumbers(number => console.log('Got number:', number));

// Will not invoke listener added via onlyEvenNumbers
event.emit(1);

// This will invoke the listener
event.emit(2);
```

## Iterating over events

Events and subscribables can be iterated over using a `for await .. of` loop,
allowing for the creation of simple event loops:

```javascript
for await (const [ arg1 ] of event) {
  console.log('event', arg1)
}
```

Sometimes events are emitted faster than they can be consumed, limiting and
controlling overflow of events can be done via {@link iterator}.

As an example this will limit to 10 queued events and then start dropping
the earliest ones:

```javascript
for await (const [ arg1 ] of subscribable.iterator({ limit: 10 })) {
  console.log('event', arg1);
}
```

The behavior to use when the queue is full can be controlled by setting the
[OverflowBehavior](https://aholstenson.github.io/atvik/enums/OverflowBehavior.html):

```javascript
const iteratorOptions = {
  limit: 10,
  overflowBehavior: OverflowBehavior.DropNewest
};

for await (const [ arg1 ] of subscribable.iterator(iteratorOptions)) {
  console.log('event', arg1);
}
```

### Monitoring for listener changes

For some use cases it is necessary to monitor if an event has any listeners,
for this library provides the `monitorListeners` function. If a monitor is
registered it will be invoked for any change in listeners, so subscribing or
unsubscribing will always trigger the monitor.

Example with a fictional service being started and stopped:

```javascript
event.monitorListeners(theEvent => {
  if(theEvent.hasListeners) {
    // The event has at least one active listener
    if(! service.started) {
      service.start();
    }
  } else {
    // No active listeners
    if(service.started) {
      service.stop();
    }
  }
});
```

Only a single monitor may be active at a time and the active monitor can be
removed via `removeMonitor()`.

## Asynchronous subscription and unsubscription

`AsyncSubscribable` is a variant of `Subscribable`where listeners are 
subscribed in an asynchronous way. It is intended for use when listeners need
some asynchronous action before they are available, such as a remote RPC
scenario. The API of `AsyncSubscribable` matches `Subscribable` but returns 
promises for `subscribe`, `unsubscribe` and `emit`:

```javascript
// Subscribe to the event
const handle = await asyncSubscribable.subscribe((arg1) => /* do stuff here */);

// Unsubscribe from the event
await handle.unsubscribe();
```

An implementation can be created via `createAsyncSubscribable` to create a 
bridge to something like a remote service, or via `AsyncEvent` for local use.

Using `createAsyncSubscribable`:

```javascript
import { createAsyncSubscribable } from 'atvik';

const asyncSubscribable = createAsyncSubscribable({
  subscribe: async (listener) => {
    // Subscribe listener here
  },
  unsubscribe: async (listener) => {
    // Unsubscribe listener here
    return listenerWasSubscribed;
  }
});
```

Using `AsyncEvent`:

```javascript
import { AsyncEvent } from 'atvik';

const event = new AsyncEvent(thisValueForListeners);

// Emit the event, triggering all listeners
await event.emit('first argument');
```

## Adapting other event emitters

Support is included for adapting some common event emitters such as Nodes
`EventEmitter` and DOM events using [createEventAdapter](https://aholstenson.github.io/atvik/modules.html#createEventAdapter).

```javascript
import { createEventAdapter } from 'atvik';

const subscribable = createEventAdapter(eventEmitter, 'nameOfEvent');

// Use subscribable as normal
subscribable(arg1 => console.log('event', arg1));
```
