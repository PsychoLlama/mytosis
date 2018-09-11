/* eslint-disable no-underscore-dangle */
import assert from 'minimalistic-assert';

const noop = () => {};

// Locates the splice-friendly index of a subscriber in an array.
// .findIndex() is unsupported in IE.
const findObserver = (arr, observer) => {
  let index = arr.length;

  arr.some((record, idx) => {
    const foundSubscriber = record.observer === observer;

    if (foundSubscriber) {
      index = idx;
    }

    return foundSubscriber;
  });

  return index;
};

const defer = () => {
  const deferred = {};

  deferred.promise = new Promise((res, rej) => {
    deferred.resolve = res;
    deferred.reject = rej;
  });

  return deferred;
};

// eslint-disable-next-line valid-jsdoc
/** Creates a lazy pipe-driven event stream (cacheless). */
export default class Stream {
  closed = false;

  /**
   * Generates a stream from an iterable.
   * @param  {Iterable} iterable - Any iterable value.
   * @return {Stream} - A stream containing those values.
   */
  static from(iterable) {
    return new Stream((push, resolve) => {
      for (const value of iterable) {
        push(value);
      }

      resolve();
    });
  }

  /**
   * Combines several streams into a new stream.
   * @param  {Stream[]} streams - Streams to combine.
   * @return {Stream} - A combined stream.
   */
  static union(streams) {
    const results = [];

    return new Stream((push, resolve, reject) => {
      const disposers = streams.map(stream =>
        stream.observe(event => {
          if (!event.done) {
            push(event.value);
            return;
          }

          if (event.error) {
            reject(event.error);
            return;
          }

          results.push(event.value);
          if (results.length === streams.length) {
            resolve(results);
          }
        }),
      );

      return () => disposers.map(dispose => dispose());
    });
  }

  /**
   * @param  {Function} publisher - Responsible for publishing events.
   */
  constructor(publisher) {
    Object.defineProperties(this, {
      _publisher: {
        value: publisher,
        writable: true,
      },
      _open: {
        writable: true,
        value: false,
      },
      _observers: {
        value: [],
      },
      _closeStreamHandler: {
        writable: true,
        value: null,
      },
      _deferredResult: {
        writable: true,
        value: defer(),
      },
      _hasPromiseObservers: {
        writable: true,
        value: false,
      },
    });
  }

  /**
   * Opens the stream if it isn't open already.
   * @private
   * @return {void}
   */
  _openStream() {
    if (this._open || this.closed) {
      return;
    }

    this._open = true;

    const close = this._publisher(
      this._publishMessage,
      this._resolve,
      this._reject,
    );

    if (close) {
      if (this.closed) {
        close();
      } else {
        this._closeStreamHandler = close;
      }
    }
  }

  _resolve = result => {
    this._notifyObservers({
      value: result,
      done: true,
    });

    this._terminateStream();
    this._deferredResult.resolve(result);
  };

  _reject = error => {
    this._notifyObservers({
      done: true,
      error,
    });

    this._terminateStream();
    this._deferredResult.reject(error);
  };

  /**
   * Terminates the stream permanently.
   * @private
   * @return {void}
   */
  _terminateStream() {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this._closeStream();

    // Deconstruct to minimize the risk of memory leaks.
    this._observers.splice(0, this._observers.length);
    this._closeStreamHandler = null;
    this._publisher = noop;
  }

  /**
   * Terminates the stream, but not permanently.
   * @private
   * @return {void}
   */
  _closeStream() {
    // Observing a stream's promise value prevents eager closing.
    if (this._hasPromiseObservers && !this.closed) {
      return;
    }

    this._open = false;

    if (this._closeStreamHandler) {
      this._closeStreamHandler();
    }
  }

  /**
   * Publishes a message to all active subscribers.
   * @private
   * @param  {Object} message - Any message.
   * @return {void}
   */
  _publishMessage = message => {
    assert(!this.closed, `Values can't be emitted after ending a stream.`);

    this._notifyObservers({
      value: message,
      done: false,
    });
  };

  /**
   * Broadcasts a stream event to all observers.
   * @private
   * @param  {StreamEvent} msg - Either a data event or termination event.
   * @return {void}
   */
  _notifyObservers(msg) {
    this._observers.forEach(record => record.observer(msg, record.dispose));
  }

  /**
   * Closes the stream, but only if nobody's watching.
   * @private
   * @return {void}
   */
  _closeIfNoListenersExist() {
    if (!this._observers.length) {
      this._closeStream();
    }
  }

  /**
   * Watches a stream for both data and termination events.
   * @param  {Function} observer - Called for every event.
   * @return {Function} - Invoke to unsubscribe.
   */
  observe(observer) {
    if (this.closed) {
      return noop;
    }

    let handler = noop;
    const dispose = () => {
      const index = findObserver(this._observers, handler);
      this._observers.splice(index, 1);
      this._closeIfNoListenersExist();
    };

    handler = event => observer(event, dispose);
    this._observers.push({ observer: handler, dispose });

    this._openStream();

    return dispose;
  }

