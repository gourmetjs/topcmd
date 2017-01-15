"use strict";

var npath = require("path");
var minimist = require("minimist");
var merge = require("config-merge");
var forEach = require("promise-box/lib/forEach");
var createQueue = require("promise-box/lib/queue");
var shell = require("pshell");

function _readPackage(path) {
  return require(npath.join(path, "package.json"));
}

function TopCommander() {
}

var proto = TopCommander.prototype;

proto.parseArgv = function(argv) {
  var options = {};

  if (!argv)
    argv = minimist(process.argv.slice(2), this.getArgvOptions());

  this.argv = argv;

  if (argv.parallel) {
    options.runType = "parallel";
    if (typeof argv.parallel !== "boolean")
      options.concurrency = parseInt(argv.parallel, 10);
  } else if (argv.self) {
    options.runType = "self";
  } else {
    options.runType = "series";
  }

  if (argv.ignore)
    options.shellOptions = {ignoreError: true};

  options.command = argv._[0];
  options.targetFilter = argv._.length > 1 ? argv._.slice(1) : null;
  options.restArgv = argv["--"];

  return options;
};

proto.getArgvOptions = function() {
  return {
    boolean: true,
    alias: {
      "h": "help",
      "s": "self",
      "p": "parallel",
      "i": "ignore"
    },
    "--": true
  };
};

proto.prepare = function(options) {
  var rootPath = options.rootPath || process.cwd();

  this.root = {
    path: rootPath,
    relPath: ".",
    pkg: _readPackage(rootPath)
  };

  this.command = options.command;
  this.runType = options.runType || "series";
  this.concurrency = options.concurrency;
  this.targetFilter = options.targetFilter;
  this.restArgv = options.restArgv;
  this.shellOptions = options.shellOptions;

  var execpath = process.env.npm_execpath;
  if (execpath && execpath.endsWith("yarn.js"))
    this.npmName = "yarn";
  else
    this.npmName = "npm";
};

proto.run = function() {
  switch (this.runType) {
    case "series":
      return this._runSeries();
    case "parallel":
      return this._runParallel();
    case "self":
      return this._runSelf();
    default:
      throw Error("Unknown runType: " + this.runType);
  }
};

proto.getTargets = function() {
  var self = this;

  if (!this._targets)
    this._targets = this._readTargets();

  return this._targets.filter(function(target) {
    if (self.targetFilter) {
      return true;  // this._targets was made from targetFilter
    } else {
      return target.pkg.scripts && target.pkg.scripts[self.command] !== undefined;
    }
  });
};

proto.getShellOptions = function(target) {
  return merge({
    echoCommand: false,
    cwd: target.path
  }, this.shellOptions);
};

proto.buildCommandString = function(target) {
  var output = [this.npmName];

  if (target.pkg.scripts && target.pkg.scripts[this.command])
    output.push("run");

  output.push(this.command);

  if (this.restArgv)
    output.push(this.restArgv);

  return output.join(" ");
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

  if (this.concurrency) {
    var queue = createQueue({
      concurrency: this.concurrency,
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
  var paths = this.targetFilter;
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
