// @flow
import assert from 'minimalistic-assert';
import Stream from '@mytosis/streams';

import type { Options, Config } from './config-utils';

type ReadDescriptor = Config & {
  keys: string[],
};

/** Low-level plugin interface layer. */
export default class DatabaseContext {
  config: Config;

  /**
   * @param  {Config} config - A database configuration object.
   */
  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Formats a read descriptor.
   * @param  {string[]} keys - Keys to read.
   * @param  {Object} options - How to read them.
   * @return {Object} - Instructions on how to read a set of keys.
   */
  createReadDescriptor(keys: string[], options?: Options): ReadDescriptor {
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
  createReadStream(descriptor: ReadDescriptor): Stream<null> {
    const result = descriptor.keys.map(() => null);

    return Stream.from(result);
  }
}
