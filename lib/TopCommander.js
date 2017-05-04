"use strict";

var npath = require("path");
var forEach = require("promise-box/lib/forEach");
var createQueue = require("promise-box/lib/queue");
var runAsMain = require("promise-box/lib/runAsMain");
var delay = require("promise-box/lib/delay");
var shell = require("pshell");

function _readPackage(path, refPath) {
  try {
    return require(npath.join(path, "package.json"));
  } catch (err) {
    if (refPath) {
      var newErr = new Error("Error in processing " + npath.join(refPath, "package.json") + "\n" + err.message);
      newErr.orgError = err;
      throw newErr;
    } else {
      throw err;
    }
  }
}

function TopCommander(options) {
  this.options = options;

  if (!options.command)
    throw Error("Command required, run 'topcmd -h' for help");

  if (options.dirs && !options.dirs.length)
    options.dirs = null;

  var rootPath = options.rootPath || process.cwd();

  this.root = {
    path: rootPath,
    relPath: ".",
    pkg: _readPackage(rootPath)
  };

  var execpath = process.env.npm_execpath;
  if (execpath && execpath.endsWith("yarn.js"))
    this.npmName = "yarn";
  else
    this.npmName = "npm";
}

var proto = TopCommander.prototype;

proto.run = function() {
  var options = this.options;
  if (options.parallel)
    return this._runParallel();
  else if (options.self)
    return this._runSelf();
  else
    return this._runSeries();
};

proto.getTargets = function() {
  var self = this;

  if (!this._targets)
    this._targets = this._readTargets();

  return this._targets.filter(function(target) {
    return self.options.force || (target.pkg.scripts && target.pkg.scripts[self.options.command] !== undefined);
  });
};

proto.getShellOptions = function(target) {
  var options = this.options;
  return {
    echoCommand: options.echo,
    ignoreError: options.ignore,
    cwd: target.path,
    env: options.env
  };
};

proto.buildCommandString = function(target) {
  var options = this.options;
  var output = [this.npmName];

  if (target.pkg.scripts && target.pkg.scripts[options.command])
    output.push("run");

  output.push(options.command);

  if (options.restArgv && options.restArgv.length)
    output.push.apply(output, options.restArgv);

  return output.join(" ");
};

proto.runAtTarget = function(target) {
  var cmd = this.buildCommandString(target);
  var opts = this.getShellOptions(target);
  console.log("[%s] %s", target.relPath, cmd);
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
  function _delay(idx) {
    if (options.delay) {
      var ms = options.delay * idx;
      return delay(ms);
    }
    return Promise.resolve();
  }

  var self = this;
  var options = this.options;
  var targets = this.getTargets();

  if (options.concurrency) {
    var queue = createQueue({
      concurrency: options.concurrency,
      data: targets
    });
    return queue.run(function(target) {
      return self.runAtTarget(target);
    });
  } else {
    return Promise.all(targets.map(function(target, idx) {
      return _delay(idx).then(function() {
        return self.runAtTarget(target);
      });
    }));
  }
};

proto._runSelf = function() {
  return this.runAtTarget(this.root);
};

proto._readTargets = function() {
  function _scan(info, dirs) {
    var paths = dirs;

    if (!paths)
      paths = _parse(info.pkg);

    paths.forEach(function(path) {
      path = npath.resolve(info.path, path);
      if (!processed[path]) {
        processed[path] = true;
        var child = {
          path: path,
          relPath: npath.relative(rootPath, path),
          pkg: _readPackage(path, info.path)
        };
        if (options.recursive)
          _scan(child);
        targets.push(child);
      }
    });
  }

  function _parse(pkg) {
    function _add(section) {
      var obj = pkg.linkdeps;
      var deps = obj && obj.local && obj.local[section];
      if (deps) {
        for (var path in deps) {
          paths.push(path);
        }
      }
    }

    var items = pkg.topcmd && pkg.topcmd.targets || ["@linkdeps.local"];
    var paths = [];

    if (items) {
      items.forEach(function(item) {
        if (item === "@linkdeps.local") {
          _add("dependencies");
          _add("devDependencies");
        } else {
          paths.push(item);
        }
      });
    }

    return paths;
  }

  var options = this.options;
  var targets = [];
  var processed = {};
  var rootPath = this.root.path;

  _scan(this.root, options.dirs);

  return targets;
};

TopCommander.run = function(options) {
  return new TopCommander(options).run();
};

TopCommander.runAsMain = function(options) {
  return runAsMain(TopCommander.run(options));
};

module.exports = TopCommander;
