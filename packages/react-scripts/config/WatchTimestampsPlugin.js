'use strict';

var fs = require('fs');

class WatchTimestampsPlugin {
  constructor(paths) {
    this.paths = paths;
  }

  apply(compiler) {
    compiler.plugin('watch-run', (watch, callback) => {
      const fileTimestamps = watch.compiler.fileTimestamps;

      console.info('---- patterns', this.paths);

      Object.keys(fileTimestamps).forEach(filePath => {
        const matched = this.paths.some(path => {
          return path instanceof RegExp
            ? path.test(filePath)
            : filePath.indexOf(path) === 0;
        });

        if (matched) {
          console.info(
            '--- matched',
            filePath,
            fileTimestamps[filePath],
            fs.statSync(filePath).mtime
          );
          fileTimestamps[filePath] = fs.statSync(filePath).mtime;
        }
      });

      callback();
    });
  }
}

module.exports = WatchTimestampsPlugin;
