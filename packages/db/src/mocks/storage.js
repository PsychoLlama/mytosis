/* eslint-disable require-jsdoc */
// @flow
import Stream from '@mytosis/streams';

import type { ReadDescriptor } from '../database-context';

export class MockStorage {
  data: Map<string, Object> = new Map();

  constructor() {
    jest.spyOn(this, 'read');
    jest.spyOn(this, 'write');
  }

  read(read: ReadDescriptor): Stream<?Object> {
    const results = read.keys.map(key => this.data.get(key));

    return Stream.from(results);
  }

  async write(param: Object) {
    return param;
  }
}
