import database, {
  ConnectionGroup,
  Stream,
  Node,
} from 'mytosis';

import Router, { messageTypes } from '../Router';

describe('Mytosis router', () => {
  let router, network, db, messages;

  beforeEach(() => {
    db = database();
    const group = db[database.configuration].network;

    messages = group.messages = new Stream((push) => {
      messages.push = push;
    });

    messages.forEach(() => {}).dispose();

    router = new Router();
    network = router.register(db, db[database.configuration]);
  });

  it('returns a network interface', () => {
    expect(network).toEqual(expect.any(Object));
    expect(network.push).toEqual(expect.any(Function));
    expect(network.pull).toEqual(expect.any(Function));
  });

  describe('network pull() method', () => {
    let read;
    const createAction = (merge = {}) => ({
      network: new ConnectionGroup(),
      offline: new ConnectionGroup(),
      online: new ConnectionGroup(),
      nodes: ['lobby'],
      ...merge,
    });

    beforeEach(() => {
      read = createAction();
    });

    it('returns a promise', () => {
      const result = network.pull(read);

      expect(result).toEqual(expect.any(Promise));
    });

    it('sends a request', () => {
      read.online.send = jest.fn();
      network.pull(read);

      expect(read.online.send).toHaveBeenCalledWith({
        rid: expect.any(String),
        nodes: read.nodes,
        type: messageTypes.READ,
      });
    });

    it('rejects if the request fails', async () => {
      const error = new Error('Request failed to do the things');
      read.online.send = jest.fn(() => {
        throw error;
      });

      const spy = jest.fn();
      await network.pull(read).catch(spy);

      expect(spy).toHaveBeenCalledWith(error);
    });

    it('resolves with the data on response', async () => {
      read.online.send = jest.fn();
      const promise = network.pull(read);
      const [msg] = read.online.send.mock.calls[0];
      const node = Node.from({ data: true }).toJSON();

      messages.push({ nodes: [node], rid: msg.rid, type: messageTypes.ACK });

      const data = await promise;
      expect(data).toEqual([node]);
    });

    it('rejects with error responses', async () => {
      read.online.send = jest.fn();
      const promise = network.pull(read);
      const { rid } = read.online.send.mock.calls[0][0];
      messages.push({ type: messageTypes.ACK, error: 'Failed to potato', rid });

      const spy = jest.fn();
      await promise.catch(spy);

      expect(spy).toHaveBeenCalledWith(new Error('Failed to potato'));
    });
  });
});
