/**
 * @file watchdog 命令行执行入口
 * @author sparklewhy@gmail.com
 */

var fs = require('fs');
var pathUtil = require('path');
var chalk = require('chalk');
var minimist = require('minimist');
var watchdog = require('./watchdog');

/**
 * 命令行的命令类型定义
 *
 * @type {Object}
 */
exports.command = {
    version: {
        usage: 'watchdog --version | -v',
        description: '打印当前使用的版本信息',
        run: function () {
            console.log(watchdog.name + ' v' + watchdog.version);
        }
    },
    help: {
        usage: 'watchdog --help | -h',
        description: '打印使用信息',
        run: function () {
            console.log(chalk.green('\n  所有可用的命令和选项：\n'));
            var commands = exports.command;
            for (var k in commands) {
                var cmd = commands[k];
                console.log('  ' + chalk.cyan(cmd.usage) + ' ' + cmd.description + '\n');
            }
        }
    },
    init: {
        usage: 'watchdog init',
        description: '创建监控配置文件',
        run: function () {
            var outputFilePath = pathUtil.resolve('./' + watchdog.customConfigFile);

            if (fs.existsSync(outputFilePath)) {
                console.log(
                    'The config file is existed:\n%s', chalk.green(outputFilePath)
                );
                return;
            }

            fs.readFile(
                pathUtil.resolve(__dirname, watchdog.cusotmConfigTplFile),
                function (err, data) {
                    if (err) {
                        console.err(err);
                        return;
                    }

                    fs.writeFileSync(outputFilePath, data);
                    console.log(
                        'Init done. The config file is created:\n%s',
                        chalk.green(outputFilePath)
                    );
                }
            );
        }
    },
    start: {
        usage: 'watchdog start [--port <port>] [--configFile <filePath>]',
        description: '启动监控服务器',
        run: function (options) {
            require('./index').main({
                port: options.port,
                configFile: options.configFile
            });
        }
    }
};

/**
 * 显示watchdog描述信息
 */
exports.showDescription = function () {
    console.log(watchdog.name + ' - ' + watchdog.description + '\n'
        + '输入 ' + exports.command.help.usage + ' 显示可用的命令选项信息');
};

/**
 * 显示帮助信息
 *
 * @param {boolean}  isValid 是否当然输入是有效的
 */
function promptHelpInfo(isValid) {
    if (!isValid) {
        console.log(chalk.red('\n输入的命令或选项信息无效\n'));
        exports.command.help.run();
    }
    else {
        exports.showDescription();
    }
}

/**
 * 运行命令行命令
 */
exports.run = function () {
    var inpuArgs = process.argv.slice(2);
    var args = minimist(inpuArgs);

    var command = exports.command;
    if (args.h || args.help) {
        command.help.run();
    }
    else if (args.v || args.version) {
        command.version.run();
    }
    else {
        var cmdTypes = args._;

        if (cmdTypes.length === 0) {
            promptHelpInfo(!inpuArgs.length);
        }
        else {
            var cmd = cmdTypes.shift();
            var runCmd = command[cmd];
            if (runCmd) {
                runCmd.run(args);
            }
            else {
                promptHelpInfo(false);
            }
        }
    }
};