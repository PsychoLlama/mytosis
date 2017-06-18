/* eslint-env node */
import ReconnectionSocket from 'reconnecting-websocket';
import { Stream } from 'mytosis';
import Emitter from 'events';

import Socket from '../client';

jest.mock('reconnecting-websocket', () => jest.fn());

describe('Mytosis websocket client', () => {
  const domain = 'ws://some.domain.tld';
  const WebSocket = jest.fn();
  let socket, fakeSocket;

  beforeEach(() => {
    fakeSocket = new Emitter();
    fakeSocket.addEventListener = fakeSocket.on;
    fakeSocket.removeEventListener = fakeSocket.removeListener;
    fakeSocket.send = jest.fn();

    ReconnectionSocket.mockReset();
    ReconnectionSocket.mockImplementation(() => fakeSocket);

    socket = new Socket(domain, { WebSocket });
  });

  it('throws if the URL is omitted', () => {
    const fail = () => new Socket();

    expect(fail).toThrow(/URL/i);
  });

  it('creates a new socket', () => {
    expect(ReconnectionSocket).toHaveBeenCalledWith(domain, undefined, {
      WebSocket,
    });
  });

  it('passes through the protocols if specified', () => {
    const protocols = ['bacon'];

    socket = new Socket(domain, { protocols });

    expect(ReconnectionSocket).toHaveBeenCalledWith(domain, protocols, {});
  });

  it('sets the connection type', () => {
    expect(socket.type).toBe('websocket');
  });

  it('creates a unique ID', () => {
    expect(socket.id).toContain(domain);
  });

  it('forwards all messages', () => {
    expect(socket.messages).toEqual(expect.any(Stream));

    const data = { internetPeople: 'hello' };
    const spy = jest.fn();
    socket.messages.forEach(spy);

    fakeSocket.emit('message', { data: JSON.stringify(data) });
    expect(spy).toHaveBeenCalled();
    const [result] = spy.mock.calls[0];

    expect(result).toEqual(data);
  });

  it('does not attempt to parse binary data', () => {
    const data = Buffer.from('Binary! Yeah!');

    const spy = jest.fn();
    socket.messages.forEach(spy);

    fakeSocket.emit('message', data);

    expect(spy).toHaveBeenCalled();
  });

  it('sets the offline flag while the stream is opening', () => {
    expect(socket.offline).toBe(true);

    fakeSocket.emit('open');

    expect(socket.offline).toBe(false);

    fakeSocket.emit('close');

    expect(socket.offline).toBe(true);
  });

  it('sends objects as JSON', () => {
    const data = ['hold', 'still', 'and', 'nobody', 'explodes'];
    socket.send(data);

    expect(fakeSocket.send).toHaveBeenCalledWith(JSON.stringify(data));
  });

  it('does not stringify buffers', () => {
    const data = Buffer.from('a string');

    socket.send(data);

    expect(fakeSocket.send).toHaveBeenCalledWith(data);
  });
});
