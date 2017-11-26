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

  it('allows the same function to subscribe twice', () => {
    const publisher = jest.fn();
    const stream = new Stream(publisher);
    const subscriber = jest.fn();
    stream.forEach(subscriber);
    stream.forEach(subscriber);
    publisher.mock.calls[0][0]({ some: 'message' });

    expect(subscriber).toHaveBeenCalledTimes(2);
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

  it('throws if you unsubscribe twice', () => {
    const stream = new Stream(jest.fn());
    const dispose = stream.forEach(jest.fn());
    dispose();

    expect(dispose).toThrow(/listener/i);
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
      expect(stream._subscribers).toHaveLength(0);
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

  describe('onFinish', () => {
    it('returns a function', () => {
      const stream = new Stream(jest.fn());
      const result = stream.onFinish(jest.fn());

      expect(result).toEqual(expect.any(Function));
    });

    it('opens the stream', () => {
      const publisher = jest.fn();
      const stream = new Stream(publisher);
      stream.onFinish(jest.fn());

      expect(publisher).toHaveBeenCalled();
    });

    it('is invoked when the stream terminates', () => {
      const stream = new Stream((push, resolve) => resolve(5));
      const callback = jest.fn();
      stream.onFinish(callback);

      expect(callback).toHaveBeenCalledWith(null, 5);
    });

    it('does not invoke callbacks twice', () => {
      const stream = new Stream((push, resolve) => {
        resolve(5);
        resolve(10);
      });

      const callback = jest.fn();
      stream.onFinish(callback);

      expect(callback).toHaveBeenCalledTimes(1);
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

    it('does not terminate the stream if other finish handlers exist', () => {
      const close = jest.fn();
      const stream = new Stream(() => close);
      const dispose = stream.onFinish(jest.fn());
      stream.onFinish(jest.fn());

      dispose();
      expect(close).not.toHaveBeenCalled();
    });

    it('does not terminate the stream if other message handlers exist', () => {
      const close = jest.fn();
      const stream = new Stream(() => close);
      const dispose = stream.onFinish(jest.fn());
      stream.forEach(jest.fn());

      dispose();
      expect(close).not.toHaveBeenCalled();
    });
  });
});
