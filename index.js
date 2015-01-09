var fs = require('fs')
var path = require('path')
var mkdirp = require('mkdirp')
var helpers = require('broccoli-kitchen-sink-helpers')
var symlinkOrCopySync = require('symlink-or-copy').sync
var Writer = require('broccoli-writer')

module.exports = StaticCompiler
StaticCompiler.prototype = Object.create(Writer.prototype)
StaticCompiler.prototype.constructor = StaticCompiler
function StaticCompiler (inputTree, options) {
  if (!(this instanceof StaticCompiler)) return new StaticCompiler(inputTree, options)
  this.inputTree = inputTree
  this.options = options || {}
  this.inputFiles = null
}

StaticCompiler.prototype.isUnchanged = function () {
  var lastHash = this.inputFiles.hash,
      baseDir = this.inputFiles.baseDir,
      files = this.inputFiles.files;
 
  var hash = helpers.hashStrings( getFileKeys(baseDir, files) );
  return lastHash === hash;
}

StaticCompiler.prototype.write = function (readTree, destDir) {
  var self = this

  return readTree(this.inputTree).then(function (srcDir) {
    var sourcePath = path.join(srcDir, self.options.srcDir)
    var destPath   = path.join(destDir, self.options.destDir)

    if (self.options.files == null) {
      self._copy(sourcePath, destPath)
    } else {
      var baseDir = path.join(srcDir, self.options.srcDir)
      var files = helpers.multiGlob(self.options.files, {
        cwd: baseDir,
        root: baseDir,
        nomount: false
      })
      for (var i = 0; i < files.length; i++) {
        var fileSourcePath = path.join(sourcePath, files[i])
        var fileDestPath = path.join(destPath, files[i])

        self._copy(fileSourcePath, fileDestPath)
      }

      var hash = helpers.hashStrings( getFileKeys(baseDir, files) );
      self.inputFiles = { baseDir: baseDir,
                          files: files,
                          hash: hash };

    }
  })
}

StaticCompiler.prototype._copy = function (sourcePath, destPath) {
  if (destPath[destPath.length -1] === '/') {
    destPath = destPath.slice(0, -1)
  }

  var destDir = path.dirname(destPath)
  if (!fs.existsSync(destDir)) {
    mkdirp.sync(destDir)
  }

  // if destDir was / then remove the temp folder
  // created by broccoli-writer so we can symlink
  // directly
  if (this.tmpDestDir === destPath) {
    fs.rmdirSync(destPath);
  }
  symlinkOrCopySync(sourcePath, destPath)
}

function getFileKeys (baseDir, files) {
 
  var result = [],
      length = files.length,
      stats;
  
  for (var i = 0; i < length; i++) {
    stats = fs.lstatSync(path.join(baseDir, files[i]));
    result.push(stats.mode);
    result.push(stats.size);
    result.push(stats.mtime.getTime());
  }
 
  return result;
}
