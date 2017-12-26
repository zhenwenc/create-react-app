'use strict';

const path = require('path');
const glob = require('glob');
const DtsCreator = require('typed-css-modules');
const paths = require('../../config/paths');

const creator = new DtsCreator({ camelCase: 'dashes' });

// Avoid rewriting css type definitions if there is no change.
// This hack was used to unnecessary computations.
// https://github.com/webpack/watchpack/issues/25
const cache = new Map(); // map of file path

function createCssModuleDts(cssFileNames) /*Promise<string[]>*/ {
  const pattern = path.join(paths.appSrc, '**/*.css');
  const files = cssFileNames || glob.sync(pattern, null);

  if (files && files.length > 0) {
    return Promise.all(
      files.map(fileName => create(fileName))
    ).then(dtsFiles => {
      console.log('Completed creating css module type definitions');
      return dtsFiles.filter(v => v);
    });
  } else {
    console.log('[tcm] No css module type definition file is generated');
    return Promise.resolve([]);
  }
}

function create(fileName) /* Promise<string> */ {
  return creator.create(fileName, null, true).then(content => {
    const oldHashCode = cache.get(fileName);
    const newHashCode = getHashCode(content.formatted);
    if (oldHashCode !== newHashCode) {
      console.log('[tcm] Wrote ' + content.outputFilePath);
      cache.set(fileName, newHashCode);
      return content.writeFile().then(() => content.outputFilePath);
    }
  });
}

// Storing the hash code of the content instead to save spaces.
// https://stackoverflow.com/a/7616484
function getHashCode(value) {
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

module.exports = createCssModuleDts;
