
module.exports = {

    
    port: 12345,

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