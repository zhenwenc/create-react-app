'use strict';

const fs = require('fs');
const path = require('path');
const DtsCreator = require('typed-css-modules');
const loaderUtils = require('loader-utils');

// Avoid rewriting css type definitions if there is no change.
// This hack is to prevent multiple recompiling triggered by webpack.
// https://github.com/webpack/watchpack/issues/25
const cached = (function cacheBuilder() {
  const cache = {};

  function getCacheOrLoad(filePath) {
    if (!cache[filePath] && fs.existsSync(filePath)) {
      cache[filePath] = fs
        .readFileSync(filePath, { encoding: 'UTF8' })
        .replace(/\r?\n?[^\r\n]*$/g, '');
    }
    return cache[filePath];
  }

  function updateCache(filePath, content) {
    const oldValue = getCacheOrLoad(filePath);
    const newValue = content;
    if (oldValue !== newValue) {
      cache[filePath] = newValue;
      return false;
    } else {
      return true;
    }
  }

  return updateCache;
})();

module.exports = function(source, map) {
  this.cacheable && this.cacheable();
  this.addDependency(this.resourcePath);
  const callback = this.async();

  // Pass on query parameters as an options object to the DtsCreator. This lets
  // you change the default options of the DtsCreator and e.g. use a different
  // output folder.
  const queryOptions = loaderUtils.getOptions(this);
  const options = queryOptions ? Object.assign({}, queryOptions) : undefined;
  const creator = new DtsCreator(options);

  // creator.create(..., source) tells the module to operate on the
  // source variable. Check API for more details.
  creator.create(this.resourcePath, source).then(content => {
    if (
      options.useCache === false ||
      !cached(content.outputFilePath, content.formatted)
    ) {
      // Emit the created content as well
      this.emitFile(
        path.relative(this.options.context, content.outputFilePath),
        content.contents || [''],
        map
      );

      // Output to file
      console.log('[tcm] Wrote ' + content.outputFilePath);
      content.writeFile().then(() => {
        callback(null, source, map);
      });
    } else {
      callback(null, source, map);
      return;
    }
  });
};
