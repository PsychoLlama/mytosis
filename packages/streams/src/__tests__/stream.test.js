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
});
