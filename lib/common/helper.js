/**
 * @file 助手工具方法定义
 * @author  sparklewhy@gmail.com
 */
var util = require('util');
var spawn = require('child_process').spawn;
var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var pathUtil = require('path');
var os = require('os');
var _ = require('lodash');

/**
 * 读取文件内容，支持读取多个文件，读取完成，将触发 `done`
 * 事件，若读取成功将返回所有文件内容数组，顺序同传入的文件
 * 顺序，若有个文件读取失败，将结束文件读取。
 *
 * @param  {string|Array.<string>} files 要读取的文件路径
 * @return {event.EventEmitter}
 * @example
 *     readFiles(['a/b.js', 'a/c.js']).on('done', function (err, data) {
 *         if (err) {
 *             console.log(err);
 *         }
 *         else {
 *             // data is array
 *         }
 *     });
 */
exports.readFiles = function (files) {
    if (!util.isArray(files)) {
        files = [
            files
        ];
    }

    var processNum = files.length;
    var emitter = new EventEmitter();
    var result = [];
    var fileIdxMap = {};
    var doneNum = 0;

    files.forEach(function (filePath, idx) {
        fileIdxMap[filePath] = idx;

        fs.readFile(filePath, function (err, data) {
            if (!emitter) {
                return;
            }

            if (err) {
                emitter.emit('done', err);
                result = null;
                emitter = null;
                return;
            }

            result[fileIdxMap[filePath]] = data;
            doneNum++;

            if (doneNum === processNum) {
                emitter.emit('done', null, result);
                result = null;
                emitter = null;
            }

        });
    });

    return emitter;
};

/**
 * 处理事件代理
 *
 * @param  {EventEmitter} source 被代理的源对象
 * @param  {EventEmitter} target 要转发给的目标对象
 * @param  {string} eventName 要代理的事件名称
 * @param  {Object=} options 附件的选项
 * @param  {string|Function=} options.newEventName 代理后发射的新的事件名称
 *                            或自定义处理方法，若为空，默认跟原始名称一样
 * @param {boolean=} options.prependSourceArg 是否要追加事件源的 `source` 参数到
 *                            `target` 的事件回调参数里，可选，默认false
 * @inner
 */
function handleProxyEvent(source, target, eventName, options) {
    options || (options = {});
    var newEventName = options.newEventName;
    var prependSourceArg = options.prependSourceArg;

    source.on(eventName, function () {
        var newArgs = Array.prototype.slice.apply(arguments);
        prependSourceArg && newArgs.unshift(source);

        if (typeof newEventName === 'function') {
            newEventName.apply(target, newArgs);
        }
        else {
            newEventName || (newEventName = eventName);
            newArgs.unshift(newEventName);
            target.emit.apply(target, newArgs);
        }
    });
}

/**
 * 代理给定的源对象的事件，并将其转发给目标对象
 *
 * @param  {EventEmitter} source 被代理的源对象
 * @param  {EventEmitter} target 要转发给的目标对象
 * @param  {string|Array.<string>|Object} events 要代理的事件名称
 *         可以传入一个Object对象，key为原始对象名称，
 *         value为代理后要发射的新的事件名称或自定义的处理方法，
 *         如果要维持跟原来一样置为空串即可。
 * @param {boolean=} prependSourceArg 是否要追加事件源的 `source` 参数到 `target` 的
 *                                    事件回调参数里，可选，默认false
 * @example
 *     // 代理一个事件
 *     proxyEvents(source, target, 'change');
 *
 *     // 代理多个事件
 *     proxyEvents(source, target, ['change', 'add']);
 *
 *     // 自定义事件名称，change代理后变成myChange，add维持不变, 自定义的delete处理事件
 *     proxyEvents(source, target, { change: 'myChange', add: '', delete: function () {} });
 */
exports.proxyEvents = function (source, target, events, prependSourceArg) {
    var isArr = util.isArray(events);
    if (!isArr && typeof events === 'string') {
        events = [
            events
        ];
        isArr = true;
    }

    var eventName;
    for (var k in events) {
        if (events.hasOwnProperty(k)) {
            eventName = isArr ? events[k] : k;
            handleProxyEvent(source, target, eventName, {
                newEventName: isArr ? '' : events[k],
                prependSourceArg: prependSourceArg
            });
        }

    }
};

/**
 * 对于不满足位数的数用0填充
 *
 * @param  {number} value  要填充的数
 * @param  {number} bitNum 要显示的位数
 * @param  {string=} padValue 要填充的值，可选，默认0
 * @return {string}
 */
exports.padNumber = function (value, bitNum, padValue) {
    value = String(value);

    var padItems = [];
    padValue || (padValue = 0);
    for (var i = 0, len = bitNum - value.length; i < len; i++) {
        padItems[padItems.length] = padValue;
    }

    return padItems.join('') + value;
};

/**
 * 获取给定文件路径的扩展名称
 *
 * @param  {string} filePath 文件路径
 * @return {string}
 */
exports.getFileExtName = function (filePath) {
    var result = /\.([^\.\/\\]*)$/.exec(filePath);

    if (result && result.length === 2) {
        return result[1];
    }

    return '';

};

