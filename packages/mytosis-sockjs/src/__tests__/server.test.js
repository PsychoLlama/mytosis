import SocketServer from '../server';

describe('Mytosis sockjs server', () => {
  it('exports a function', () => {
    expect(SocketServer).toEqual(expect.any(Function));
  });
});
