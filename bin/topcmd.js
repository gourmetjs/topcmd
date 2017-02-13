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
      "  --version   print the version number",
      "  -h, --help  print this help message",
      "  --series    run the command at targets in series (default)",
      "  --parallel  run the NPM command at targets in parallel",
      "              * --parallel=10 limits maximum concurrency to 10",
      "  --delay=ms  put delays between commands run by '--parallel'",
      "  --ignore    ignore error",
      "  --self      run the NPM command at self directory",
      "  --norc      ignore .topcmdrc file (default on --self)",
      "  --env.NAME=VALUE      set an environment variable",
      "  --shell.OPTION=VALUE  set a shell option (--shell.echoCommand)"
    ].join("\n"));
    return;
  }

  topcmd.run().catch(function(err) {
    setImmediate(function() {
      throw err;
    });
  });
})();