/**
 * 给定的文件是否是给定的扩展名类型的文件
 *
 * @param {string} filePath 文件路径
 * @param {string|function ({path: string, extName: string}):boolean} extNames
 *        文件扩展名称，扩展名称以逗号分隔; 或者自定义的文件类型判断方法
 * @return {boolean}
 */
exports.isFileTypeOf = function (filePath, extNames) {
    if (!extNames) {
        return false;
    }

    var fileExtName = exports.getFileExtName(filePath).toLowerCase();
    var paramType = typeof extNames;
    if (paramType === 'string') {
        var extNameArr = extNames.split(',');
        extNameArr.map(function (value) {
            return String(value).trim().toLowerCase();
        });
        return extNameArr.indexOf(fileExtName) !== -1;
    }

    if (paramType === 'function') {
        return extNames({
            path: filePath,
            extName: fileExtName
        });
    }

};

/**
 * 获取文件类型信息，如果给定的文件类型未在 `fileTypes` 里定义，返回的 `type` 为 undefined
 *
 * @param {string} filePath 文件路径
 * @param {Object} fileTypes 文件类型定义，key为文件类型名，value为文件类型定义
 * @return {{ type: string, extName: string }}
 * @exampe
 *      getFileTypeInfo('a/b.js', { script: 'js', css: 'less,css' })
 *      // output: { type: 'script', extName: 'js' }
 */
exports.getFileTypeInfo = function (filePath, fileTypes) {
    var fileType;
    for (var type in fileTypes) {
        if (fileTypes.hasOwnProperty(type)) {
            if (exports.isFileTypeOf(filePath, fileTypes[type])) {
                fileType = type;
                break;
            }
        }

    }

    return {
        type: fileType,
        extName: exports.getFileExtName(filePath)
    };
};

/**
 * 获取给定的完整路径相对于当前执行目录的相对路径，同时将路径里的 `\` 转成 `/`
 *
 * @param {string=} basePath 要相对的基路径，可选，默认基于当前工作目录
 * @param {string} filePath 文件路径
 * @return {string}
 */
exports.getRelativePath = function (basePath, filePath) {
    if (arguments.length === 1) {
        filePath = basePath;
        basePath = null;
    }

    basePath || (basePath = process.cwd());

    return pathUtil.relative(basePath, pathUtil.resolve(filePath)).replace(/\\/g, '/');
};

/**
 * 将给定的 filePath 规范化为绝对路径
 *
 * @param {string=} basePath 要相对的基路径，可选，默认基于当前工作目录
 * @param {string} filePath 要获取绝对路径的原始路径
 * @return {string}
 */
exports.resolvePath = function (basePath, filePath) {
    if (arguments.length === 1) {
        filePath = basePath;
        basePath = null;
    }

    if (basePath) {
        return pathUtil.resolve(basePath, filePath);
    }

    return pathUtil.resolve(filePath);

};

/**
 * 获取本机非内部的IPv4地址，如果获取不到，返回默认的本机IP地址：127.0.0.1
 *
 * @return {Array.<string>}
 */
exports.getIPv4 = function () {
    var networkInterfaces = os.networkInterfaces();
    var foundIPv4s = [];

    var checkIP = function (addressInfo) {
        if (addressInfo.internal === false && addressInfo.family === 'IPv4') {
            foundIPv4s.push(addressInfo.address);
        }

    };

    for (var network in networkInterfaces) {
        if (networkInterfaces.hasOwnProperty(network)) {
            var networkInfo = networkInterfaces[network];
            networkInfo.forEach(checkIP);
        }

    }

    if (!foundIPv4s.length) {
        foundIPv4s.push('127.0.0.1');
    }

    return foundIPv4s;

};


/**
 * spawn一个子进程，默认在当前工作目录执行，继承父进程的输入输出。
 *
 * 由于 spawn 只能执行 windows exe 的命令，对于批处理文件无法执行，虽然使用exec可以执行，但
 * 由于exec是阻塞式执行，子进程的输出无法被父进程捕获输出。
 *
 * Refer: https://github.com/joyent/node/issues/2318
 *
 * 这里解决办法：通过使用windows下的cmd来执行
 *
 * @param {string} command 要执行的命令
 * @param {Array.<string>} args 执行的命令的参数列表
 * @param {Object} options spawn的选项，参见node api 官网说明
 * @return {ChildProcess }
 */
exports.spawn = function (command, args, options) {
    var winCmd = process.env.comspec;

    return spawn(winCmd || command, winCmd ? [
        '/c'
    ].concat(command, args) : args, _.merge({
        stdio: 'inherit',
        cwd: process.cwd()
    }, options || {}));
};

/**
 * spawn一个子进程，执行给定的shell
 *
 * @param {string} shell 要执行的shell脚本
 * @param {Object} options spawn的选项，参见node api 官网说明
 * @return {ChildProcess}
 */
exports.spawnShell = function (shell, options) {
    var args = shell.split(' ');
    args = args.filter(function (item) {
        return item;
    });

    var cmd = args.shift();
    return exports.spawn(cmd, args, options);
};
