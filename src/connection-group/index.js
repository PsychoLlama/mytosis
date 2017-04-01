import Emitter from 'eventemitter3';

import Stream from '../stream';

const subscriptions = Symbol('Message subscriptions');
const connections = Symbol('Connections');

/**
 * Manages a group of network connections.
 *
 * @class ConnectionGroup
 */
export default class ConnectionGroup extends Emitter {
  [subscriptions] = {};
  [connections] = {};

  messages = new Stream((push) => {

    // Create a subscription.
    const subscribeToConnection = (connection) => {
      const subscription = connection.messages.forEach(push);
      this[subscriptions][connection.id] = subscription;
    };

    // Dispose of the subscription.
    const disposeOfSubscription = (connection) => {
      const subscription = this[subscriptions][connection.id];
      subscription.dispose();
    };

    // Subscribe and forward all message events.
    this.on('add', subscribeToConnection);
    this.on('remove', disposeOfSubscription);
    [...this].forEach(subscribeToConnection);

    // Remove all listeners.
    return () => {
      this.removeListener('add', subscribeToConnection);
      this.removeListener('remove', disposeOfSubscription);

      [...this].forEach(disposeOfSubscription);
    };
  });

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
    const exists = this[connections].hasOwnProperty(connection.id);

    if (!exists) {
      this[connections][connection.id] = connection;
      this.emit('add', connection);
    }

    return connection;
  }

  /**
   * Removes a connection from the group.
   * @param  {Object} connection - The connection in question.
   * @return {undefined}
   */
  remove (connection) {
    const exists = this[connections].hasOwnProperty(connection.id);

    if (exists) {
      delete this[connections][connection.id];
      this.emit('remove', connection);
    }

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
   * Returns whether the connection is contained within the group.
   * @param  {Object} connection - A network plugin.
   * @param  {String} connection.id - The connection's unique identifier.
   * @return {Boolean} - Whether it's contained.
   */
  has (connection) {
    return this[connections].hasOwnProperty(connection.id);
  }

  /**
   * Joins two groups into a new group.
   * @param  {ConnectionGroup} group - Source connections.
   * @return {ConnectionGroup} - The two groups joined together.
   */
  union (group) {
    const result = new ConnectionGroup();
    const addToGroup = result.add.bind(result);

    const removeFromGroup = (connection) => {
      if (!this.has(connection) && !group.has(connection)) {
        result.remove(connection);
      }
    };

    [...group].forEach(addToGroup);
    [...this].forEach(addToGroup);

    group.on('add', addToGroup);
    this.on('add', addToGroup);

    group.on('remove', removeFromGroup);
    this.on('remove', removeFromGroup);

    return result;
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
