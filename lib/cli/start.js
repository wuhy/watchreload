/**
 * @file 启动 watchreload
 * @author sparklewhy@gmail.com
 */

exports.commandName = 'start';

exports.usage = 'watchreload start';

exports.optionsUsage = ''
    + '--port <port>        the port to listen \n'
    + '--config <filePath>  the watch config file path \n'
    + '--base <basePath>    the working directory or the web root \n'
    + '--open [<browser>]   the browser to auto open, sperate with comma \n'
    + '                     if more than one, if none, open the default \n'
    + '--openPath <urlPath> the path to visit when auto open browser \n'
    + '                     e.g., index/main.html';


exports.description = 'start watchreload server';

exports.run = function (args, cmd) {
    if (cmd === exports.commandName) {
        var openOption = args.open;

        var autoOpen;
        (typeof openOption !== 'undefined') && (autoOpen = !!openOption);

        var openBrowser;
        if (autoOpen && typeof openOption === 'string') {
            openBrowser = openOption.split(',');
            openBrowser = openBrowser.map(function (item) {
                return item.trim();
            });
        }

        require('watchreload-server').start({
            port: args.port,
            configFile: args.config,
            basePath: args.base,
            autoOpen: autoOpen,
            openBrowser: openBrowser,
            openPath: args.openPath
        });

        return true;
    }

    return false;
};
