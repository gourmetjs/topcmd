"use strict";

var fs = require("fs");
var npath = require("path");
var minimist = require("minimist");
var merge = require("config-merge");
var forEach = require("promise-box/lib/forEach");
var createQueue = require("promise-box/lib/queue");
var shell = require("pshell");

var MINIMIST_OPTIONS = {
  boolean: true,
  "--": true
};

function _readPackage(path) {
  var content = fs.readFileSync(npath.join(path, "package.json"), "utf8");
  return JSON.parse(content);
}

function TopCommander(options) {
  options = options || {};

  var rootPath = options.rootPath || process.cwd();

  this.root = {
    path: rootPath,
    relPath: ".",
    pkg: _readPackage(rootPath)
  };

  if (!options.runOptions) {
    var argv = minimist(process.argv.slice(2), MINIMIST_OPTIONS);
    this.runOptions = this.parseArgv(argv);
  } else {
    this.runOptions = merge({
      type: "series",
    }, options.runOptions);
  }

  var execpath = process.env.npm_execpath;
  if (execpath && execpath.endsWith("yarn.js"))
    this.npmName = "yarn";
  else
    this.npmName = "npm";
}

var proto = TopCommander.prototype;

proto.getTargets = function() {
  var self = this;

  if (!this._targets)
    this._targets = this._readTargets();

  return this._targets.filter(function(target) {
    if (self.runOptions.targets) {
      return self.runOptions.targets.indexOf(target.relPath) !== -1;
    } else {
      return target.pkg.scripts && target.pkg.scripts[self.runOptions.command] !== undefined;
    }
  });
};

proto.parseArgv = function(argv) {
  var options = {};

  if (argv.parallel) {
    options.type = "parallel";
    if (typeof argv.parallel !== "boolean")
      options.concurrency = parseInt(argv.parallel, 10);
  } else if (argv.self) {
    options.type = "self";
  } else {
    options.type = "series";
  }

  if (argv.ignore)
    options.shell = {ignoreError: true};

  options.command = argv._[0];
  options.targets = argv._.length > 1 ? this._normalizeTargets(argv._.slice(1)) : null;
  options.restArgv = argv["--"];

  return options;
};

proto.run = function() {
  switch (this.runOptions.type) {
    case "series":
      return this._runSeries();
    case "parallel":
      return this._runParallel();
    case "self":
      return this._runSelf();
    default:
      throw Error("Unknown command type: " + this.runOptions.type);
  }
};

proto.getShellOptions = function(target) {
  return merge({
    echoCommand: false,
    cwd: target.path
  }, this.runOptions.shell);
};

proto.buildCommandString = function() {
  return [
    this.npmName,
    "run",
    this.runOptions.command,
    this.runOptions.restArgv || ""
  ].join(" ");
};

proto.runAtTarget = function(target) {
  var cmd = this.buildCommandString(target);
  var opts = this.getShellOptions(target);
  return shell(cmd, opts);
};

proto._runSeries = function() {
  var self = this;
  var targets = this.getTargets();
  return forEach(targets, function(target) {
    return self.runAtTarget(target);
  });
};

proto._runParallel = function() {
  var self = this;
  var targets = this.getTargets();

  if (this.runOptions.concurrency) {
    var queue = createQueue({
      concurrency: this.runOptions.concurrency,
      data: targets
    });
    return queue.run(function(target) {
      return self.runAtTarget(target);
    });
  } else {
    return Promise.all(targets.map(function(target) {
      return self.runAtTarget(target);
    }));
  }
};

proto._runSelf = function() {
  return this.runAtTarget(this.root);
};

proto._readTargets = function() {
  var targets = [];
  var paths = this.runOptions.targets;
  var rootPath = this.root.path;

  if (!paths)
    paths = this._parseTargets();

  paths.forEach(function(path) {
    path = npath.resolve(rootPath, path);
    var relPath = npath.relative(rootPath, path);
    var pkg = _readPackage(path);
    targets.push({
      path: path,
      relPath: relPath,
      pkg: pkg
    });
  });

  return targets;
};

proto._parseTargets = function() {
  function _add(section) {
    var obj = self.root.pkg.linkdeps;
    var deps = obj && obj.local && obj.local[section];
    if (deps) {
      for (var path in deps) {
        paths.push(path);
      }
    }
  }

  var self = this;
  var paths = [];
  var items = this.root.pkg.topcmd && this.root.pkg.topcmd.targets;

  if (items) {
    items.forEach(function(item) {
      if (item === "@linkdeps.local") {
        _add("dependencies");
        _add("devDependencies");
      } else if (item === "@linkdeps.local.dependencies") {
        _add("dependencies");
      } else if (item === "@linkdeps.local.devDependencies") {
        _add("devDependencies");
      } else {
        paths.push(item);
      }
    });
  }

  return paths;
};

proto._normalizeTargets = function(paths) {
  var rootPath = this.root.path;
  return paths.map(function(path) {
    path = npath.resolve(rootPath, path);
    return npath.relative(rootPath, path);
  });
};

module.exports = TopCommander;
