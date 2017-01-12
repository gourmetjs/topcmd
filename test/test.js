"use strict";

var npath = require("path");
var test = require("tape");

var createTopCommander = require("..");

function _targets(topcmd) {
  return topcmd.getTargets().map(function(target) {
    return target.relPath;
  });
}

test("test command targets", function(t) {
  var topcmd = createTopCommander({
    rootPath: npath.join(__dirname, "fixture/basic"),
    runOptions: {
      command: "test"
    }
  });
  t.deepEqual(_targets(topcmd), ["sub-a", "sub-b", "sub-c"]);
  t.end();
});

test("build command targets", function(t) {
  var topcmd = createTopCommander({
    rootPath: npath.join(__dirname, "fixture/basic"),
    runOptions: {
      command: "build"
    }
  });
  t.deepEqual(_targets(topcmd), ["sub-a"]);
  t.end();
});

test("unknown command targets", function(t) {
  var topcmd = createTopCommander({
    rootPath: npath.join(__dirname, "fixture/basic"),
    runOptions: {
      command: "unknown"
    }
  });
  t.deepEqual(_targets(topcmd), []);
  t.end();
});

test("custom command targets", function(t) {
  var topcmd = createTopCommander({
    rootPath: npath.join(__dirname, "fixture/basic"),
    runOptions: {
      command: "custom",
      targets: [
        "sub-a",
        "sub-z"
      ]
    }
  });
  t.deepEqual(_targets(topcmd), ["sub-a", "sub-z"]);
  t.end();
});

test("misc features", function(t) {
  var topcmd = createTopCommander({
    rootPath: npath.join(__dirname, "fixture/basic"),
    runOptions: {
      command: "lint",
      restArgv: "--check"
    }
  });

  t.deepEqual(_targets(topcmd), ["sub-a", "sub-b"]);

  t.equal(topcmd.buildCommandString(topcmd.getTargets()[0]), topcmd.npmName + " run lint --check");

  t.deepEqual(topcmd.getShellOptions(topcmd.getTargets()[0]), {
    echoCommand: false,
    cwd: npath.join(__dirname, "fixture/basic/sub-a")
  });

  t.end();
});
