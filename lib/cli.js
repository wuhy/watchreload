/**
 * @file watchreload 命令行执行入口
 * @author sparklewhy@gmail.com
 */

var chalk = require('chalk');
var minimist = require('minimist');
var watchreload = require('./watchreload');

var help = require('./cli/help');

/**
 * 显示 watchdog 描述信息
 */
exports.showDescription = function () {
    console.log(watchreload.name + ' - ' + watchreload.description + '\n' + '输入 ' + help.usage + ' 显示可用的命令选项信息');
};

/**
 * 运行命令行命令
 */
exports.run = function () {
    var inpuArgs = process.argv.slice(2);

    if (!inpuArgs.length) {
        exports.showDescription();
        return;
    }

    var args = minimist(inpuArgs);
    var cmdTypes = args._;
    var type = cmdTypes[0];

    var hasRun = false;
    var availableCmds = help.COMMAND_OPTIONS;
    for (var i = 0, len = availableCmds.length; i < len; i++) {
        var cmd = availableCmds[i];
        if (cmd.run(args, type)) {
            hasRun = true;
            break;
        }

    }

    if (!hasRun) {
        console.log(chalk.red('输入的命令或选项信息无效'));
    }

};
