import trigger from './index';
import expect, { createSpy } from 'expect';

describe('A trigger', () => {

  it('should return a promise', () => {
    const result = trigger({
      transform () {},
      initial: {},
      hooks: [],
    });

    expect(result).toBeA(Promise);
  });

  it('should call the hooks', async () => {
    const spy = createSpy();
    spy.andReturn(Promise.resolve());

    await trigger({
      transform () {},
      hooks: [spy],
      initial: {},
    });

    expect(spy).toHaveBeenCalled();
  });

  it('should pass arguments', async () => {
    const spy = createSpy();
    spy.andReturn(Promise.resolve());
    const initial = { data: 'nope' };

    await trigger({
      transform () {},
      hooks: [spy],
      initial,
    });

    expect(spy).toHaveBeenCalledWith(initial);
  });

  it('should apply the `this` context to each hook', async () => {
    const spy = createSpy();
    spy.andReturn(Promise.resolve());
    const context = { '`this` context test': true };

    await context::trigger({
      transform () {},
      hooks: [spy],
      initial: {},
    });

    expect(spy.calls[0].context).toBe(context);
  });

  it('should run `transform` after each hook', async () => {
    const spy = createSpy();

    await trigger({
      hooks: [async () => 'fake result'],
      initial: { initial: 'state' },
      transform: spy,
    });

    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith('fake result', { initial: 'state' });
  });

  it('should send the transformed value to the next hook', async () => {
    const spy = createSpy();
    spy.andReturn(Promise.resolve('nope'));

    await trigger({
      transform: (result) => result.replace(/first/, 'second'),
      initial: 'initial',
      hooks: [
        async () => 'first hook value',
        spy,
      ],
    });

    expect(spy).toHaveBeenCalledWith('second hook value');
  });

  it('should return the final transformed args', async () => {
    const spy = createSpy();
    spy.andReturn(Promise.resolve());

    const value = await trigger({
      transform: (output) => output,
      initial: 0,
      hooks: [
        async (val) => val + 1,
        async (val) => val + 1,
      ],
    });

    expect(value).toEqual(2);
  });

  it('should work for synchronous hooks', async () => {
    const value = await trigger({
      transform: output => output,
      initial: 0,
      hooks: [
        async (num) => num + 2,
        (num) => num + 2,
      ],
    });

    expect(value).toEqual(4);
  });

});