  /**
   * Observes stream events.
   * @throws {Error} - If you unsubscribe twice (indicates a memory leak).
   * @param  {Function} subscriber - Stream observer called for every message.
   * @return {Function} - Unsubscribes when called.
   */
  forEach(subscriber) {
    return this.observe(event => {
      if (event.done) {
        return;
      }

      subscriber(event.value);
    });
  }

  /**
   * Invokes the given callback when the stream terminates.
   * @param  {Function} callback - Invoked using node-style params on stream termination.
   * @return {Function} - Unsubscribes when invoked.
   */
  onFinish(callback) {
    return this.observe(event => {
      if (!event.done) {
        return;
      }

      const { error = null, value } = event;
      callback(error, value);
    });
  }

  /**
   * Attaches handlers for when the stream terminates.
   * @param  {Function} successHandler - Receives the result.
   * @param  {Function} errorHandler - Called if the stream terminates unsuccessfully.
   * @return {void}
   */
  then(successHandler, errorHandler) {
    this._hasPromiseObservers = true;
    this._openStream();

    this._deferredResult.promise.then(successHandler, errorHandler);
  }

  /**
   * Handles failed streams.
   * @param  {Function} errorHandler - Called if the stream intentionally rejects.
   * @return {void}
   */
  catch(errorHandler) {
    this.then(undefined, errorHandler);
  }

  /**
   * Outputs a new stream which tracks every event.
   * @return {Stream} - Resolves as an array of every emitted value.
   */
  toArray() {
    const result = [];

    return new Stream((push, resolve) =>
      this.observe(event => {
        if (event.done) {
          resolve(result);
          return;
        }

        push(event.value);
        result.push(event.value);
      }),
    );
  }

  /**
   * Basically Array#map, but for streams.
   * @param  {Function} transform - Applied to every message.
   * @return {Stream} - A new event stream.
   */
  map(transform) {
    return new Stream((push, resolve) =>
      this.observe(event => {
        if (event.done) {
          resolve(event.value);
          return;
        }

        const mapped = transform(event.value);
        push(mapped);
      }),
    );
  }

  /**
   * Creates a stream where the promise return value is mapped to a new value.
   * @param  {Function} transform - Result transformer.
   * @return {Stream} - A new stream. All data is drawn from the parent stream.
   */
  mapResult(transform) {
    return new Stream((push, resolve) =>
      this.observe(event => {
        if (!event.done) {
          return push(event.value);
        }

        const { error = null, value } = event;
        const result = transform(error, value);

        return resolve(result);
      }),
    );
  }

  /**
   * Filters values out of a stream before passing them onward.
   * @param  {Function} predicate - Determines whether to keep the value.
   * @return {Stream} - A new stream missing inadequate values.
   */
  filter(predicate) {
    return new Stream((push, resolve) =>
      this.observe(event => {
        if (event.done) {
          resolve(event.value);
          return;
        }

        if (predicate(event.value)) {
          push(event.value);
        }
      }),
    );
  }

  /**
   * Similar to Array#reduce, except the initial value is required.
   * @param  {Function} reducer - Combines two values into a new one.
   * @param  {Any} initialValue - A value to start with.
   * @return {Stream} - Emits each reduction and resolves with the final result.
   */
  reduce(reducer, initialValue) {
    let lastValue = initialValue;

    return new Stream((push, resolve) =>
      this.observe(event => {
        if (event.done) {
          resolve(lastValue);
          return;
        }

        lastValue = reducer(lastValue, event.value);
        push(lastValue);
      }),
    );
  }

  /**
   * Indicates whether one of the stream values satisfies the predicate.
   * @param  {Function} predicate - Indicates whether the value matches.
   * @return {Stream} - Indicates whether the predicate was satisfied.
   */
  some(predicate) {
    return new Stream((push, resolve) =>
      this.observe((event, dispose) => {
        if (event.done) {
          resolve(false);
          return;
        }

        push(event.value);
        const satisfied = predicate(event.value);

        if (satisfied) {
          resolve(true);
          dispose();
        }
      }),
    );
  }

  /**
   * Truncates the stream at a maximum. Has no resolve value.
   * @param  {Number} amount - A maximum number of elements to use.
   * @return {Stream} a stream containing those values, but without the resolve value.
   */
  take(amount) {
    assert(amount >= 0, `.take expects a positive number, got ${amount}.`);

    // The real question is why.
    if (amount === 0) {
      return Stream.from([]);
    }

    let available = amount;
    return new Stream((push, resolve) =>
      this.observe((event, dispose) => {
        if (event.done) {
          resolve();
          return;
        }

        push(event.value);
        available -= 1;
        if (available <= 0) {
          resolve();
          dispose();
        }
      }),
    );
  }
}
