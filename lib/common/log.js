/**
 * @file 日志模块
 * @author sparklewhy@gmail.com
 */

var chalk = require('chalk');
var helper = require('./helper');

/* eslint-disable fecs-camelcase */
/**
 * 打印的 log 层级定义
 *
 * @type {string}
 * @private
 */
var _logLevel = 'info';
/* eslint-enable fecs-camelcase */

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

    return date.getFullYear() + '-' + padNum(date.getMonth() + 1)
        + '-' + padNum(date.getDate()) + ' ' + padNum(date.getHours())
        + ':' + padNum(date.getMinutes()) + ':' + padNum(date.getSeconds());
}

/**
 * 获取打印log的方法
 *
 * @inner
 * @param {string} logLevel 要打印的log层级
 * @return {Function}
 */
function getLogger(logLevel) {
    return function () {
        var logType = LOG_LEVEL[logLevel];
        if (logType.id < _logLevel) {
            return;
        }

        var args = Array.prototype.slice.apply(arguments);
        args[0] = chalk.gray(getCurrentTime()) + ' ' + logType.prefix + ' ' + args[0];
        logType.logger.apply(console, args);
    };
}

/**
 * 设置打印 log 的层级，默认打印层级为 `info`
 * log层级大小定义：
 * debug > info > warn > error
 *
 * @param {string} level 要打印的层级，所有低于给定层级都不打印
 */
exports.setLogLevel = function (level) {
    level && (level = String(level).toLowerCase());
    if (!level || !LOG_LEVEL[level]) {
        level = 'info';
    }

    _logLevel = level;
};

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
