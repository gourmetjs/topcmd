"use strict";

var npath = require("path");
var test = require("tape");

var TopCommander = require("../lib/TopCommander");

function _targets(topcmd) {
  return topcmd.getTargets().map(function(target) {
    return target.relPath;
  });
}

test("test command targets", function(t) {
  var topcmd = new TopCommander({
    rootPath: npath.join(__dirname, "fixture/basic"),
    command: "test",
    recursive: true
  });
  t.deepEqual(_targets(topcmd), ["sub-a", "sub-b", "sub-d", "sub-c"]);
  t.end();
});

test("build command targets", function(t) {
  var topcmd = new TopCommander({
    rootPath: npath.join(__dirname, "fixture/basic"),
    command: "build"
  });
  t.deepEqual(_targets(topcmd), ["sub-a"]);
  t.end();
});

test("unknown command targets", function(t) {
  var topcmd = new TopCommander({
    rootPath: npath.join(__dirname, "fixture/basic"),
    command: "unknown"
  });
  t.deepEqual(_targets(topcmd), []);
  t.end();
});

test("custom command targets", function(t) {
  var topcmd = new TopCommander({
    rootPath: npath.join(__dirname, "fixture/basic"),
    command: "custom",
    recursive: true,
    force: true,
    dirs: [
      "sub-c",
      "sub-z"
    ]
  });
  t.deepEqual(_targets(topcmd), ["sub-d", "sub-c", "sub-z"]);
  t.end();
});

test("misc features", function(t) {
  var topcmd = new TopCommander({
    rootPath: npath.join(__dirname, "fixture/basic"),
    command: "lint",
    echo: false,
    ignore: true,
    env: {DEBUG: "topcmd"},
    restArgv: ["--check"]
  });

  t.deepEqual(_targets(topcmd), ["sub-a", "sub-b"]);

  t.equal(topcmd.buildCommandString(topcmd.getTargets()[0]), topcmd.npmName + " run lint --check");

  t.deepEqual(topcmd.getShellOptions(topcmd.getTargets()[0]), {
    echoCommand: false,
    ignoreError: true,
    cwd: npath.join(__dirname, "fixture/basic/sub-a"),
    env: {
      DEBUG: "topcmd"
    }
  });

  t.end();
});

test("handling internal commands", function(t) {
  var topcmd = new TopCommander({
    rootPath: npath.join(__dirname, "fixture/basic"),
    command: "install"
  });
  // "run" should be dropped if there is no item defined in "scripts",
  // assuming it as internal commands
  t.equal(topcmd.buildCommandString(topcmd.root), topcmd.npmName + " install");
  t.end();
});
