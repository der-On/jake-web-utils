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
 *
 * Options:
 *
 * - Array watchPaths - Additional paths/glob patterns to watch
 */
wu.watchLess(options)

/**
 * Compiles Stylus files to css
 *
 * @param Object options
 * @param Function cb
 *
 * Options:
 *
 * - Array src - List of glob patterns for source files
 * - String dest - Destination directory
 * - Boolean debug - if true source maps will be generated
 * - plugins - list of plugins to use (plugin constructors must be insterted executed here)
 */
wu.compileStylus(options, cb)

/**
 * Watches and recompiles Stylus files
 * @param Object options
 *
 * See compileStylus for available Options
 *
 * Options:
 *
 * - Array watchPaths - Additional paths/glob patterns to watch
 */
wu.watchStylus(options)

/**
 * Compiles javascript with browserify
 * @param Object options
 * @param Function cb
 *
 * Options:
 *
 * - Array src - List of glob patterns for source files
 * - String dest - Destination file
 * - Boolean noVendors - if true, no separate vendors file will be used
 * - Array vendorSrc - List of glob pattern for source files of vendor modules
 * - String vendorDest - Destination file for compiled vendors
 * - Array vendorExclude - Module names to exlclude from vendors
 * - Array vendorInclude - Module names to include from vendors (ignores vendorExclude)
 * - Boolean debug - if true source maps will be created
 * - String baseDir - baseDir as in browserify options
 * - String package - path to package.json to use for vendor detection
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