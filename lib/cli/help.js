/**
 * @file watchreload 帮助信息
 * @author sparklewhy@gmail.com
 */

var chalk = require('chalk');
var cmdList = [require('./init'), require('./start')];
var optionList = [require('./version'), exports];

/**
 * 显示给定的命令的帮助信息
 *
 * @inner
 * @param {string} cmdName 要显示帮助信息的命令名称
 */
function showCommandHelp(cmdName) {
    var cmd;
    cmdList.some(function (item) {
        if (item.commandName === cmdName) {
            cmd = item;
            return true;
        }
    });

    if (cmd) {
        console.log(chalk.green(cmdName + ' usage: ')
            + chalk.cyan(cmd.usage) + ' ' + cmd.description);
        return;
    }
    else {
        console.log(chalk.red('Unknown command: ' + cmdName));
    }
}

/**
 * 显示 watchreload 的所有命令选项帮助信息
 */
exports.showAllOptionCommandHelpInfo = function () {
    console.log(chalk.green('\n  所有可用的命令和选项：\n'));

    var cmdOptions = exports.COMMAND_OPTIONS;
    for (var k in cmdOptions) {
        if (cmdOptions.hasOwnProperty(k)) {
            var cmd = cmdOptions[k];
            console.log('  ' + chalk.cyan(cmd.usage) + ' '
                + cmd.description + '\n');
        }
    }
};

/**
 * 所有可用的命令选项列表
 *
 * @type {Array.<Object>}
 * @const
 */
exports.COMMAND_OPTIONS = [].concat(cmdList, optionList);

exports.usage = 'watchreload --help | -h';

exports.description = '打印使用信息';

exports.run = function (args) {
    var cmdName = args.help || args.h;

    if (cmdName) {
        if (typeof cmdName === 'string') {
            showCommandHelp(cmdName);
        }
        else {
            exports.showAllOptionCommandHelpInfo();
        }

        return true;
    }

    return false;
};