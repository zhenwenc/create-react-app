'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const createCssModulesDts = require('./createCssModulesDts');

class TypedCssModulesPlugin {
  constructor(options) {
    this.options = options || {};
    this.lastTimes = {};
    this.startTime;
  }

  apply(compiler) {
    /**
     * While compiler.run() starts when executing `build` script, we need to
     * generate type definitions for all css file.
     */
    compiler.plugin('before-run', (compilation, callback) => {
      createCssModulesDts()
        .then(() => callback())
        .catch(err => callback(err));
    });

    compiler.plugin('watch-run', (watching, callback) => {
      const times = watching.compiler.fileTimestamps;
      this.startTime = this.startTime || watching.startTime;

      const modifiedFiles = Object.keys(times)
        .filter(
          filePath =>
            filePath.match(/\.css$/) &&
            times[filePath] > (this.lastTimes[filePath] || this.startTime)
        )
        .map(filePath => {
          this.lastTimes[filePath] = times[filePath];
          return path.normalize(filePath);
        });

      createCssModulesDts(modifiedFiles)
        .then(dtsFiles => {
          // As the generated .css.d.ts files are required while compiling TS,
          // but they have been ignored by `WatchIgnorePlugin`. As a hacky
          // workaround to ensure they are still picked up by ts-loader's
          // caching mechanism. TODO: Is there any better solution?
          // https://github.com/Jimdo/typings-for-css-modules-loader/issues/48
          dtsFiles.forEach(filePath => {
            times[filePath] = fs.statSync(filePath).mtime;
          });
        })
        .then(() => callback())
        .catch(reason => {
          console.error(chalk.red('[tcm] Failed', reason));
          callback(reason);
        });
    });
  }
}

module.exports = TypedCssModulesPlugin;
