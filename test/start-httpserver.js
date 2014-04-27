var port = 3000;
require('./httpServer').start(port, function () {
    console.log('http server start port: %s', port);
});