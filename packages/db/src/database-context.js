// @flow
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
    return {
      ...this.config,
      ...options,
      keys,
    };
  }
}
