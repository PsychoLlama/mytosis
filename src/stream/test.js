/* eslint-env mocha */
import expect, { createSpy } from 'expect';
import Emitter from 'events';

import Stream from './index';

describe('Stream', () => {
  it('returns an object', () => {
    const result = new Stream(() => {});

    expect(result).toBeAn(Object);
  });

  describe('publisher', () => {
    let spy, each;

    beforeEach(() => {
      each = createSpy();
      spy = createSpy();
    });

    it('does not invoke the publisher immediately', () => {
      Stream.create(spy);

      expect(spy).toNotHaveBeenCalled();
    });

    it('invokes the publisher when observed', () => {
      const stream = new Stream(spy);
      stream.forEach(() => {});

      expect(spy).toHaveBeenCalled();
    });

    it('passes a push & complete method', () => {
      const stream = new Stream(spy);
      stream.forEach(() => {});

      const [push, complete] = spy.calls[0].arguments;

      expect(push).toBeA(Function);
      expect(complete).toBeA(Function);
    });

    it('throws if the publisher is not a function', () => {
      const fail = () => new Stream(true);

      expect(fail).toThrow(/function/i);
    });

    it('sends values to all subscribers', () => {
      const msg = {};
      spy.andCall((push) => push(msg));
      const stream = new Stream(spy);
      stream.forEach(each);

      expect(each).toHaveBeenCalled();
      expect(each).toHaveBeenCalledWith(msg, undefined);
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

    it('allows two parameters', () => {
      const stream = new Stream((push) => push(1, 2, 3));
      stream.forEach(spy);

      expect(spy).toHaveBeenCalledWith(1, 2);
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

    it('throws if push is called after completion', () => {
      const stream = new Stream((push, complete) => {
        complete();
        push('this should throw.');
      });

      const forEach = stream.forEach.bind(stream);
      const fail = () => forEach(() => {});

      expect(fail).toThrow(/closed/i);
    });

    it('throws if complete is called twice', () => {
      const stream = new Stream((push, complete) => {
        complete();
        complete();
      });

      const fail = () => stream.forEach(() => {});

      expect(fail).toThrow(/(complete|close)/i);
    });

    it('does not throw if dispose is called after completion', () => {
      const stream = new Stream((push, complete) => complete());
      const subscription = stream.forEach(() => {});

      expect(() => subscription.dispose()).toNotThrow();
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
      expect(each).toHaveBeenCalledWith('hello', undefined);

      push('this is stream');
      expect(each).toHaveBeenCalledWith('this is stream', undefined);
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

  describe('static "fromEvent"', () => {
    let emitter, stream;

    beforeEach(() => {
      emitter = new Emitter();
      stream = Stream.fromEvent(emitter, 'message');
    });

    it('forwards events from the stream', () => {
      const spy = createSpy();
      stream.forEach(spy);
      emitter.emit('message');

      expect(spy).toHaveBeenCalled();
    });

    it('unsubscribes when there are no observers', () => {
      const subscription = stream.forEach(() => {});
      expect(emitter.listenerCount('message')).toBe(1);

      subscription.dispose();
      expect(emitter.listenerCount('message')).toBe(0);
    });

    it('works on DOM-style events', () => {
      emitter.removeEventListener = emitter.removeListener;
      emitter.addEventListener = emitter.on;
      emitter.removeListener = undefined;
      emitter.on = undefined;

      const stream = Stream.fromEvent(emitter, 'disconnect');

      const spy = createSpy();
      stream.forEach(spy).dispose();
    });
  });
});
