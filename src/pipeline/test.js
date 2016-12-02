/* eslint-env mocha */
import mergeConfigs from '../merge-configs';
import { before } from './index';
import expect from 'expect';

const hooks = (hooks) => mergeConfigs([{ hooks }]);

describe.only('The read pipeline', () => {

  const key = 'read-pipeline-test';
  const config = mergeConfigs([]);

  it('should set the default network options', async () => {
    const config = mergeConfigs([{
      storage: [{ storage: true }],
      network: {
        clients: [{ client: true }],
      },
    }]);

    const [, options] = await before.read(config, [key]);

    // Excluding memory option for now.
    expect(options).toContain({
      clients: [{ client: true }],
      storage: [{ storage: true }],
    });
  });

  it('should not overwrite given read options', async () => {
    const clients = [{ 'totally-a-client': true }];
    const storage = [{ 'postgres-but-better': true }];
    const args = [key, { clients, storage }];
    const [, options] = await before.read(config, args);

    expect(options).toContain({ clients, storage });
  });

  it('should allow hooks to change the key', async () => {
    const overridden = 'Haha changed your key';
    const read = async () => [overridden];
    const config = hooks({
      before: { read },
    });

    const [key] = await before.read(config, [
      'original boring key',
    ]);

    expect(key).toBe(overridden);
  });

  describe('hook that returns a string', () => {

    it('should overwrite the key', async () => {
      const read = async () => 'String return';
      const config = hooks({
        before: { read },
      });

      const [key] = await before.read(config, ['Original key']);

      expect(key).toBe('String return');
    });

    it('should carry options from the last args', async () => {
      const read = async () => 'Precious';
      const config = hooks({
        before: { read },
      });

      const [key, options] = await before.read(config, ['lamesauce']);

      expect(key).toBe('Precious');
      expect(options).toContain({
        clients: [],
        storage: [],
      });
    });

  });

  describe('hook that returns an object', () => {

    it('should overwrite the options', async () => {
      const read = async () => ({ overridden: true });
      const config = hooks({
        before: { read },
      });

      const [, options] = await before.read(config, ['sup']);

      expect(options).toEqual({ overridden: true });
    });

    it('should reuse the last key', async () => {
      const read = async () => ({ 'you are here': true });
      const config = hooks({
        before: { read },
      });

      const [key] = await before.read(config, ['initial']);
      expect(key).toBe('initial');
    });

  });


});
