# Webb(App) utilities Jake

This is a collection of web(app) utilities for the [Jake task runner](http://jakejs.com/).

## Usage

```javascript
var wu = require('jake-web-utils');

/**
 * Compiles less files to css
 *
 * @param Object options
 * @param Function cb
 *
 * Options:
 *
 * - Array src - List of glob patterns for source files
 * - String dest - Destination directory
 * - Boolean debug - if true source maps will be generated
 */
wu.compileLess(options, cb)


/**
 * Watches and recompiles less files
 * @param Object options
 *
 * See compileLess for available Options
 */
wu.watchLess(options)


/**
 * Compiles javascript with browserify
 * @param Object options
 * @param Function cb
 *
 * Options:
 *
 * - Array src - List of glob patterns for source files
 * - String dest - Destination file
 * - Array vendorSrc - List of glob pattern for source files of vendor modules
 * - String vendorDest - Destination file for compiled vendors
 * - Boolean debug - if true source maps will be created
 * - String baseDir - baseDir as in browserify options
 */
wu.compileBrowserify(options, cb)


/**
 * Watches javascript files and compiles them with browserify
 * @param options
 *
 * See compileBrowserify for available Options
 */
wu.watchBrowserify(options)
```