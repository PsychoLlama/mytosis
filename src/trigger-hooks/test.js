/* eslint-env mocha*/
import trigger from './index';
import expect, { createSpy } from 'expect';
import Promise from 'bluebird';

describe('A trigger', () => {

  it('should return a promise', () => {
    const result = trigger({
      hooks: [],
      args: ['final', true],
      transform () {},
    });

    expect(result).toBeA(Promise);
  });

  it('should call the hooks', async () => {
    const spy = createSpy();
    spy.andReturn(Promise.resolve());

    await trigger({
      hooks: [spy],
      args: [],
      transform () {},
    });

    expect(spy).toHaveBeenCalled();
  });

  it('should pass arguments', async () => {
    const spy = createSpy();
    spy.andReturn(Promise.resolve());

    await trigger({
      hooks: [spy],
      args: ['passed', 'args'],
      transform () {},
    });

    expect(spy).toHaveBeenCalledWith('passed', 'args');
  });

  it('should apply the `this` context to each hook', async () => {
    const spy = createSpy();
    spy.andReturn(Promise.resolve());
    const context = { '`this` context test': true };

    await context::trigger({
      hooks: [spy],
      args: [],
      transform () {},
    });

    expect(spy.calls[0].context).toBe(context);
  });

  it('should run `transform` after each hook', async () => {
    const spy = createSpy();

    await trigger({
      hooks: [async () => 'fake result'],
      args: ['initial', 'args'],
      transform: spy,
    });

    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith('fake result', ['initial', 'args']);
  });

  it('should send the transformed value to the next hook', async () => {
    const spy = createSpy();
    spy.andReturn(Promise.resolve('nope'));

    await trigger({
      hooks: [
        async () => 'first hook value',
        spy,
      ],
      args: ['initial'],
      transform (result) {
        return [
          result.replace(/first/, 'second'),
        ];
      },
    });

    expect(spy).toHaveBeenCalledWith('second hook value');
  });

  it('should return the final transformed args', async () => {
    const spy = createSpy();
    spy.andReturn(Promise.resolve());

    const value = await trigger({
      hooks: [
        async (val) => val + 1,
        async (val) => val + 1,
      ],
      args: [0],
      transform (output) {
        return [output];
      },
    });

    expect(value).toEqual([2]);
  });

});
