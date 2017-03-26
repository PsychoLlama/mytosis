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
   * Reads a value from the node.
   * @param  {String} field - The field to read.
   * @param  {String} [options] - Plugin-level options.
   * @return {Promise} - Resolves to the value or undefined.
   */
  async read (field, options) {

    const config = this.root[database.configuration];
    const params = await pipeline.before.read.field(config, {
      ...options,
      node: this,
      field,
    });

    /** Read from the node. */
    let result = this.value(params.field);

    /** Detect and resolve pointers. */
    if (result instanceof Object) {
      result = await this.root.read(result.edge, params);
    }

    const { value } = await pipeline.after.read.field(config, {
      ...params,
      value: result,
    });

    return value;
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
