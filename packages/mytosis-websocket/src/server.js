/* eslint-env node */
import { ConnectionGroup, Stream } from 'mytosis';
import { Server } from 'uws';
import uuid from 'uuid/v4';

/**
 * Asserts an expression is truthy.
 * @param  {Mixed} expr - Any expression.
 * @param  {String} msg - Descriptive error message.
 * @throws {Error} - If the expression is falsy.
 * @return {undefined}
 */
const assert = (expr, msg) => {
  if (!expr) {
    throw new Error(`Mytosis SocketServer: ${msg}`);
  }
};

/**
 * Interface over a websocket connection.
 * @class
 */
class Connection {

  /**
   * @param  {Object} socket - WebSocket instance.
   */
  constructor (socket) {
    this.id = uuid();
    this._socket = socket;

    this.messages = new Stream((push) => {
      const parseMessage = (message) => {
        const data = typeof message === 'string'
          ? JSON.parse(message)
          : Buffer.from(message);

        push(data);
      };

      socket.on('message', parseMessage);

      // Quit if nothing is watching the stream.
      return () => socket.removeListener('message', parseMessage);
    });
  }

  /**
   * Sends a message (without acknowledgement).
   * @param  {Object|Buffer} message - JSON or a binary buffer.
   * @return {undefined}
   */
  send (message) {

    // WebSockets support binary messages.
    const payload = Buffer.isBuffer(message)
      ? message
      : JSON.stringify(message);

    this._socket.send(payload);
  }
}

/**
 * Creates a new socket server.
 * @class
 */
export default class SocketServer extends ConnectionGroup {

  /**
   * @param  {Object} config - Server options.
   * @param  {Number} config.port - A port to listen on.
   */
  constructor (config) {
    super();

    assert(config, `Expected config, got "${config}"`);
    assert(
      typeof config.port === 'number',
      `Invalid config.port value "${config.port}" (expected number)`
    );

    const server = new Server(config);
    server.on('connection', (socket) => {
      const connection = new Connection(socket);

      this.add(connection);

      socket.on('close', () => this.remove(connection));
    });
  }
}
