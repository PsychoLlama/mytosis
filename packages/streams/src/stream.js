/* eslint-disable no-underscore-dangle */
// @flow
import assert from 'minimalistic-assert';

type PublishMessage<Message> = Message => void;
type CloseStreamHandler = ?() => void;
type Subscriber<Message> = Message => any;
type ResolveStream<Result> = Result => void;
type TerminationCallback<Result> = (?Error, ?Result) => any;
type Publisher<Message, Result> = (
  PublishMessage<Message>,
  ResolveStream<Result>,
  (Error) => any,
) => CloseStreamHandler;

type StreamDataEvent<Data> = {
  done: false,
  value: Data,
};

type StreamTerminationEvent<Result> = {
  done: true,
  value?: Result,
  error?: Error,
};

type StreamEvent<Data, Result> =
  | StreamDataEvent<Data>
  | StreamTerminationEvent<Result>;

type Dispose = () => void;
type ResultTranformer<Result, Output> = (?Error, data?: Result) => Output;
type Observer<Data, Result> = (StreamEvent<Data, Result>, Dispose) => any;
type ObserverRecord<Data, Result> = {
  observer: Observer<Data, Result>,
  dispose: Dispose,
};

const noop = () => {};

// Locates the splice-friendly index of a subscriber in an array.
// .findIndex() is unsupported in IE.
const findObserver = <Data, Result>(
  arr: ObserverRecord<Data, Result>[],
  observer: Observer<Data, Result>,
) => {
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

type Deferred<Result> = {
  resolve: Result => any,
  reject: Error => any,
  promise: Promise<Result>,
};

// Creates an externally managed promise. Be warned, Flow is pretty
// upset about this function. Avoid changing it.
const defer = (deferred: Object = {}) => {
  deferred.promise = new Promise((res, rej) => {
    deferred.resolve = res;
    deferred.reject = rej;
  });

  return deferred;
};

// eslint-disable-next-line valid-jsdoc
/** Creates a lazy pipe-driven event stream (cacheless). */
export default class Stream<Message, Result = void> {
  _closeStreamHandler: CloseStreamHandler;
  _observers: ObserverRecord<Message, Result>[];
  _publisher: Publisher<Message, Result>;
  _deferredResult: Deferred<Result>;
  _hasPromiseObservers: boolean;
  _open: boolean;

  closed: boolean = false;

  /**
   * Generates a stream from an iterable.
   * @param  {Iterable} iterable - Any iterable value.
   * @return {Stream} - A stream containing those values.
   */
  static from<Type>(iterable: Iterable<Type>): Stream<Type> {
    return new Stream((push, resolve) => {
      for (const value of iterable) {
        push(value);
      }

      resolve();
    });
  }

  /**
   * @param  {Function} publisher - Responsible for publishing events.
   */
  constructor(publisher: Publisher<Message, Result>) {
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

  _resolve: ResolveStream<Result> = (result: Result) => {
    this._notifyObservers({
      value: result,
      done: true,
    });

    this._terminateStream();
    this._deferredResult.resolve(result);
  };

  _reject = (error: Error) => {
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
  _publishMessage: PublishMessage<Message> = (message: Message) => {
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
  _notifyObservers(msg: StreamEvent<Message, Result>) {
    this._observers.forEach(record => record.observer(msg, record.dispose));
  }

  /**
   * Ensures the given function is never invoked more than once.
   * @throws {Error} - If invoked more than once.
   * @param  {Function} fn - Unsubscribe handler.
   * @return {Function} - Invoked at most once.
   * @private
   */
  _createUnsubscribeCallback(fn: Function) {
    let unsubscribed = false;

    return () => {
      assert(
        !unsubscribed,
        `Listener had already been removed. dispose() should only be called once.`,
      );

      unsubscribed = true;
      fn();
    };
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
  observe(observer: Observer<Message, Result>): Dispose {
    if (this.closed) {
      return noop;
    }

    let handler = noop;
    const dispose = this._createUnsubscribeCallback(() => {
      const index = findObserver(this._observers, handler);
      this._observers.splice(index, 1);
      this._closeIfNoListenersExist();
    });

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
  forEach(subscriber: Subscriber<Message>) {
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
  onFinish(callback: TerminationCallback<Result>) {
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
  then(successHandler?: Result => any, errorHandler?: Error => any) {
    this._hasPromiseObservers = true;
    this._openStream();

    this._deferredResult.promise.then(successHandler, errorHandler);
  }

  /**
   * Handles failed streams.
   * @param  {Function} errorHandler - Called if the stream intentionally rejects.
   * @return {void}
   */
  catch(errorHandler: Error => any) {
    this.then(undefined, errorHandler);
  }

  /**
   * Outputs a new stream which tracks every event.
   * @return {Stream} - Resolves as an array of every emitted value.
   */
  toArray(): Stream<Message, Message[]> {
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
  map<Output>(transform: Message => Output): Stream<Output, Result> {
    const stream = new Stream(push =>
      this.forEach(message => {
        const mapped = transform(message);
        push(mapped);
      }),
    );

    // Stream maps cannot affect the promise. Sharing here is safe.
    stream._deferredResult = this._deferredResult;

    return stream;
  }

  /**
   * Creates a stream where the promise return value is mapped to a new value.
   * @param  {Function} transform - Result transformer.
   * @return {Stream} - A new stream. All data is drawn from the parent stream.
   */
  mapResult<Output>(
    transform: ResultTranformer<Result, Output>,
  ): Stream<Message, Output> {
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
  filter(predicate: Message => boolean): Stream<Message, Result> {
    const stream = new Stream(push =>
      this.observe(event => {
        if (!event.done && predicate(event.value)) {
          push(event.value);
        }
      }),
    );

    // Stream maps cannot affect the promise. Sharing here is safe.
    stream._deferredResult = this._deferredResult;

    return stream;
  }

  /**
   * Similar to Array#reduce, except the initial value is required.
   * @param  {Function} reducer - Combines two values into a new one.
   * @param  {Any} initialValue - A value to start with.
   * @return {Stream} - Emits each reduction and resolves with the final result.
   */
  reduce<Result>(
    reducer: (Result, Message) => Result,
    initialValue: Result,
  ): Stream<Result, Result> {
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
  some(predicate: Message => boolean): Stream<Message, boolean> {
    let terminated = false;

    return new Stream((push, resolve) => {
      const dispose = this.observe((event, dispose) => {
        if (event.done) {
          resolve(false);
          return;
        }

        push(event.value);
        const satisfied = predicate(event.value);

        if (satisfied) {
          resolve(true);

          // Early termination prevents synchronous producers
          // from calling this observer multiple times after unsubscribing.
          terminated = true;
          dispose();
        }
      });

      return () => {
        if (!terminated) {
          dispose();
        }
      };
    });
  }
}
