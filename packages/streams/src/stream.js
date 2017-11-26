// @flow
import assert from 'minimalistic-assert';

type PublishMessage<Message> = Message => void;
type CloseStreamHandler = ?() => void;
type Publisher<Message> = (PublishMessage<Message>) => CloseStreamHandler;
type Subscriber<Message> = Message => any;

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

// eslint-disable-next-line valid-jsdoc
/** Creates a lazy pipe-driven event stream (cacheless). */
export default class Stream<Message: Object> {
  _closeStreamHandler: CloseStreamHandler;
  _subscribers: Subscriber<Message>[];
  _publisher: Publisher<Message>;
  _open: boolean;

  /**
   * @param  {Function} publisher - Responsible for publishing events.
   */
  constructor(publisher: Publisher<Message>) {
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
    const close = this._publisher(this._publishMessage);

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
}
