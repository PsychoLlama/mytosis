const symbol = {
  isClosed: Symbol('Whether the stream is closed'),
  isOpen: Symbol('Whether the stream is open'),
  callbacks: Symbol('Event callback list'),
  dispose: Symbol('Free stream resources'),
  observe: Symbol('Force the stream open'),
  resolve: Symbol('Completes the stream'),
  openStream: Symbol('Stream publisher'),
  complete: Symbol('Close the stream'),
  handler: Symbol('Stream callback'),
  push: Symbol('Publish a message'),
};

/**
 * References a callback subscription.
 * @class Subscription
 */
class Subscription {

  /**
   * @param  {Stream} stream - Current stream context.
   * @param  {Function} callback - The subscribed function.
   */
  constructor (stream, callback) {
    this[symbol.handler] = callback;
    this.stream = stream;
  }

  /**
   * Unsubscribes the callback.
   * @return {undefined}
   */
  dispose () {
    const { stream } = this;

    // Remove the listener.
    const filtered = this.stream[symbol.callbacks].filter(
      (callback) => callback !== this[symbol.handler],
    );

    stream[symbol.callbacks] = filtered;

    // The last listener unsubscribed.
    if (!filtered.length) {
      stream[symbol.isOpen] = false;

      if (stream[symbol.dispose]) {
        stream[symbol.dispose]();
      }
    }
  }
}

/**
 * Lazy, asynchronous, cacheless streams.
 * @class Stream
 */
export default class Stream {

  /**
   * Constructs a new Stream instance, `new` optional.
   * @param  {Function} publisher - Stream publisher.
   * @return {Stream} - The new stream instance.
   */
  static create (publisher) {
    return new Stream(publisher);
  }

  /**
   * Creates a stream from an event source.
   * @param  {EventEmitter} emitter
   * Really anything that looks like an event emitter.
   * @param  {String} event - The event name.
   * @return {Stream} - An event stream.
   */
  static fromEvent (emitter, event) {
    return new Stream((push) => {
      const add = emitter.on || emitter.addEventListener;
      add.call(emitter, event, push);

      return () => {
        const remove = emitter.removeListener || emitter.removeEventListener;

        remove.call(emitter, event, push);
      };
    });
  }

  /**
   * Resolves when the stream closes.
   * @type {Promise}
   */
  complete = new Promise((res) => {
    this[symbol.resolve] = res;
  });

  /**
   * @param {Function} publisher - Used to generate consumable data.
   */
  constructor (publisher) {
    if (!(publisher instanceof Function)) {
      throw new TypeError(
        `Stream(...) expects a function, was given "${publisher}"`
      );
    }

    this[symbol.openStream] = publisher;
    this[symbol.callbacks] = [];
  }

  /**
   * Subscribes to the event stream.
   * @param  {Function} callback - Invoked for every event.
   * @return {stream} - The current stream.
   */
  forEach (callback) {
    this[symbol.callbacks].push(callback);

    this[symbol.observe]();

    return new Subscription(this, callback);
  }

  /**
   * Pushes a new message.
   * @private
   * @throws {Error} - If given a value after the stream is closed.
   * @param  {any} message - A message in the stream.
   * @param  {any} [sender] - The producer instance.
   * @return {undefined}
   */
  [symbol.push] = (message, sender) => {
    if (this[symbol.isClosed]) {
      throw new Error('Cannot emit values after stream is closed.');
    }

    this[symbol.callbacks].forEach((callback) => {
      callback(message, sender);
    });
  }

  /**
   * Terminates the stream permanently.
   * @private
   * @throws {Error} - If complete is called twice.
   * @return {undefined}
   */
  [symbol.complete] = () => {
    if (this[symbol.isClosed]) {
      throw new Error('Cannot close stream twice.');
    }

    this[symbol.isClosed] = true;
    this[symbol.callbacks] = [];
    this[symbol.resolve]();
  }

  /**
   * Forces the stream open.
   * @private
   * @return {undefined}
   */
  [symbol.observe] () {
    if (this[symbol.isOpen]) {
      return;
    }

    this[symbol.dispose] = this[symbol.openStream](
      this[symbol.push],
      this[symbol.complete],
    );

    this[symbol.isOpen] = true;
  }
}
