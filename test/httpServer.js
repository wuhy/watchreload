var http = require('http');
var connect = require('connect');
var server;
exports.start = function (port, callback) {
    var app = connect();
    app.use(connect.static(__dirname + '/fixtures/resource'));
    server = http.createServer(app).listen(port, callback);
};

exports.close = function (callback) {
    if (server) {
        server.close(callback);
        server = null;
    }
};