// @flow
import assert from 'minimalistic-assert';

type PublishMessage<Message> = Message => void;
type CloseStreamHandler = ?() => void;
type Subscriber<Message> = Message => any;
type Publisher<Message, Result> = (
  PublishMessage<Message>,
  (Result) => any,
  (Error) => any,
) => CloseStreamHandler;

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
export default class Stream<Message: Object, Result: Object> {
  _closeStreamHandler: CloseStreamHandler;
  _publisher: Publisher<Message, Result>;
  _subscribers: Subscriber<Message>[];
  _deferredResult: Deferred<Result>;
  _hasPromiseObservers: boolean;
  _promise: Promise<Result>;
  _open: boolean;

  /**
   * @param  {Function} publisher - Responsible for publishing events.
   */
  constructor(publisher: Publisher<Message, Result>) {
    const deferred: Deferred<Result> = defer();

    Object.defineProperties(this, {
      _publisher: {
        value: publisher,
      },
      _open: {
        writable: true,
        value: false,
      },
      _subscribers: {
        value: [],
      },
      _closeStreamHandler: {
        writable: true,
        value: null,
      },
      _deferredResult: {
        value: deferred,
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
    if (this._open) {
      return;
    }

    this._open = true;
    const { resolve, reject } = this._deferredResult;

    const close = this._publisher(this._publishMessage, resolve, reject);

    if (close) {
      this._closeStreamHandler = close;
    }
  }

  /**
   * Terminates the stream, but not permanently.
   * @private
   * @return {void}
   */
  _closeStream() {
    // Observing a stream's promise value prevents eager closing.
    if (this._hasPromiseObservers) {
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
    this._subscribers.forEach(subscriber => subscriber(message));
  };

  /**
   * Observes stream events.
   * @throws {Error} - If you unsubscribe twice (indicates a memory leak).
   * @param  {Function} subscriber - Stream observer called for every message.
   * @return {Function} - Unsubscribes when called.
   */
  forEach(subscriber: Subscriber<Message>): () => void {
    this._subscribers.push(subscriber);
    this._openStream();

    let unsubscribed;
    const dispose = () => {
      assert(
        !unsubscribed,
        `Listener had already been removed. dispose() should only be called once.`,
      );

      unsubscribed = true;
      const index = findSubscriber(this._subscribers, subscriber);
      this._subscribers.splice(index, 1);

      if (!this._subscribers.length) {
        this._closeStream();
      }
    };

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
}
