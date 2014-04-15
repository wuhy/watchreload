require('should');
var helper = require('./helper');
var protocolCommand = require('../../lib/server/protocol').Command;

describe('watch file change', function () {

    var watchServer = helper.createWatchServer({
        port: 12346,
        configFile: helper.getConfigFile('watchdog-config.js')
    });
    var jsFile = 'test.js';

    it('JS file change must fire fileAll and send reloadPage event', function (done) {
        var doneCount = 0;
        watchServer.once('fileAll', function (event, filePath) {
            (new RegExp(jsFile + '$')).test(filePath).should.ok;
            event.should.equal('changed');

            (++doneCount === 2) && done();
        });

        watchServer.once('command', function (data) {
            if ((new RegExp(jsFile + '$')).test(data.path)
                && data.type === protocolCommand.reloadPage
                ) {

                if (++doneCount === 2) {
                    done();
                }
            }
        });

        helper.editJSResourceFile(jsFile);
    });

    it('CSS file change must send cssReload event to client', function (done) {
        var cssFile = 'main.css';
        watchServer.once('command', function (data) {
            if ((new RegExp(cssFile + '$')).test(cssFile)
                && data.type === protocolCommand.reloadCSS
                ) {
                done();
            }
        });

        helper.editCSSResourceFile(cssFile);
    });

    it('must reload when config file change', function (done) {
        var configFile = watchServer.configFile;
        var backFile = helper.backupFile(configFile);

        watchServer.once('watchConfigChange', function () {
            helper.recoverFile(backFile, configFile, true);
            done();
        });

        helper.editFileAndSave(configFile, function (data) {
            return helper.removeComments(data.toString());
        });
    });

});