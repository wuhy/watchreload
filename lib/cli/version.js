/**
 * @file watchreload 版本信息
 * @author sparklewhy@gmail.com
 */

var watchreload = require('../watchreload');

exports.usage = 'watchreload --version | -v';

exports.description = 'print the version information of watchreload';

exports.run = function (args) {
    if (args.v || args.version) {
        console.log(watchreload.name + ' v' + watchreload.version);
        return true;
    }

    return false;
};
