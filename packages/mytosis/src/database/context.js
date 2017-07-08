import * as pipeline from '../pipeline';
import { Graph, Node } from 'graph-crdt';
import database from './root';


/**
 * Asynchronous node interface.
 * @class
 */
export default class Context extends Node {

  /**
   * Creates a new context.
   * @param {Object} root - The root database instance.
   * @param {Object} [node] - Node configurations.
   */
  constructor (root, node) {
    super(node);

    this.root = root;

    if (root) {
      const config = root[database.configuration];
      const extend = config.extend.context;
      Object.keys(extend).forEach((key) => {
        const value = extend[key];

        Object.defineProperty(this, key, { value });
      });
    }
  }

  /**
   * Reads a list of fields. Pointers are resolved efficiently using `db.nodes`.
   * @param  {String[]} fieldNames - The fields to read.
   * @param  {Object} [options] - Read options.
   * @return {Promise<Array<*>>} - All the corresponding fields.
   */
  async fields (fieldNames, options = {}) {
    const settings = this.root[database.configuration];
    const config = await pipeline.before.read.fields(settings, {
      ...options,
      fields: fieldNames,
      node: this,
    });

    // Find all the pointers.
    const edges = config.fields.reduce((nodes, field) => {
      const value = this.value(field);

      if (value && typeof value === 'object') {
        nodes[field] = value;
      }

      return nodes;
    }, {});

    // Get the corresponding field names of each pointer.
    const edgeFields = Object.keys(edges);

    // Associative array of node pointers.
    const pointers = edgeFields.map((field) => edges[field].edge);

    // Resolve all the pointers at once, unless there aren't any.
    const results = pointers.length
      ? await this.root.nodes(pointers) : [];

    // Reassemble them into their key/value pairs.
    const nodes = {};
    edgeFields.forEach((field, index) => {
      nodes[field] = results[index];
    });

    // Give the fields back in the order they were requested.
    const fields = config.fields.map((field) => {
      if (edges[field]) {
        return nodes[field];
      }

      return this.value(field);
    });

    const result = await pipeline.after.read.fields(settings, {
      ...config,
      fields,
    });

    return result.fields;
  }

  /**
   * Reads a value from the node.
   * @param  {String} field - The field to read.
   * @param  {String} [options] - Plugin-level options.
   * @return {Promise} - Resolves to the value or undefined.
   */
  async read (field, options) {
    const [result] = await this.fields([field], options);

    return result;
  }

  /**
   * Writes a value to the node.
   * @param  {String} field - Where to write the data.
   * @param  {Mixed} value - A value to write.
   * @return {Promise} - Resolves when the value has written successfully.
   */
  async write (field, value) {

    /** It's a reference. Save as a pointer. */
    if (value instanceof Node) {
      value = { edge: String(value) };
    }

    /** Create a node delta. */
    const delta = this.new();

    /** Bump the state if it exists. */
    if (this.state(field)) {
      delta.merge({ [field]: this.value(field) });
      delta.meta(field).state = this.state(field);
    }

    /** Apply the field update. */
    delta.merge({ [field]: value });

    /** Create a graph delta. */
    const update = Graph.source({
      [this.meta().uid]: delta,
    });

    /** Commit the update. */
    await this.root.commit(update);
  }

  /**
   * Creates a copy of the context.
   * @return {Context} - A new context with the same uid and root.
   */
  new () {
    const config = this.meta();

    return new Context(this.root, config);
  }
}
