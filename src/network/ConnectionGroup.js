import Emitter from 'eventemitter3';

const connections = Symbol('Connection map');

/**
 * Manages a group of network connections.
 *
 * @class ConnectionGroup
 */
export default class ConnectionGroup extends Emitter {
  [connections] = {};

  /**
   * Retrieves the connection that matches the given ID.
   * @param  {String} key - Connection identifier.
   * @return {Object|null} - The matching connection.
   */
  id (key) {
    return this[connections][key] || null;
  }

  /**
   * Adds a connection to the group.
   * @param  {Object} connection - Network connection.
   * @return {undefined}
   */
  add (connection) {
    this[connections][connection.id] = connection;

    this.emit('add', connection);

    return connection;
  }

  /**
   * Removes a connection from the group.
   * @param  {Object} connection - The connection in question.
   * @return {undefined}
   */
  remove (connection) {
    delete this[connections][connection.id];

    this.emit('remove', connection);

    return connection;
  }

  /**
   * Creates a new list containing only connections satisfying the predicate.
   * @param  {Function} predicate - Returns whether the value should be kept.
   * @return {ConnectionGroup} - The resulting set.
   */
  filter (predicate) {
    const result = new ConnectionGroup();

    // Add matching items.
    for (const connection of this) {
      if (predicate(connection)) {
        result.add(connection);
      }
    }

    return result;
  }

  /**
   * Creates a list of connections of only the given type.
   * @param  {String} type - Connection type (e.g., 'websocket', 'http').
   * @return {ConnectionGroup} - A new list containing only those connections.
   */
  type (type) {
    return this.filter((connection) => (
      connection.type === type
    ));
  }

  /**
   * Broadcasts a message through every connection in the group.
   * @param  {Any} msg - A message to send.
   * @return {undefined}
   */
  send (msg) {
    for (const connection of this) {
      connection.send(msg);
    }
  }

  /**
   * Yields every connection in the group.
   * @return {undefined}
   */
  * [Symbol.iterator] () {
    const group = this[connections];

    for (const id in group) {
      if (group.hasOwnProperty(id)) {
        yield group[id];
      }
    }
  }
}
