/**
 * @file watchdog 模块信息
 * @author sparklewhy@gmail.com
 */

var fs = require('fs');
var path = require('path');

var pkgInfo = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, '../package.json')).toString()
);

/**
 * 该模块名称
 *
 * @type {string}
 */
exports.name = pkgInfo.name;

/**
 * 该模块的描述信息
 *
 * @type {string}
 */
exports.description = pkgInfo.description;

/**
 * 该模块的当前版本号
 *
 * @type {string}
 */
exports.version = pkgInfo.version;

/**
 * 默认自定义的配置文件
 *
 * @type {string}
 */
exports.customConfigFile = 'watchdog-config.js';

/**
 * 自定义配置文件的模板
 *
 * @type {string}
 */
exports.cusotmConfigTplFile = 'watch-config-tpl.js';
