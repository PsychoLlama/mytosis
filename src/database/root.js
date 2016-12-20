import merge from '../merge-configs';
import { Graph } from 'graph-crdt';
import Context from './context';

const settings = Symbol('database configuration');
const data = Symbol('database graph');

/**
 * Plugin manager for graph-crdt.
 * @class
 */
export default function database (...configs) {
  return {
    [settings]: merge(configs),
    [data]: new Graph(),

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
      graph.add(node);

      return node;
    },

    /**
     * Read a context from the database.
     * @param  {String} uid - The node's unique ID.
     * @return {Context|undefined} - Resolves to the node.
     */
    async read (uid) {
      const graph = this[data];
      return graph.read(uid);
    },
  };
}

database.configuration = settings;
database.graph = data;
