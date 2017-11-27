# Mytosis Streams
*Lazy event streams*

## Purpose
Modelling streams of events with an eventual value, without the monstrous size of node streams or cache burden of RxJS.

Ideal use cases:

- Streaming and parsing data out of a storage backend.
- Streaming (and chunking) data over a network.
- Creating a response pipeline to handle a stream of incoming network requests.
- Joining streams together and mapping them into a data structure.

Some fancy distinguishing features:
- Streams are lazy. They pull inspiration from generators and only publish content when consumers are watching.
- Using `await` on a stream resolves with the result.
- Typed with [Flow](https://flow.org/).
- It's **tiny** (~5.5kb minified, assuming you're already using `babel-runtime`).

**Demo**
```js
import Stream from '@mytosis/streams'

const result = Stream
  .from([1, 2, 3, 4, 5])
  .take(3)
  .filter(value => value !== 2)
  .map(value => value * 2)
  .reduce((sum, value) => sum + value, 0)

console.log('Result:', await result) // Result: 8
```

**Longer demo**
```js
let index = 1;
export default new Stream((push, resolve) => {
  const interval = setInterval(() => {
    if (index >= 50) resolve()
    else push(index++)
  }, 10)

  return () => clearInterval(interval)
})
```

## Why not use...
- RxJS<br />
  - It's large, even when cherry-picking modules
  - The event cache is inseperable. Not ideal when modelling every network message on a server (there are ways of reducing cache size, but all have downsides)

- Async Generators<br />
  I'm pretty stoked about these, but they're not the best stream interface on their own. A wrapper is needed to solve some problems, and thankfully anything can be async iterable by implementing the `Symbol.asyncIterator` interface. That's the direction I'm hoping to take `@mytosis/streams`. However, the downsides still apply and aren't ideal for memory sensitive under-the-hood stuff.
  - Concurrent consumers break the model. `.next()` calls are queued (which actually makes sense)
  - Stream cancelling isn't a thing that happens automatically. The best way is to call `.return()` and overload the method on instantiation, and I don't have that much faith in people.

- Haskell
  - Good idea

## Docs
Hold up there, this is still a young project. Use RxJS for a while and see if it solves your requirements.

Also I don't feel like writing docs.
