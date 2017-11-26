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

const noop = () => {};

// Locates the splice-friendly index of a subscriber in an array.
// .findIndex() is unsupported in IE.
const findSubscriber = (arr: Function[], subscriber: Function) => {
  let index = arr.length;

  arr.some((sub, idx) => {
    const foundSubscriber = sub === subscriber;

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
export default class Stream<Message: Object, Result> {
  _terminationListeners: TerminationCallback<Result>[];
  _closeStreamHandler: CloseStreamHandler;
  _publisher: Publisher<Message, Result>;
  _subscribers: Subscriber<Message>[];
  _deferredResult: Deferred<Result>;
  _hasPromiseObservers: boolean;
  _open: boolean;

  closed: boolean = false;

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
      _subscribers: {
        value: [],
      },
      _terminationListeners: {
        value: [],
      },
      _closeStreamHandler: {
        writable: true,
        value: null,
      },
      _deferredResult: {
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
    this._invokeTerminationCallbacks(null, result);

    this._terminateStream();
    this._deferredResult.resolve(result);
  };

  _reject = (error: Error) => {
    this._invokeTerminationCallbacks(error);

    this._terminateStream();
    this._deferredResult.reject(error);
  };

  /**
   * Invokes every `onFinish` callback.
   * @private
   * @param  {Error}  [error] - An error if the stream terminated unsuccessfully.
   * @param  {Object} [result] - Resolve value.
   * @return {void}
   */
  _invokeTerminationCallbacks(error: ?Error, result: ?Result) {
    this._terminationListeners.forEach(callback => {
      callback(error, result);
    });
  }

  /**
   * Terminates the stream permanently.
   * @private
   * @return {void}
   */
  _terminateStream() {
    this.closed = true;
    this._closeStream();

    // Deconstruct to minimize the risk of memory leaks.
    this._terminationListeners.splice(0, this._terminationListeners.length);
    this._subscribers.splice(0, this._subscribers.length);
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

    this._subscribers.forEach(subscriber => subscriber(message));
  };

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
    if (!this._terminationListeners.length && !this._subscribers.length) {
      this._closeStream();
    }
  }

  /**
   * Observes stream events.
   * @throws {Error} - If you unsubscribe twice (indicates a memory leak).
   * @param  {Function} subscriber - Stream observer called for every message.
   * @return {Function} - Unsubscribes when called.
   */
  forEach(subscriber: Subscriber<Message>): () => void {
    if (this.closed) {
      return noop;
    }

    this._subscribers.push(subscriber);
    this._openStream();

    const dispose = this._createUnsubscribeCallback(() => {
      const index = findSubscriber(this._subscribers, subscriber);
      this._subscribers.splice(index, 1);
      this._closeIfNoListenersExist();
    });

    return dispose;
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
   * Invokes the given callback when the stream terminates.
   * @param  {Function} callback - Invoked using node-style params on stream termination.
   * @return {Function} - Unsubscribes when invoked.
   */
  onFinish(callback: TerminationCallback<Result>) {
    this._terminationListeners.push(callback);
    this._openStream();

    return this._createUnsubscribeCallback(() => {
      const index = findSubscriber(this._terminationListeners, callback);
      this._terminationListeners.splice(index, 1);
      this._closeIfNoListenersExist();
    });
  }
}
