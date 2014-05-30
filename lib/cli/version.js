/**
 * @file watchreload 版本信息
 * @author sparklewhy@gmail.com
 */

var watchreload = require('../watchreload');

exports.usage = 'watchreload --version | -v';

exports.description = '打印当前使用的版本信息';

exports.run = function (args) {
    if (args.v || args.version) {
        console.log(watchreload.name + ' v' + watchreload.version);
        return true;
    }

    return false;
};