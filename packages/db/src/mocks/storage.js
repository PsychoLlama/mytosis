/* eslint-disable require-jsdoc */
//
import Stream from '@mytosis/streams';

export class MockStorage {
  data = new Map();

  constructor() {
    jest.spyOn(this, 'read');
    jest.spyOn(this, 'write');
  }

  read(read) {
    const results = read.keys.map(key => this.data.get(key));

    return Stream.from(results);
  }

  async write(param) {
    return param;
  }
}
