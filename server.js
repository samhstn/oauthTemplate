var Hapi = require('hapi');
var inert = require('inert');
var vision = require('vision');
var Path = require('path');
var http = require('https');
var querystring = require('querystring');
var url = require('url');
require('env2')('config.env');
var server = new Hapi.Server();
var port = 4000 || process.env.PORT;

server.connection({
    port: port
});

server.register([vision, inert], function() {
    server.views({
        engines: {
            html: require('handlebars')
        },
        relativeTo: __dirname,
        path: './views'
    });
});

function makeRequest(options, cb){
    var request = http.request(options, function(response){
        var body = '';
        response.on('data', function(chunk){
            body += chunk;
        });
        response.on('end', function(){
            cb(null, body);
        });
    });
    request.write(options.body);
    request.end();
}

server.route([
    {
        path: '/login',
        method: 'GET',
        handler: function(request, reply){
            reply.redirect('https://github.com/login/oauth/authorize?' + 'client_id=' + process.env.GITHUB_CLIENT_ID + '&redirect_uri=' + process.env.BASE_URL + '/welcome');
        }
    },
    {
        path: '/welcome',
        method: 'GET',
        handler: function(request, reply){
            var options = {
                hostname: 'github.com',
                path: '/login/oauth/access_token',
                method: 'POST',
                headers: {
                    Accept: 'application/json'
                },
                body: querystring.stringify({
                    client_id: process.env.GITHUB_CLIENT_ID,
                    client_secret: process.env.GITHUB_CLIENT_SECRET,
                    code: request.query.code
                })
            };
            function cb(err, response){
                var token = JSON.parse(response).access_token;
                reply.view('index').state('access_token', token);
            }
            makeRequest(options, cb);
        }
    },
    {
        method: 'GET',
        path: '/{param*}',
        handler: {
            directory: {
                path: 'public',
                redirectToSlash: true,
                index: true
            }
        }
    }
]);

module.exports = server;
