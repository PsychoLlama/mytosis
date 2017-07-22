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
  async push ({ online, update }) {
    const rid = uuid();
    const type = messageTypes.WRITE;
    online.send({ update, rid, type });

    await this._waitForRidResponse(rid);
  }

  /**
   * Sends a request for a list of nodes.
   * @param  {Object} read - A read action.
   * @return {Promise<?Object>} - The resulting list of nodes.
   */
  async pull ({ online, nodes }) {
    const rid = uuid();
    const type = messageTypes.READ;
    online.send({ type, nodes, rid });

    const response = await this._waitForRidResponse(rid);

    return response.nodes;
  }

  /**
   * Waits for an acknowledgment matching that request.
   * @private
   * @param  {String} rid - A unique request identifier.
   * @return {Promise<Object>} - Response object.
   */
  _waitForRidResponse (rid) {
    return new Promise((resolve, reject) => {
      this._requests[rid] = (response) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }

        resolve(response);
      };
    });
  }

  /**
   * @private
   * @param  {Object} message - A new network message.
   * @return {undefined}
   */
  _handleIncomingMessage = (message) => {
    if (message.type === messageTypes.ACK) {
      const done = this._requests[message.rid];
      done(message);
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
