/**
 * @file 日志模块
 * @author sparklewhy@gmail.com
 */

var chalk = require('chalk');
var helper = require('./helper');

// 定义各个错误层级使用的颜色
var debug = chalk.green;
var info = chalk.green;
var warn = chalk.yellow;
var error = chalk.red;

// 定义各个层级log配置
var LOG_LEVEL = {
    debug: {
        id: 0,
        logger: console.log,
        prefix: debug('[DEBUG]')
    },
    info: {
        id: 1,
        logger: console.log,
        prefix: info('[INFO]')
    },
    warn: {
        id: 2,
        logger: console.warn,
        prefix: warn('[WARN]')
    },
    error: {
        id: 3,
        logger: console.error,
        prefix: error('[ERROR]')
    }
};

function padNum(num) {
    return helper.padNumber(num, 2);
}

/**
 * 获取当前系统时间
 * 
 * @return {string}
 */
function getCurrentTime() {
    var date = new Date();

    return date.getFullYear()
    + '-' + padNum(date.getMonth() + 1) 
    + '-' + padNum(date.getDate())
    + ' ' + padNum(date.getHours()) 
    + ':' + padNum(date.getMinutes()) 
    + ':' + padNum(date.getSeconds());
}

/**
 * 获取打印log的方法
 * 
 * @param {string} logLevel 要打印的log层级
 * @inner
 */
function getLogger(logLevel) {
    return function () {
        if (exports)
        var args = Array.prototype.slice.apply(arguments);
        var logType = LOG_LEVEL[logLevel] || LOG_LEVEL.info;

        args[0] = chalk.gray(getCurrentTime())
            + ' ' + logType.prefix + ' ' + args[0];
        logType.logger.apply(console, args);
    };
}

/**
 * 显示debug信息
 */
exports.debug = getLogger('debug');

/**
 * 显示info信息
 */
exports.info = getLogger('info');

/**
 * 显示警告信息
 */
exports.warn = getLogger('warn');

/**
 * 显示错误信息
 */
exports.error = getLogger('error');
