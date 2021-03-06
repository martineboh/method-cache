import { Meteor } from 'meteor/meteor';

export const getMergedSelector = (
  collectionName,
  selector,
  options,
  cachedFieldsHash = '',
) => {
  const { _id } = selector;
  let fieldsHash = cachedFieldsHash;

  if (!_id) {
    return null;
  }

  if (!fieldsHash && options && options.fields) {
    fieldsHash = JSON.stringify(options.fields);
  }

  if (_id.$in && Array.isArray(_id.$in)) {
    return _id.$in
      .filter(x => x) // Remove null and undefined _ids
      .map(id =>
        getMergedSelector(collectionName, { _id: id }, options, fieldsHash));
  }

  return `${collectionName}__${_id}__${fieldsHash}`;
};

export const getMergedSelectorParts = (mergedSelector) => {
  const [collectionName, _id, fieldsHash] = mergedSelector.split('__');

  if (fieldsHash) {
    return {
      collectionName,
      selector: { _id },
      options: { fields: JSON.parse(fieldsHash) },
    };
  }

  return { collectionName, selector: { _id } };
};

export const createMeteorAsyncFunction = promiseFunc =>
  Meteor.wrapAsync((params, callback) => {
    promiseFunc(params)
      .then(result => callback(null, result))
      .catch(callback);
  });

export const buildSelector = (mergedSelectors) => {
  if (mergedSelectors.length === 1) {
    return getMergedSelectorParts(mergedSelectors[0]);
  }

  // In arrays of selectors, the collection is always the same for all of them
  const { collectionName } = getMergedSelectorParts(mergedSelectors[0]);
  const selector = {
    _id: {
      $in: mergedSelectors.map(mergedSelector => getMergedSelectorParts(mergedSelector).selector._id),
    },
  };

  return { collectionName, selector };
};

export const shouldUseCache = (selector, options) => {
  // if (options && options.fields) {
  //   return false;
  // }

  if (selector._id && Object.keys(selector).length === 1) {
    // If the only selector is an _id, use cache
    return true;
  }

  return false;
};

// Optimized version of apply which tries to call as possible as it can
// Then fall back to apply
// This is because, v8 is very slow to invoke apply.
export const optimizedApply = function optimizedApply(context, fn, args) {
  const a = args;
  switch (a.length) {
  case 0:
    return fn.call(context);
  case 1:
    return fn.call(context, a[0]);
  case 2:
    return fn.call(context, a[0], a[1]);
  case 3:
    return fn.call(context, a[0], a[1], a[2]);
  case 4:
    return fn.call(context, a[0], a[1], a[2], a[3]);
  case 5:
    return fn.call(context, a[0], a[1], a[2], a[3], a[4]);
  default:
    return fn.apply(context, a);
  }
};
