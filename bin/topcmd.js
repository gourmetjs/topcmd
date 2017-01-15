#!/usr/bin/env node

"use strict";

var createTopCommander = require("..");

(function main() {
  var topcmd = createTopCommander();
  var argv = topcmd.argv;

  if (argv.version) {
    console.log(require("../package.json").version);
    return;
  }

  if (argv.help || !topcmd.command) {
    console.log([
      "Usage: topcmd [options] <command> [targets...]",
      "",
      "Options:",
      "  --version       print the version number",
      "  -h, --help      print this help message",
      "  --series        runs the command at targets in series (default)",
      "  -p, --parallel  runs the NPM command at targets in parallel",
      "                  * --parallel=10 limits maximum concurrency to 10",
      "  -s, --self      runs the NPM command at self directory",
      "  -i, --ignore    ignores error"
    ].join("\n"));
    return;
  }

  topcmd.run().catch(function(err) {
    setImmediate(function() {
      throw err;
    });
  });
})();
