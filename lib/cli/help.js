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
        console.log(chalk.green('usage: '));
        console.log(chalk.cyan(cmd.usage) + chalk.gray(' - ' + cmd.description));

        if (cmd.optionsUsage) {
            console.log('\n' + chalk.green('options: '));
            console.log(chalk.cyan(cmd.optionsUsage));
        }
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
    var whitespaces = '  ';
    console.log(chalk.green(whitespaces + 'All available options and commands ：\n'));

    for (var i = 0, len = optionList.length; i < len; i++) {
        var option = optionList[i];
        console.log(whitespaces + chalk.cyan(option.usage) + ' - '
            + chalk.gray(option.description));
    }

    for (i = 0, len = cmdList.length; i < len; i++) {
        var cmd = cmdList[i];
        var usage = cmd.usage;
        console.log('\n' + whitespaces + chalk.cyan(usage) + ' - ' + chalk.gray(cmd.description));

        var optionsUsage = cmd.optionsUsage;
        if (optionsUsage) {
            optionsUsage = optionsUsage.replace(/\n/g, '\n' + whitespaces);
            console.log(chalk.cyan(whitespaces + optionsUsage));
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

exports.usage = 'watchreload --help | -h [<command>]';

exports.description = 'print the help information';

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