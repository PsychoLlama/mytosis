// @flow
import Stream from '../stream';

describe('Stream', () => {
  it('is a function', () => {
    expect(Stream).toEqual(expect.any(Function));
  });

  it('does not immediately invoke the publisher', () => {
    const publisher = jest.fn();
    const stream = new Stream(publisher);

    expect(stream).toEqual(expect.any(Stream));
    expect(publisher).not.toHaveBeenCalled();
  });

  it('invokes the publisher with one observer', () => {
    const publisher = jest.fn();
    const stream = new Stream(publisher);
    stream.forEach(jest.fn());

    expect(publisher).toHaveBeenCalled();
  });

  it('does not open the publisher if already open', () => {
    const publisher = jest.fn();
    const stream = new Stream(publisher);
    stream.forEach(jest.fn());
    stream.forEach(jest.fn());

    expect(publisher).toHaveBeenCalledTimes(1);
  });

  it('notifies subscribers of each new message', () => {
    const msg = { yolo: true };
    const stream = new Stream(push => push(msg));
    const subscriber = jest.fn();
    stream.forEach(subscriber);

    expect(subscriber).toHaveBeenCalledWith(msg);
  });

  it('allows subscribers to unsubscribe', () => {
    const publisher = jest.fn();
    const stream = new Stream(publisher);
    const subscriber = jest.fn();
    const dispose = stream.forEach(subscriber);
    dispose();
    const [push] = publisher.mock.calls[0];
    push({ new: 'message' });

    expect(subscriber).not.toHaveBeenCalled();
  });

  it('only unsubscribes the first subscriber when duplicates exist', () => {
    const publisher = jest.fn();
    const stream = new Stream(publisher);
    const subscriber = jest.fn();
    const dispose = stream.forEach(subscriber);
    stream.forEach(subscriber);
    dispose();
    publisher.mock.calls[0][0]({ yolo: 'battlecry' });

    expect(subscriber).toHaveBeenCalledTimes(1);
  });

  it('closes the stream when the listener unsubscribes', () => {
    const close = jest.fn();
    const stream = new Stream(() => close);
    const dispose = stream.forEach(jest.fn());
    dispose();

    expect(close).toHaveBeenCalled();
  });

  it('does not close the stream if finish listeners exist', () => {
    const close = jest.fn();
    const stream = new Stream(() => close);
    const dispose = stream.forEach(jest.fn());
    stream.onFinish(jest.fn());
    dispose();

    expect(close).not.toHaveBeenCalled();
  });

  it('reopens the stream if eagerly closed', () => {
    const publisher = jest.fn();
    const stream = new Stream(publisher);
    const dispose = stream.forEach(jest.fn());
    dispose();

    stream.forEach(jest.fn());

    expect(publisher).toHaveBeenCalledTimes(2);
  });

  describe('observe()', () => {
    it('returns a function', () => {
      const stream = new Stream(jest.fn());
      const result = stream.observe(jest.fn());

      expect(result).toEqual(expect.any(Function));
    });

    it('opens the stream', () => {
      const publisher = jest.fn();
      const stream = new Stream(publisher);

      expect(publisher).not.toHaveBeenCalled();
      stream.observe(jest.fn());
      expect(publisher).toHaveBeenCalled();
    });

    it('invokes the callback for data events', () => {
      const msg = 'new message';
      const stream = new Stream(push => push(msg));
      const callback = jest.fn();
      stream.observe(callback);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({
        done: false,
        value: msg,
      });
    });

    it('invokes the callback when successfully terminated', () => {
      const stream = new Stream((push, resolve) => resolve(10));
      const callback = jest.fn();
      stream.observe(callback);

      expect(callback).toHaveBeenCalledWith({
        done: true,
        value: 10,
      });
    });

    it('invokes the callback on failed termination', async () => {
      const error = new Error('Testing .observe() rejection handling');
      const stream = new Stream((push, resolve, reject) => reject(error));
      const callback = jest.fn();
      stream.observe(callback);

      expect(callback).toHaveBeenCalledWith({
        done: true,
        error,
      });

      await stream.catch(jest.fn());
    });

    it('does not invoke the callback after unsubscribing', () => {
      const publisher = jest.fn();
      const stream = new Stream(publisher);
      const callback = jest.fn();
      const dispose = stream.observe(callback);
      dispose();
      publisher.mock.calls[0][0]({ new: 'message' });

      expect(callback).not.toHaveBeenCalled();
    });

    it('terminates the stream after unsubscribing', () => {
      const close = jest.fn();
      const stream = new Stream(() => close);
      const dispose = stream.observe(jest.fn());

      expect(close).not.toHaveBeenCalled();
      dispose();
      expect(close).toHaveBeenCalled();
    });

    it('does not close the stream if other listeners exist', () => {
      const close = jest.fn();
      const stream = new Stream(() => close);
      const dispose = stream.observe(jest.fn());
      stream.observe(jest.fn());
      dispose();

      expect(close).not.toHaveBeenCalled();
    });

    it('allows the same function to subscribe twice', () => {
      const publisher = jest.fn();
      const stream = new Stream(publisher);
      const subscriber = jest.fn();
      stream.observe(subscriber);
      stream.observe(subscriber);
      publisher.mock.calls[0][0]({ some: 'message' });

      expect(subscriber).toHaveBeenCalledTimes(2);
    });

    it('does not trigger termination twice', () => {
      const error = new Error('Testing stream resolve AND rejection.');
      const stream = new Stream((push, resolve, reject) => {
        resolve(5);
        resolve(10);
        reject(error);
      });

      const callback = jest.fn();
      stream.observe(callback);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('throws if you unsubscribe twice', () => {
      const stream = new Stream(jest.fn());
      const dispose = stream.observe(jest.fn());
      dispose();

      expect(dispose).toThrow(/listener/i);
    });
  });

  describe('promise interface', () => {
    it('is implemented', () => {
      const stream = new Stream(jest.fn());

      expect(stream.then).toEqual(expect.any(Function));
      expect(stream.catch).toEqual(expect.any(Function));
    });

    it('starts the publisher when observed', () => {
      const publisher = jest.fn();
      const stream = new Stream(publisher);
      stream.then(jest.fn());

      expect(publisher).toHaveBeenCalled();
    });

    it('resolves when the publisher instructs', async () => {
      const result = { resolve: 'value' };
      const stream = new Stream((push, resolve) => resolve(result));

      await expect(stream).resolves.toBe(result);
    });

    it('rejects when the publisher instructs', async () => {
      const error = new Error('Testing stream result rejection');
      const stream = new Stream((push, resolve, reject) => reject(error));

      await expect(stream).rejects.toBe(error);
    });

    it('prevents the stream from eagerly closing with promise observers', () => {
      const close = jest.fn();
      const stream = new Stream(() => close);
      stream.then(jest.fn());
      const dispose = stream.forEach(jest.fn());
      dispose();

      expect(close).not.toHaveBeenCalled();
    });

    it('handles rejection values', async () => {
      const error = new Error('Testing stream rejection (and .catch)');
      const stream = new Stream((push, resolve, reject) => reject(error));

      const handler = jest.fn();
      await stream.catch(handler);

      expect(handler).toHaveBeenCalledWith(error);
    });

    it('closes the stream once terminated', async () => {
      const close = jest.fn();
      const stream = new Stream((push, resolve) => {
        // Hack to test async termination.
        Promise.resolve({}).then(resolve);

        return close;
      });

      await stream;
      expect(close).toHaveBeenCalled();
    });

    it('allows synchronous termination', async () => {
      const close = jest.fn();
      const stream = new Stream((push, resolve) => {
        resolve();

        return close;
      });

      stream.forEach(jest.fn());

      expect(close).toHaveBeenCalled();
      await stream;
    });

    it('throws if a value is emitted after termination', () => {
      const publisher = jest.fn();
      const stream = new Stream(publisher);
      stream.forEach(jest.fn());
      const [push, resolve] = publisher.mock.calls[0];
      resolve();

      expect(push).toThrow(/(closed|terminate|end)/i);
    });

    it('does not activate if a listener is added post-termination', () => {
      const publisher = jest.fn((push, resolve) => resolve());
      const stream = new Stream(publisher);
      const dispose = stream.forEach(jest.fn());
      dispose();

      stream.forEach(jest.fn());

      expect(publisher).toHaveBeenCalledTimes(1);

      // FRAGILE: asserting on implementation details.
      // eslint-disable-next-line no-underscore-dangle
      expect(stream._observers).toHaveLength(0);
    });

    it('terminates the stream on rejection', async () => {
      const close = jest.fn();
      const error = new Error('Testing stream rejection cleanup');
      const stream = new Stream((push, resolve, reject) => {
        reject(error);
        return close;
      });

      await stream.catch(jest.fn());

      expect(close).toHaveBeenCalled();
    });

    it('does not call `close` twice if resolved twice', async () => {
      const close = jest.fn();
      await new Stream((push, resolve) => {
        Promise.resolve().then(() => {
          resolve({});
          resolve({});
        });

        return close;
      });

      expect(close).toHaveBeenCalledTimes(1);
    });
  });

  describe('onFinish()', () => {
    it('returns a function', () => {
      const stream = new Stream(jest.fn());
      const result = stream.onFinish(jest.fn());

      expect(result).toEqual(expect.any(Function));
    });

    it('is invoked when the stream terminates', () => {
      const stream = new Stream((push, resolve) => resolve(5));
      const callback = jest.fn();
      stream.onFinish(callback);

      expect(callback).toHaveBeenCalledWith(null, 5);
    });

    it('invokes callbacks with rejections', async () => {
      const error = new Error('Testing onFinish callback rejections');
      const stream = new Stream((push, resolve, reject) => {
        reject(error);
        reject(error);
      });

      const callback = jest.fn();
      stream.onFinish(callback);

      expect(callback).toHaveBeenCalledWith(error, undefined);
      expect(callback).toHaveBeenCalledTimes(1);

      await stream.catch(jest.fn());
    });

    it('does not invoke after unsubscribing', () => {
      const publisher = jest.fn();
      const stream = new Stream(publisher);

      const callback = jest.fn();
      const dispose = stream.onFinish(callback);
      dispose();
      publisher.mock.calls[0][1]({ resolved: true });

      expect(callback).not.toHaveBeenCalled();
    });

    it('terminates the stream on unsubscribe', () => {
      const close = jest.fn();
      const stream = new Stream(() => close);
      const dispose = stream.onFinish(jest.fn());

      expect(close).not.toHaveBeenCalled();
      dispose();
      expect(close).toHaveBeenCalled();
    });
  });

  describe('map()', () => {
    const setup = (publisher = jest.fn()) => ({
      stream: new Stream(publisher),
      publisher,
    });

    it('creates a new stream', () => {
      const { stream } = setup();
      const result = stream.map(value => value * 2);

      expect(result).toEqual(expect.any(Stream));
      expect(result).not.toBe(stream);
    });

    it('lazily opens the parent stream', () => {
      const { stream, publisher } = setup();
      const result = stream.map(value => value * 2);

      expect(publisher).not.toHaveBeenCalled();
      result.forEach(jest.fn());
      expect(publisher).toHaveBeenCalled();
    });

    it('maps every message to a new value', () => {
      const { stream, publisher } = setup();
      const result = stream.map(value => value * 2);
      const callback = jest.fn();
      result.forEach(callback);
      publisher.mock.calls[0][0](5);

      // Value 5 mapped as n * 2.
      expect(callback).toHaveBeenCalledWith(10);
    });

    it('closes both streams when abandoned', () => {
      const { stream, publisher } = setup();
      const close = jest.fn();
      publisher.mockReturnValue(close);
      const mapped = stream.map(value => value * 2);
      const dispose = mapped.forEach(jest.fn());

      expect(close).not.toHaveBeenCalled();
      dispose();
      expect(close).toHaveBeenCalled();
    });

    it('resolves with the parent stream result', async () => {
      const { stream, publisher } = setup();
      const value = { parent: 'resolve value' };
      publisher.mockImplementation((push, resolve) => resolve(value));
      const mapped = stream.map(value => value * 2);

      await expect(mapped).resolves.toBe(value);
    });
  });

  describe('mapResult', () => {
    const setup = (publisher = jest.fn()) => ({
      stream: new Stream(publisher),
      publisher,
    });

    it('returns a new stream', () => {
      const { stream } = setup();
      const result = stream.mapResult((error, value = 0) => Number(value) * 2);

      expect(result).toEqual(expect.any(Stream));
      expect(result).not.toBe(stream);
    });

    it('forwards data events', () => {
      const { stream, publisher } = setup();
      publisher.mockImplementation(push => push('yolo'));

      const mapped = stream.mapResult(() => null);
      const callback = jest.fn();
      mapped.forEach(callback);

      expect(callback).toHaveBeenCalledWith('yolo');
    });

    it('passes the resolve data to the transformer', async () => {
      const { stream, publisher } = setup();
      publisher.mockImplementation((push, resolve) => resolve('result'));
      const transform = jest.fn();
      const mapped = stream.mapResult(transform);
      mapped.forEach(jest.fn());

      expect(transform).toHaveBeenCalledWith(null, 'result');
    });

    it('uses the return value as a resolve value', async () => {
      const { stream, publisher } = setup();
      publisher.mockImplementation((push, resolve) => resolve());
      const mapped = stream.mapResult(() => 'result');

      await expect(mapped).resolves.toBe('result');
    });

    it('rejects if the transformer throws', async () => {
      const { stream, publisher } = setup();
      const error = new Error('Testing mapResult() error handling');
      publisher.mockImplementation((push, resolve) => resolve());
      const mapped = stream.mapResult(() => {
        throw error;
      });

      await expect(mapped).rejects.toBe(error);
    });

    it('closes both streams when no listeners exist', () => {
      const { stream, publisher } = setup();
      const close = jest.fn();
      publisher.mockReturnValue(close);
      const mapped = stream.mapResult(() => 5);
      const dispose = mapped.forEach(jest.fn());

      expect(close).not.toHaveBeenCalled();
      dispose();
      expect(close).toHaveBeenCalled();
    });
  });

  describe('filter()', () => {
    const setup = (publisher = jest.fn()) => ({
      stream: new Stream(publisher),
      publisher,
    });

    it('returns a new stream', () => {
      const { stream } = setup();
      const mapped = stream.filter(value => value % 2 === 0);

      expect(mapped).toEqual(expect.any(Stream));
      expect(mapped).not.toBe(stream);
    });

    it('filters unwanted values', () => {
      const { stream, publisher } = setup();
      const filtered = stream.filter(value => (value - 1) % 2 === 0);
      const callback = jest.fn();
      filtered.forEach(callback);

      publisher.mock.calls[0][0](1);
      publisher.mock.calls[0][0](2);
      publisher.mock.calls[0][0](3);

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenCalledWith(1);
      expect(callback).toHaveBeenCalledWith(3);
    });

    it('borrows the result from upstream', async () => {
      const { stream, publisher } = setup();
      const filtered = stream.filter(value => Boolean(value));
      filtered.observe(jest.fn());
      const result = { resolved: true };
      publisher.mock.calls[0][1](result);

      await expect(filtered).resolves.toBe(result);
    });

    it('closes both streams when no listeners exist', () => {
      const { stream, publisher } = setup();
      const close = jest.fn();
      publisher.mockReturnValue(close);
      const filtered = stream.filter(() => false);
      const dispose = filtered.observe(jest.fn());

      expect(close).not.toHaveBeenCalled();
      dispose();
      expect(close).toHaveBeenCalled();
    });
  });
});
