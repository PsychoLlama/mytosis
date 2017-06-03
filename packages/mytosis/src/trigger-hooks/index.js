import isPromise from 'is-promise';

/**
 * Triggers an asynchronous hook pipeline. Each hook can change
 * the input to the next via the `transform` callback.
 * @param  {Object} pipeline - Describes what hooks to call and how.
 * @param  {Array} pipeline.hooks - A list of functions to call.
 * @param  {Array} pipeline.initial - The initial value to start with.
 * @param  {Function} pipeline.transform - The initial value to start with.
 * @return {Promise} - Resolves to the final arguments output.
 */
export default async function ({
  transform,
  initial,
  hooks,
}) {
  let result = initial;

  for (const hook of hooks) {
    let output = this::hook(result);

    if (isPromise(output)) {
      output = await output;
    }

    result = transform(output, result);
  }

  return result;
};
