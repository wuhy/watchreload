
module.exports = {

    
    port: 12345,

    debug: true,

    client: {
        messageTypes: ['command', 'reloadPage']
    },

    
    files: {
        include: [
            'test/fixtures/resource/**/*'
        ],
        exclude: []
    }
};