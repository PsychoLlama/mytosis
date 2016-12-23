import { Node } from 'graph-crdt';
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
   * @return {Promise} - Resolves to the value or undefined.
   */
  async read (field) {

    /** Read from the node. */
    const result = this.value(field);

    /** Detect and resolve pointers. */
    if (result instanceof Object) {
      return this.root.read(result.edge);
    }

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

    const { uid } = this.meta();

    /** Merge the value. */
    await this.root.write(uid, { [field]: value });
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
