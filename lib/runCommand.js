"use strict";

var TopCommander = require("./TopCommander");

module.exports = function runCommand(options) {
  var topcmd = new TopCommander(options);
  return topcmd.run();
};
