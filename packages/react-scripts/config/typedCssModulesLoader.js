'use strict';

const path = require('path');
const DtsCreator = require('typed-css-modules');
const loaderUtils = require('loader-utils');

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
  });
};
