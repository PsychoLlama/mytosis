/* eslint-disable babel/new-cap */
/* eslint-env mocha */
import expect, { createSpy } from 'expect';

import Stream from './index';

describe('Stream', () => {
  it('is a function', () => {
    expect(Stream).toBeA(Function);
  });

  it('returns an object', () => {
    const result = new Stream();

    expect(result).toBeAn(Object);
  });

  describe('publisher', () => {
    let spy, each;

    beforeEach(() => {
      each = createSpy();
      spy = createSpy();
    });

    it('does not invoke the publisher immediately', () => {
      Stream(spy);

      expect(spy).toNotHaveBeenCalled();
    });

    it('invokes the publisher when observed', () => {
      const stream = Stream(spy);
      stream.forEach(() => {});

      expect(spy).toHaveBeenCalled();
    });

    it('passes a push & complete method', () => {
      const stream = Stream(spy);
      stream.forEach(() => {});

      const [push, complete] = spy.calls[0].arguments;

      expect(push).toBeA(Function);
      expect(complete).toBeA(Function);
    });

    it('sends values to all subscribers', () => {
      const msg = {};
      spy.andCall((push) => push(msg));
      const stream = Stream(spy);
      stream.forEach(each);

      expect(each).toHaveBeenCalled();
      expect(each).toHaveBeenCalledWith(msg);
    });

    it('does not unnecessarily invoke the publisher', () => {
      const stream = new Stream(spy);
      stream.forEach(() => {});
      stream.forEach(() => {});

      expect(spy.calls.length).toBe(1);
    });

    it('disposes of the stream when all listeners are removed', () => {
      const spy = createSpy();
      const stream = new Stream(() => spy);

      stream.forEach(() => {}).dispose();

      expect(spy).toHaveBeenCalled();
    });

    it('opens the stream again when observed', () => {
      const open = createSpy();
      const stream = new Stream(open);

      stream.forEach(() => {}).dispose();
      expect(open).toHaveBeenCalled();

      open.reset();

      stream.forEach(() => {}).dispose();
      expect(open).toHaveBeenCalled();
    });
  });

  describe('complete', () => {
    it('is a promise', () => {
      const { complete } = new Stream(createSpy());

      expect(complete).toExist();
      expect(complete.then).toBeA(Function);
      expect(complete.catch).toBeA(Function);
    });

    it('completes when asked', () => {
      const stream = new Stream((push, complete) => complete());

      // Force the stream open.
      stream.forEach(() => {});

      // Mocha should not time out.
      return stream.complete;
    });
  });

  describe('forEach()', () => {
    let stream, each, push;

    beforeEach(() => {
      each = createSpy();
      const publisher = createSpy();
      stream = new Stream(publisher);

      publisher.andCall((next) => {
        push = next;
      });
    });

    it('subscribes to real-time events', () => {
      stream.forEach(each);
      expect(each).toNotHaveBeenCalled();

      push('hello');
      expect(each).toHaveBeenCalledWith('hello');

      push('this is stream');
      expect(each).toHaveBeenCalledWith('this is stream');
    });

    it('returns an object', () => {
      const result = stream.forEach(each);

      expect(result).toBeAn(Object);
    });

    it('unsubscribes on demand', () => {
      const result = stream.forEach(each);

      result.dispose();
      push('new event');

      expect(each).toNotHaveBeenCalled();
    });

    it('does not remove other listeners when calling dispose', () => {
      const other = createSpy();
      const result = stream.forEach(each);
      stream.forEach(other);

      result.dispose();
      push('message');

      expect(other).toHaveBeenCalled();
    });
  });
});
