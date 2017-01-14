"use strict";

var TopCommander = require("./TopCommander");

module.exports = function createTopCommander(options) {
  var topcmd = new TopCommander();
  if (!options)
    options = topcmd.parseArgv();
  topcmd.prepare(options);
  return topcmd;
};
