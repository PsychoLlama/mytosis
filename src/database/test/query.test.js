/* eslint-env mocha */
import Database from '../../index';
import expect from 'expect';

describe('A database query', () => {

  let db;

  beforeEach(() => {
    db = new Database();
  });

  it('should be a function', () => {
    expect(db.query).toBeA(Function);
  });

  it('should throw if it cannot find query engine', () => {
    const query = () => db.query('string', {
      engine: 'engine',
    });
    expect(query).toThrow(Error);
  });

});
