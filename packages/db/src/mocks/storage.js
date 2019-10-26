/* eslint-disable require-jsdoc */
/* eslint-env jest */
import Stream from '@mytosis/streams';

export default class MockStorage {
  constructor() {
    jest.spyOn(this, 'read');
    jest.spyOn(this, 'write');
  }

  read(read) {
    const results = read.keys.map(key => ({
      source: this,
      value: null,
      type: null,
      id: key,
    }));

    return Stream.from(results);
  }

  async write() {}
}
