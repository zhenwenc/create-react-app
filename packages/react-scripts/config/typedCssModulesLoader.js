'use strict';

const DtsCreator = require('typed-css-modules');
const loaderUtils = require('loader-utils');
const fs = require('fs');

// Storing the hash code of the content instead to save spaces.
// https://stackoverflow.com/a/7616484
function hashCode(value) {
  let hash = 0;
  let i;
  let chr;
  if (typeof value !== 'string') {
    return hash;
  } else if (value.length === 0) {
    return hash;
  }
  for (i = 0; i < value.length; i++) {
    chr = value.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

// Avoid rewriting css type definitions if there is no change.
// This hack is to prevent multiple recompiling triggered by webpack.
// https://github.com/webpack/watchpack/issues/25
const cached = (function cacheBuilder() {
  const cache = {}; // map of file path to content' hash code

  function getCacheOrLoad(filePath) {
    if (!cache[filePath] && fs.existsSync(filePath)) {
      const content = fs
        .readFileSync(filePath, { encoding: 'UTF8' })
        .replace(/\r?\n?[^\r\n]*$/g, '');
      cache[filePath] = hashCode(content);
    }
    return cache[filePath];
  }

  // Return `true` if content is cached
  return function updateCache(filePath, newContent) {
    const oldValue = getCacheOrLoad(filePath);
    const newValue = hashCode(newContent);
    if (oldValue !== newValue) {
      cache[filePath] = newValue;
      return false;
    } else {
      return true;
    }
  };
})();

module.exports = function(source, map) {
  this.cacheable && this.cacheable();
  const callback = this.async() || this.callback;

  const queryOptions = loaderUtils.getOptions(this);
  const options = queryOptions ? Object.assign({}, queryOptions) : undefined;
  const creator = new DtsCreator(options);

  creator
    .create(this.resourcePath, source)
    .then(content => {
      if (
        options.useCache === false ||
        !cached(content.outputFilePath, content.formatted)
      ) {
        console.log('[tcm] Wrote ' + content.outputFilePath);
        this.addDependency(content.outputFilePath);
        return content.writeFile();
      } else {
        console.log(`[tcm] Skipped ${content.outputFilePath}, using cache`);
      }
    })
    .then(() => callback(null, source, map), err => callback(err));
};
