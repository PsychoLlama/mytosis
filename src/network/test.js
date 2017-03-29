/* eslint-disable require-jsdoc */
/* eslint-env mocha */
import expect, { createSpy } from 'expect';

import ConnectionGroup from './ConnectionGroup';

class Connection {
  constructor ({ id, type } = {}) {
    this.type = type;
    this.id = id;
  }

  send () {}
}

describe('ConnectionGroup', () => {
  let list, conn;

  beforeEach(() => {
    list = new ConnectionGroup();
    conn = new Connection({ id: 'conn1' });
  });

  describe('id()', () => {
    it('returns null if no connection is found', () => {
      const result = list.id('no such connection');

      expect(result).toBe(null);
    });

    it('returns the matching connection', () => {
      list.add(conn);
      const result = list.id(conn.id);

      expect(result).toBe(conn);
    });
  });

  describe('add()', () => {
    it('adds the connection', () => {
      list.add(conn);

      expect(list.id(conn.id)).toBe(conn);
    });

    it('emits "add"', () => {
      const spy = createSpy();
      list.on('add', spy);
      list.add(conn);

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith(conn);
    });

    it('returns the connection', () => {
      const result = list.add(conn);

      expect(result).toBe(conn);
    });
  });

  describe('remove()', () => {
    it('removes connections from the group', () => {
      list.add(conn);
      list.remove(conn);

      expect(list.id(conn.id)).toBe(null);
    });

    it('emits "remove"', () => {
      const spy = createSpy();
      list.on('remove', spy);
      list.add(conn);
      list.remove(conn);

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith(conn);
    });

    it('does not explode if the connection does not exist', () => {
      expect(() => list.remove(conn)).toNotThrow();
    });

    it('returns the connection', () => {
      const result = list.remove(conn);

      expect(result).toBe(conn);
    });
  });

  describe('iterator', () => {
    it('yields every connection', () => {
      const conn1 = new Connection({ id: 'conn1' });
      const conn2 = new Connection({ id: 'conn2' });

      list.add(conn1);
      list.add(conn2);

      const results = [...list];
      expect(results).toContain(conn1);
      expect(results).toContain(conn2);
      expect(results.length).toBe(2);
    });
  });

  describe('send()', () => {
    it('sends the message through each member', () => {
      conn.send = createSpy();
      list.add(conn);

      const msg = { isMessage: true };
      list.send(msg);

      expect(conn.send).toHaveBeenCalled();
      expect(conn.send).toHaveBeenCalledWith(msg);
    });
  });

  describe('filter()', () => {
    it('returns a new ConnectionGroup', () => {
      const result = list.filter(() => false);

      expect(result).toBeA(ConnectionGroup);
      expect(result).toNotBe(list);
    });

    it('only contains items that match the terms', () => {
      list.add(conn);
      list.add(new Connection({ id: 'conn2' }));

      const result = list.filter((conn) => conn.id === 'conn1');

      expect([...result].length).toBe(1);
    });
  });

  describe('type()', () => {
    it('returns a new group', () => {
      const result = list.type('connection-type');

      expect(result).toBeA(ConnectionGroup);
      expect(result).toNotBe(list);
    });

    it('returns connections matching the type', () => {
      const conn = new Connection({ id: 'conn1', type: 'websocket' });
      list.add(conn);

      list.add(new Connection({ id: 'conn2', type: 'http' }));
      list.add(new Connection({ id: 'conn3', type: 'http' }));

      const result = list.type('websocket');

      expect([...result]).toContain(conn);
      expect([...result].length).toBe(1);
    });
  });
});
