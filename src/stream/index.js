const symbol = {
  isOpen: Symbol('Whether the stream is open'),
  callbacks: Symbol('Event callback list'),
  dispose: Symbol('Free stream resources'),
  observe: Symbol('Force the stream open'),
  resolve: Symbol('Completes the stream'),
  openStream: Symbol('Stream publisher'),
  complete: Symbol('Closes the stream'),
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
      emitter.on(event, push);

      return () => emitter.removeListener(event, push);
    });
  }

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
   * @param  {any} msg - A message in the stream.
   * @return {undefined}
   */
  [symbol.push] = (msg) => {
    this[symbol.callbacks].forEach((callback) => callback(msg));
  }

  /**
   * Terminates the stream permanently.
   * @return {undefined}
   */
  [symbol.complete] = () => {
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
