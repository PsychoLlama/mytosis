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
  });
});
