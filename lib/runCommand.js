"use strict";

var TopCommander = require("./TopCommander");

module.exports = function createTopCommander(options) {
  var topcmd = new TopCommander(options);
  return topcmd.run();
};
