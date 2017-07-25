/* eslint-disable require-jsdoc */
import expect, { createSpy } from 'expect';

import { Connection } from '../mocks';
import ConnectionGroup from './index';
import Stream from '../stream';

describe('ConnectionGroup', () => {
  let group, conn;

  beforeEach(() => {
    group = new ConnectionGroup();
    conn = new Connection({ id: 'conn1' });
  });

  describe('static "ensure" method', () => {
    it('returns the value if it is a connection group', () => {
      const result = ConnectionGroup.ensure(group);

      expect(result).toBe(group);
    });

    it('wraps connections into a connection group', () => {
      const result = ConnectionGroup.ensure(conn);

      expect(result).toBeA(ConnectionGroup);
      expect([...result]).toContain(conn);
    });
  });

  describe('id()', () => {
    it('returns null if no connection is found', () => {
      const result = group.id('no such connection');

      expect(result).toBe(null);
    });

    it('returns the matching connection', () => {
      group.add(conn);
      const result = group.id(conn.id);

      expect(result).toBe(conn);
    });
  });

  describe('add()', () => {
    it('adds the connection', () => {
      group.add(conn);

      expect(group.id(conn.id)).toBe(conn);
    });

    it('emits "add"', () => {
      const spy = createSpy();
      group.on('add', spy);
      group.add(conn);

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith(conn);
    });

    it('does not emit "add" if already contained', () => {
      const spy = createSpy();
      group.on('add', spy);

      group.add(conn);
      group.add(conn);

      expect(spy.calls.length).toBe(1);
    });

    it('returns the connection', () => {
      const result = group.add(conn);

      expect(result).toBe(conn);
    });
  });

  describe('remove()', () => {
    it('removes connections from the group', () => {
      group.add(conn);
      group.remove(conn);

      expect(group.id(conn.id)).toBe(null);
    });

    it('emits "remove"', () => {
      const spy = createSpy();
      group.on('remove', spy);
      group.add(conn);
      group.remove(conn);

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith(conn);
    });

    it('does not emit "remove" twice', () => {
      const spy = createSpy();

      group.on('remove', spy);
      group.add(conn);
      group.remove(conn);
      group.remove(conn);

      expect(spy.calls.length).toBe(1);
    });

    it('does not explode if the connection does not exist', () => {
      expect(() => group.remove(conn)).toNotThrow();
    });

    it('returns the connection', () => {
      const result = group.remove(conn);

      expect(result).toBe(conn);
    });
  });

  describe('has()', () => {
    it('returns true if the connection is contained', () => {
      const group = new ConnectionGroup();
      group.add(conn);
      const isContained = group.has(conn);

      expect(isContained).toBe(true);
    });

    it('returns false if there is no such connection', () => {
      const group = new ConnectionGroup();
      const isContained = group.has(conn);

      expect(isContained).toBe(false);
    });

    it('ignores inherited properties', () => {
      const conn = new Connection({ id: 'toString' });
      const group = new ConnectionGroup();
      const isContained = group.has(conn);

      expect(isContained).toBe(false);
    });
  });

  describe('iterator', () => {
    it('yields every connection', () => {
      const conn1 = new Connection({ id: 'conn1' });
      const conn2 = new Connection({ id: 'conn2' });

      group.add(conn1);
      group.add(conn2);

      const results = [...group];
      expect(results).toContain(conn1);
      expect(results).toContain(conn2);
      expect(results.length).toBe(2);
    });
  });

  describe('send()', () => {
    it('sends the message through each member', () => {
      conn.send = createSpy();
      group.add(conn);

      const msg = { isMessage: true };
      group.send(msg);

      expect(conn.send).toHaveBeenCalled();
      expect(conn.send).toHaveBeenCalledWith(msg);
    });
  });

  describe('filter()', () => {
    it('returns a new ConnectionGroup', () => {
      const result = group.filter(() => false);

      expect(result).toBeA(ConnectionGroup);
      expect(result).toNotBe(group);
    });

    it('only contains items that match the terms', () => {
      group.add(conn);
      group.add(new Connection({ id: 'conn2' }));

      const result = group.filter(conn => conn.id === 'conn1');

      expect([...result].length).toBe(1);
    });
  });

  describe('type()', () => {
    it('returns a new group', () => {
      const result = group.type('connection-type');

      expect(result).toBeA(ConnectionGroup);
      expect(result).toNotBe(group);
    });

    it('returns connections matching the type', () => {
      const conn = new Connection({ id: 'conn1', type: 'websocket' });
      group.add(conn);

      group.add(new Connection({ id: 'conn2', type: 'http' }));
      group.add(new Connection({ id: 'conn3', type: 'http' }));

      const result = group.type('websocket');

      expect([...result]).toContain(conn);
      expect([...result].length).toBe(1);
    });
  });

  describe('messages stream', () => {
    let spy;

    beforeEach(() => {
      spy = createSpy();
      group.add(conn);
    });

    it('is a stream', () => {
      expect(group.messages).toBeA(Stream);
    });

    it('reports every message in the group', () => {
      group.messages.forEach(spy);
      conn.push('hello');

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith('hello', conn);
    });

    it('reports messages from connections added later', () => {
      const conn = new Connection({ id: 'conn2' });
      group.messages.forEach(spy);
      group.add(conn);
      conn.push('message');

      expect(spy).toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith('message', conn);
    });

    it('does not report messages from removed connections', () => {
      group.messages.forEach(spy);
      group.remove(conn);
      conn.push('message');

      expect(spy).toNotHaveBeenCalled();
    });

    it('does not report messages from added, then removed connections', () => {
      const conn = new Connection({ id: 'conn2' });
      group.messages.forEach(spy);
      group.add(conn);
      group.remove(conn);
      conn.push('message');

      expect(spy).toNotHaveBeenCalled();
    });

    it('disposes of each subscription when dispose is called', () => {
      const dispose = createSpy();
      conn.messages.forEach = createSpy().andReturn({ dispose });

      group.add(conn);
      group.messages.forEach(spy).dispose();

      expect(dispose).toHaveBeenCalled();
    });

    it('unsubscribes on dispose', () => {
      group.messages.forEach(() => {}).dispose();

      expect(group.listeners('add')).toEqual([]);
      expect(group.listeners('remove')).toEqual([]);
    });
  });

  describe('"union" method', () => {
    let group1, group2, conn1, conn2;

    beforeEach(() => {
      group1 = new ConnectionGroup();
      group2 = new ConnectionGroup();

      conn1 = new Connection({ id: 'conn1' });
      conn2 = new Connection({ id: 'conn2' });
    });

    it('creates a new group', () => {
      const group = group1.union(group2);

      expect(group).toBeA(ConnectionGroup);
      expect(group).toNotBe(group1);
      expect(group).toNotBe(group2);
    });

    it('adds every item in both source groups', () => {
      group1.add(conn1);
      group2.add(conn2);

      const group = group1.union(group2);

      expect([...group]).toContain(conn1);
      expect([...group]).toContain(conn2);
    });

    it('adds connections as they arive', () => {
      const group = group1.union(group2);

      group1.add(conn1);
      group2.add(conn2);

      expect([...group]).toContain(conn1);
      expect([...group]).toContain(conn2);
    });

    it('removes a connection if neither group has it', () => {
      group1.add(conn1);
      group2.add(conn1);

      group2.add(conn2);

      const group = group1.union(group2);

      group1.remove(conn1);
      group2.remove(conn2);

      expect([...group]).toContain(conn1);
      expect([...group]).toNotContain(conn2);
    });
  });
});
