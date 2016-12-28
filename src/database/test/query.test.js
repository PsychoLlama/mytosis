/* eslint-env mocha */
import Database from '../../index';
import expect, { spyOn } from 'expect';
import { queryEngine } from './mocks';

describe('A database query', () => {

  let db;
  let executeQuery;

  beforeEach(() => {
    db = new Database({
      engines: {
        sql: queryEngine,
      },
    });
    executeQuery = spyOn(queryEngine, 'executeQuery');
  });
  afterEach(() => {
    executeQuery.restore();
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

  it('should call the correct query engine', () => {
    const query = 'query';
    const options = {
      engine: 'sql',
    };
    db.query(query, options);
    expect(executeQuery).toHaveBeenCalledWith(query, db);
  });

  it('should return correct value', () => {

    executeQuery.andReturn('cheese');

    const result = db.query(['users'], {
      engine: 'sql',
    });
    expect(result).toEqual('cheese');
  });


});
