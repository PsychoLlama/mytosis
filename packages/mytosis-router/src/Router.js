import uuid from 'uuid/v4';

const routes = Symbol('Route definitions');
const db = Symbol('Mytosis instance');

export const messageTypes = {
  WRITE: 'write',
  READ: 'read',
  ACK: 'ack',
};

/**
 * Routes incoming messages and dispatches reads and writes.
 * @private
 * @class
 */
class NetworkInterface {
  _requests = {};

  /**
   * @param  {Object} setup - Interface config.
   * @param  {Database} database - Mytosis instance.
   * @param  {Object} handlers - Route handlers.
   */
  constructor ({ database, handlers, config }) {
    this[routes] = handlers;
    this[db] = database;

    config.network.messages.forEach(this._handleIncomingMessage);
  }

  /**
   * Pushes a graph update.
   * @param  {Object} write - A write action.
   * @return {Promise} - Resolves when the write succeeds.
   */
  push () {}

  /**
   * Sends a request for a list of nodes.
   * @param  {Object} read - A read action.
   * @return {Promise<?Object>} - The resulting list of nodes.
   */
  async pull ({ online, nodes }) {
    const rid = uuid();

    const type = messageTypes.READ;
    online.send({ type, nodes, rid });

    return this._waitForRidResponse(rid);
  }

  /**
   * Waits for an acknowledgment matching that request.
   * @private
   * @param  {String} rid - A unique request identifier.
   * @return {Promise<Object>} - Response object.
   */
  _waitForRidResponse (rid) {
    return new Promise((resolve, reject) => {
      this._requests[rid] = { resolve, reject };
    });
  }

  /**
   * @private
   * @param  {Object} message - A new network message.
   * @return {undefined}
   */
  _handleIncomingMessage = (message) => {
    if (message.type === messageTypes.ACK) {
      const { resolve, reject } = this._requests[message.rid];

      if (message.error) {
        reject(new Error(message.error));
        return;
      }

      resolve(message.nodes);
    }
  }
}

/**
 * Handles reads and writes over the network.
 * @class
 */
export default class Router {

  /**
   * Mounts the router onto a database.
   * @param  {Database} db - Mytosis instance.
   * @param  {Object} config - Database configuration.
   * @return {NetworkInterface} - Push/pull routing coordinator.
   * @example
   * const router = new Router()
   * const db = database({
   *   router: router.register
   * })
   */
  register (db, config) {
    return new NetworkInterface({
      handlers: this[routes],
      config,
      db,
    });
  }
}
