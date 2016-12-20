import merge from '../merge-configs';
import { Graph } from 'graph-crdt';
import Context from './context';

const settings = Symbol('database configuration');
const data = Symbol('database graph');

/**
 * Plugin manager for graph-crdt.
 * @class Database
 */
class Database {

  /**
   * Instantiates a new graph database.
   * @param  {Object} config - A database configuration object.
   */
  constructor (config) {
    this[settings] = config;
    this[data] = new Graph();
  }

  /**
   * Merges a node into the graph.
   * @param  {String} uid - The unique ID of the node.
   * @param  {Object} value - The fields to add/update.
   * @return {Context} - Resolves to the context written.
   */
  async write (uid, value) {
    const graph = this[data];
    const node = new Context(this, { uid });

    node.merge(value);
    graph.merge({ [node]: node });

    return node;
  }

  /**
   * Read a context from the database.
   * @param  {String} uid - The node's unique ID.
   * @return {Context|undefined} - Resolves to the node.
   */
  async read (uid) {
    const graph = this[data];
    return graph.read(uid);
  }
}

/**
 * Creates a new instance of `Database` with or without `new`.
 * @param  {...Object} configs - Plugins and configurations for the database.
 * @return {Database} - A new database instance.
 */
function database (...configs) {
  const config = merge(configs);

  return new Database(config);
}

database.configuration = settings;
database.graph = data;

export default database;
