import { Node } from 'graph-crdt';

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
  }

  /**
   * Reads a value from the node.
   * @param  {String} field - The field to read.
   * @return {Promise} - Resolves to the value or undefined.
   */
  async read (field) {

    /** Read from the node. */
    const result = super.value(field);

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

    /** Merge the value. */
    this.merge({ [field]: value });
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
