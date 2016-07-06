# vega-lite-ui

[![Build Status](https://travis-ci.org/vega/vega-lite-ui.svg)](https://travis-ci.org/vega/vega-lite-ui)
[![npm dependencies](https://david-dm.org/vega/vega-lite-ui.svg)](https://www.npmjs.com/package/vega-lite-ui)
[![npm version](https://img.shields.io/npm/v/vega-lite-ui.svg)](https://www.npmjs.com/package/vega-lite-ui)

Common UI Library for [Polestar](https://github.com/vega/polestar) and [Voyager](https://github.com/vega/voyager).

## Build Process

To use vega-lite-ui, you need to install its dependencies and build the `vlui.js` and `vlui.min.js` scripts. We assume that you have [npm](https://www.npmjs.com/) installed.

1. Run `npm install` in the vega-lite-ui repository folder to install the dependencies needed to build vega-lite-ui
  - Note: vega-lite-ui uses [Bower](http://bower.io/) for client-side dependency management. Bower will automatically run its own installation process once the npm install completes, but if you need to run additional bower commands, the `bower` command-line utility can be globally installed with `npm install -g bower`.
2. Run `npm run build`. This will use [Gulp](http://gulpjs.com/) to concatenate the source files together into vlui.js, then use [uglify-js](http://lisperator.net/uglifyjs/) to create the minified vlui.min.js.


## Notes for Developer

- Since `fieldDef` in Vega-Lite is equivalent to `encodingQuery` in CompassQL but this project predates CompassQL, we use `fieldDef` to refer to both of them.