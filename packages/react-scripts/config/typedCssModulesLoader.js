'use strict';

const DtsCreator = require('typed-css-modules');
const loaderUtils = require('loader-utils');

module.exports = function(source, map) {
  this.cacheable && this.cacheable();
  const callback = this.async() || this.callback;

  const queryOptions = loaderUtils.getOptions(this);
  const options = queryOptions ? Object.assign({}, queryOptions) : undefined;
  const creator = new DtsCreator(options);

  creator
    .create(this.resourcePath, source)
    .then(content => {
      console.log('[tcm] Wrote ' + content.outputFilePath);
      this.addDependency(content.outputFilePath);
      return content.writeFile();
    })
    .then(() => callback(null, source, map), err => callback(err));
};
