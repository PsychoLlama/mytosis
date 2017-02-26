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
  async write (uid, value, options = {}) {
    const config = this[settings];
    const update = new Context(this, { uid });

    update.merge(value);

    let fullState = update;
    const currentState = this.value(uid);

    if (currentState) {
      fullState = update.new();

      fullState.merge(currentState);
      fullState.merge(update);
    }

    const params = await pipeline.before.write(config, {
      ...options,
      graph: Graph.source({ [uid]: fullState }),
    });

    this.merge({ [uid]: update });
    const node = this.value(uid);

    /** Persist the change. */
    for (const store of params.storage) {
      await store.write(params);
    }

    const { context } = await pipeline.after.write(config, {
      ...options,
      context: node,
    });

    return context;
  }

  /**
   * Read a context from the database.
   * @param  {String} key - The node's unique ID.
   * @param  {Object} [options] - Plugin-level options.
   * @return {Context|null} - Resolves to the node.
   */
  async read (key, options = {}) {
    const config = this[settings];

    const params = await pipeline.before.read.node(config, {
      ...options,
      key,
    });

    let node = this.value(params.key);

    /** Not cached. */
    if (node === null) {

      /** Ask the storage plugins for it. */
      for (const store of params.storage) {
        const result = await store.read(params);
        const update = Node.source(result);

        if (result) {
          node = node || new Context(this, { uid: params.key });
          node.merge(update);
        }
      }

      /** Cache the value. */
      if (node) {
        this.merge({ [params.key]: node });
      }

    }

    /** After-read hooks. */
    const result = await pipeline.after.read.node(config, {
      ...params,
      context: node,
    });

    return result.context;
  }

  /**
   * description
   * @param  {Mixed} query - query that is passed to the engine
   * @param  {Object} options - options for executing the query
   * @return {undefined}
   */
  query (query, options) {

    const config = this[settings];
    const engines = config.engines;
    const engine = options.engine;

    // Make sure the engine exists
    if (!engines.hasOwnProperty(engine)) {
      throw new Error('No engine is defined in options');
    }

    const queryEngine = engines[engine];
    return queryEngine.executeQuery(query, this);
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
