'use strict';

// TODO Remove this hacky solution!!

// This script creates the type definition files for each .css files before
// compiling typescripts. We should not need to manually create this as
// we have configured webpack loader to do the job. However, the typescript
// loader always uses the loaded files which are passed by webpack loader
// in the early stages (before typing for css modules get generated).
//
// See: https://github.com/s-panferov/awesome-typescript-loader/issues/123
// See: https://github.com/s-panferov/awesome-typescript-loader/issues/238
// See: https://github.com/TypeStrong/ts-loader/issues/223

const path = require('path');
const glob = require('glob');
const chalk = require('chalk');
const DtsCreator = require('typed-css-modules');
const paths = require('../../config/paths');

module.exports = function() {
  const filePattern = path.join(paths.appSrc, '**/*.css');
  const options = { camelCase: 'dashes' };
  const creator = new DtsCreator(options);

  function build(files /* string[] */) /* Promise<any> */ {
    return files.reduce((acc, file) => {
      const promise = creator
        .create(file, null, false)
        .then(content => content.writeFile())
        .then(content => {
          console.log('[tcm] Wrote ' + chalk.green(content.outputFilePath));
          content.messageList.forEach(message => {
            console.warn(chalk.yellow('[tcm] ' + message));
          });
        })
        .catch(reason => console.error(chalk.red('[tcm] Error ' + reason)));
      return acc.then(() => promise);
    }, Promise.resolve());
  }

  console.warn(
    chalk.yellow('[tcm] Creating type definition files for css modules')
  );

  return new Promise((resolve, reject) => {
    glob(filePattern, null, (error, files) => {
      if (error) {
        reject('[tcm] Failed to search css glob files: ' + error);
      } else if (files && files.length > 0) {
        build(files).then(() => {
          console.info('Completed creating css module type definitions');
          resolve();
        });
      } else {
        console.info('[tcm] No css module type definition file is generated');
        resolve();
      }
    });
  });
};
