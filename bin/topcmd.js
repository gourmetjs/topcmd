#!/usr/bin/env node

"use strict";

var program = require("commander");
var runAsMain = require("..").runAsMain;

function _parseEnv(def, env) {
  var items = def.split("=");
  env[items[0]] = items[1] || "1";
  return env;
}

function _splitArgs(argv) {
  var idx = argv.indexOf("--");
  if (idx !== -1)
    return [argv.slice(0, idx), argv.slice(idx + 1)];
  else
    return [argv, []];
}

var args = _splitArgs(process.argv);

program
  .version(require("../package.json").version)
  .usage("[options] <command> [dir...]")
  .description("Centrally runs yarn/npm commands in sub-project directories")
  .option("--series", "run commands in series (default)")
  .option("-p, --parallel", "run commands in parallel")
  .option("-c, --concurrency <n>", "set maximum parallel concurrency", parseInt)
  .option("-d, --delay <ms>", "set delay between parallel commands", parseInt)
  .option("-s, --self", "run the command at self directory")
  .option("-r, --recursive", "recursively scan sub-projects")
  .option("-i, --ignore", "ignore error")
  .option("-f, --force", "do not check if the command exists in 'scripts'")
  .option("--env <n>=[v]", "set an environment variable", _parseEnv, {})
  .option("--echo", "echo commands")
  .option("--sim", "simulate commands and exit")
  .parse(args[0]);

var options = {
  command: program.args[0],
  dirs: program.args.slice(1),
  restArgv: args[1]
};

[
  "series", "parallel", "concurrency", "delay", "self",
  "recursive", "ignore", "force", "env", "echo", "sim"
].forEach(function(name) {
  if (program.hasOwnProperty(name))
    options[name] = program[name];
});

runAsMain(options);
