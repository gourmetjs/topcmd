#!/usr/bin/env node

"use strict";

var program = require("commander");
var runCommand = require("..");

var _OPTIONS = ["series", "parallel", "self", "ignore"];

program
  .version(require("../package.json").version)
  .usage("[options] <command> [dir...]")
  .description("Run the yarn/npm command in local projects")
  .option("--series", "run the command in series (default)")
  .option("-p, --parallel", "run the command in parallel")
  .option("-c, --concurrency <n>", "set maximum concurrency of parallel", parseInt)
  .option("-s, --self", "run the command at self directory")
  .option("-i, --ignore", "ignore error")
  .parse(process.argv);

var options = {};

_OPTIONS.forEach(function(name) {
  if (program.hasOwnProperty(name))
    options[name] = program[name];
});

console.log(program);
/*
runCommand(options).catch(function(err) {
  console.error(err);
  process.exit(1);
});
*/