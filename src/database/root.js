import merge from '../merge-configs';
import { Graph, Node } from 'graph-crdt';
import Context from './context';
import * as pipeline from '../pipeline';

const settings = Symbol('database configuration');

/**
 * Plugin manager for graph-crdt.
 * @class Database
 */
class Database extends Graph {

  /**
   * Instantiates a new graph database.
   * @param  {Object} config - A database configuration object.
   */
  constructor (config) {
    super();

    this[settings] = config;

    const extensions = config.extend.root;

    /** Add API extensions from the config. */
    Object.keys(extensions).forEach((key) => {
      const value = extensions[key];

      /** Non-enumerable and immutable. */
      Object.defineProperty(this, key, { value });
    });
  }

  /**
   * Merges a node into the graph.
   * @param  {String} uid - The unique ID of the node.
   * @param  {Object} value - The fields to add/update.
   * @param  {Object} [options] - Override default behavior.
   * @return {Context} - Resolves to the context written.
   */
  async write (uid, value, options) {
    const config = this[settings];
    const update = new Context(this, { uid });

    update.merge(value);

    this.merge({ [uid]: update });

    const node = this.value(uid);

    const [
      graph,
      params,
    ] = await pipeline.before.write(config, [
      Graph.source({ [uid]: node }),
      options,
    ]);

    /** Persist the change. */
    for (const store of params.storage) {
      await store.write(graph, params);
    }

    const [result] = await pipeline.after.write(config, [
      node,
      params,
    ]);

    return result;
  }

  /**
   * Read a context from the database.
   * @param  {String} key - The node's unique ID.
   * @param  {Object} [options] - Plugin-level options.
   * @return {Context|null} - Resolves to the node.
   */
  async read (key, options) {
    const config = this[settings];

    const [
      uid,
      params,
    ] = await pipeline.before.read.node(config, [
      key,
      options,
    ]);

    let node = this.value(uid);

    /** Not cached. */
    if (node === null) {

      /** Ask the storage plugins for it. */
      for (const store of params.storage) {
        const result = await store.read(uid, params);
        const update = Node.source(result);

        if (result) {
          node = node || new Context(this, { uid });
          node.merge(update);
        }
      }

      /** Cache the value. */
      if (node) {
        this.merge({ [uid]: node });
      }

    }

    /** After-read hooks. */
    const [
      result,
    ] = await pipeline.after.read.node(config, [
      node,
      params,
    ]);

    return result;
  }

  /**
   * description
   * @return {undefined}
   */
  query () {
    throw new Error();
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

export default database;
