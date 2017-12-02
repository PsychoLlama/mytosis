import assert from 'minimalistic-assert';
import Stream from '@mytosis/streams';

/** Low-level plugin interface layer. */
export default class DatabaseContext {
  /**
   * @param  {Config} config - A database configuration object.
   */
  constructor(config) {
    this.config = config;
  }

  /**
   * Formats a read descriptor.
   * @param  {string[]} keys - Keys to read.
   * @param  {Object} options - How to read them.
   * @return {Object} - Instructions on how to read a set of keys.
   */
  createReadDescriptor(keys, options) {
    assert(keys.length, 'A list of keys is required, but this one is empty.');

    return {
      ...this.config,
      ...options,
      keys,
    };
  }

  /**
   * Opens a read stream from the given plugin set.
   * @param  {ReadDescriptor} descriptor - Parameters describing the read.
   * @return {Stream} - Outputs every node as it finds it.
   */
  createReadStream(descriptor) {
    const result = descriptor.keys.map(() => null);

    if (descriptor.storage) {
      descriptor.storage.read(descriptor).map(node => {
        if (!node) {
          return null;
        }

        const { type, id, data } = node;
        return type.context.import({ type, id, data, context: this });
      });
    }

    return Stream.from(result);
  }
}
