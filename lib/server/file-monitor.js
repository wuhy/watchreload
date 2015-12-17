/**
 * @file 文件监控
 * @author sparklewhy@gmail.com
 */
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var gaze = require('gaze');
var helper = require('../common/helper');

/**
 * 获取要监控的文件
 *
 * @param {{ include: Array.<string>, exclude: Array.<string> }} files 要监控的文件
 * @return {Array.<string>}
 */
function getWatchFiles(files) {
    var includeFiles = files.include || [];
    var excludeFiles = files.exclude || [];

    excludeFiles = excludeFiles.map(function (filePath) {
        return '!' + filePath;
    });

    return [].concat(includeFiles, excludeFiles);
}

/**
 * 创建文件监控实例
 *
 * @param {Object} options 文件监控选项信息
 * @param {{ include: Array.<string>, exclude: Array.<string> }} options.files
 *                 要监控的文件
 * @constructor
 * @extends {EventEmitter}
 */
function FileMonitor(options) {
    this._gaze = gaze();
    this.bindFileChangeListeners();

    options || (options = {});
    this.initWatchFiles(options.files);
}

util.inherits(FileMonitor, EventEmitter);

/**
 * 初始化要监控的文件
 *
 * @param {{ include: Array.<string>, exclude: Array.<string> }} files 要监控的文件
 * @private
 */
FileMonitor.prototype.initWatchFiles = function (files) {
    files || (files = {});
    this.files = files;
    this._gaze.add(getWatchFiles(files));
};

/**
 * 绑定文件变化事件处理器
 *
 * @private
 */
FileMonitor.prototype.bindFileChangeListeners = function () {
    helper.proxyEvents(this._gaze, this, [
        'all',
        'changed',
        'ready',
        'error',
        'added',
        'deleted'
    ]);
};

/**
 * 重启文件监控器
 *
 * @param {{ include: Array.<string>, exclude: Array.<string> }} files 要监控的文件
 */
FileMonitor.prototype.restart = function (files) {
    this.close();

    this.emit('restart');

    this._gaze = gaze();
    this.bindFileChangeListeners();
    this.initWatchFiles(files || this.files);
};

/**
 * 关闭文件监控
 */
FileMonitor.prototype.close = function () {
    if (this._gaze) {
        this._gaze.close(true);
    }

};

module.exports = exports = FileMonitor;


