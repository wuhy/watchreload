/**
 * @file 启动 watchreload
 * @author sparklewhy@gmail.com
 */

exports.commandName = 'start';

exports.usage = 'watchreload start [--port <port>] [--config <filePath>] [--base <basePath>]';

exports.description = '启动监控服务器';

exports.run = function (args, cmd) {
    if (cmd === exports.commandName) {
        require('../index').main({
            port: args.port,
            configFile: args.config,
            basePath: args.base
        });

        return true;
    }

    return false;
};