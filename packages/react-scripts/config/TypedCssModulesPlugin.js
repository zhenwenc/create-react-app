'use strict';

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const chalk = require('chalk');
const DtsCreator = require('typed-css-modules');
const paths = require('./paths');

class TypedCssModulesPlugin {
  constructor(options) {
    this.options = options;
    this.cssFilesPattern = path.join(paths.appSrc, '**/*.css');

    // Avoid rewriting css type definitions if there is no change.
    // This hack was used to unnecessary computations.
    // https://github.com/webpack/watchpack/issues/25
    this.cache = new Map(); // map of file path to content' hash code
  }

  build(files /* string[] */, options) /* Promise<any> */ {
    return files
      .filter(file => {
        if (this.options.useCache === false || !this.cache.has(file)) {
          return true;
        } else {
          console.log(`[tcm] Skipped ${file}, using cache`);
          return false;
        }
      })
      .reduce((acc, file) => {
        return new DtsCreator(options)
          .create(file, null, false)
          .then(content => {
            console.log('[tcm] Wrote ' + content.outputFilePath);
            this.cache.set(file, content.formatted);
            return content.writeFile();
          })
          .then(content => {
            return acc.then(array => array.concat(content.outputFilePath));
          })
          .catch(reason => {
            Promise.reject(chalk.red('[tcm] Error ' + reason));
          });
      }, Promise.resolve([]));
  }

  apply(compiler) {
    /**
     * While compiler.run() starts when executing `build` script, we need to
     * generate type definitions for all css file.
     */
    compiler.plugin('before-run', (compilation, callback) => {
      glob(this.cssFilesPattern, null, (error, files) => {
        if (error) {
          callback('[tcm] Failed to search css glob files: ' + error);
        } else if (files && files.length > 0) {
          const options = Object.assign({}, this.options, { useCache: false });
          this.build(files, options).then(() => {
            console.info('Completed creating css module type definitions');
            callback();
          });
        } else {
          console.info('[tcm] No css module type definition file is generated');
          callback();
        }
      });
    });

    /**
     * Before starting computation after watch, we generate the type definition
     * only for those CSS files which haven't been cached, where it might be a
     * newly create file or had been invalidated.
     */
    compiler.plugin('watch-run', (compilation, callback) => {
      glob(this.cssFilesPattern, null, (error, files) => {
        if (error) {
          callback('[tcm] Failed to search css glob files: ' + error);
        } else if (files && files.length > 0) {
          this.build(files, this.options).then(files => {
            console.info('Completed creating css module type definitions');

            // As the generated .css.d.ts files are required while compiling TS,
            // but they have been ignored by `WatchIgnorePlugin`. As a hacky
            // workaround to ensure they are still picked up by ts-loader's
            // caching mechanism. TODO: Is there any better solution?
            // https://github.com/Jimdo/typings-for-css-modules-loader/issues/48
            files.forEach(filePath => {
              compiler.fileTimestamps[filePath] = fs.statSync(filePath).mtime;
            });

            callback();
          });
        } else {
          console.info('[tcm] No css module type definition file is generated');
          callback();
        }
      });
    });

    /**
     * After invalidating a watch compile, the corresponding cache should also
     * be invalidated. Note that we by pass checking of whether the invalidated
     * file has CSS extension as its unnecessary.
     */
    compiler.plugin('invalid', fileName => {
      // Invalidate cache
      this.cache.delete(fileName);
    });
  }
}

module.exports = TypedCssModulesPlugin;
