var path = require('path');
var fs = require('fs');

var WatchServer = require('../../lib/server/watch-server');
var watchHandler = require('../../lib/server/watch-handler');

var fixturesBaseDir = path.join(__dirname, '..', 'fixtures');
var staticResourceBaseDir = path.join(fixturesBaseDir, 'resource');

exports.createWatchServer = function (options) {
    options || (options = {});

    // 创建文件监控server实例
    var server = new WatchServer({
        port: options.port,
        configFile: options.configFile
    });
    server.start();

    server.bindListeners(watchHandler);
    server.bindListeners(server.options.watch);

    return server;
};

exports.removeComments = function (str) {
    return str && str.replace(/(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg, '');
};

exports.editJSResourceFile = function (file, edit) {
    exports.editFileAndSave(
        path.join(staticResourceBaseDir, 'js', file),
        edit || function (data) {
            var content = data.toString();
            var editContent = 'var a = 1;';
            if (content === editContent) {
                return '';
            }
            else {
                return editContent;
            }
        }
    );
};

exports.editCSSResourceFile = function (file, edit) {
    exports.editFileAndSave(
        path.join(staticResourceBaseDir, 'css', file),
        edit || function (data) {
            var content = data.toString();
            var editContent = 'body { background-color: #CCC; }';
            if (content === editContent) {
                return '';
            }
            else {
                return editContent;
            }
        }
    );
};

exports.getConfigFile = function (basePath, file) {
    if (arguments.length === 1) {
        file = basePath;
        basePath = null;
    }
    return path.join(basePath || fixturesBaseDir, file || 'watchdog-config.js');
};

exports.backupFile = function (path) {
    var newPath = path + '.bak';
    fs.writeFileSync(newPath, fs.readFileSync(path));

    return newPath;
};

exports.recoverFile = function (backFilePath, targetFilePath, deleteBackFile) {
    fs.writeFileSync(targetFilePath, fs.readFileSync(backFilePath));
    if (deleteBackFile) {
        exports.deleteFile(backFilePath);
    }
};

exports.editFileAndSave = function (path, edit) {
    fs.writeFileSync(path, edit(fs.readFileSync(path)));
};

exports.deleteFile = function (path) {
    fs.unlinkSync(path);
};