/**
 * @file 初始化 watchreload 项目的配置文件
 * @author sparklewhy@gmail.com
 */

var chalk = require('chalk');
var fs = require('fs');
var pathUtil = require('path');

var watchreload = require('../watchreload');

exports.commandName = 'init';

exports.usage = 'watchreload init';

exports.description = 'create watch config file';

exports.run = function (args, type) {
    if (type === exports.commandName) {
        var outputFilePath = pathUtil.resolve('./' + watchreload.customConfigFile);

        if (fs.existsSync(outputFilePath)) {
            console.log('The config file is existed:\n%s', chalk.green(outputFilePath));
        }
        else {
            fs.readFile(pathUtil.join(__dirname, '..', watchreload.cusotmConfigTplFile), function (err, data) {
                if (err) {
                    console.err(err);
                    return;
                }

                fs.writeFileSync(outputFilePath, data);
                console.log('Init done. The config file is created:\n%s', chalk.green(outputFilePath));
            });
        }

        return true;
    }

    return false;
};
