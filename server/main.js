import { meteor } from 'meteor/meteor';
import mumble from 'mumble';
import http from 'http';
import socketio from 'socket.io';
import ss from 'socket.io-stream';

var cons = [];
var server = http.createServer();
var io = socketio(server);

io.on('connection', function(socket) {
    console.log('new client');

    socket.on('mumble-connect', function(data) {
        mumble.connect('localhost', {}, function (error, connection) {
            if(error) { throw new Error(error) };

            console.log('Connected');

            connection.on('initialized', function() {
                console.log('initilized');
            });
            connection.on('message', function(msg) {
                console.log(msg);
            });
            connection.on('voice-start', function(user) {
                console.log("VOICE START: " + user);
            });
            connection.on('voice-end', function(user) {
                console.log("VOICE END: " + user);
            });
            connection.on('voice', function(user) {
                console.log("VOICE " + user);
            });

            connection.authenticate(data);

            ss(socket).on('voice', function(stream) {
                stream.pipe(connection.inputStream());
            });
        });
    });
});

try {
    server.listen(8080);
} catch(e) {
    cosole.log(e);
}

Meteor.startup(() => {
    Meteor.methods({
        newCon: function (name) {
            mumble.connect('localhost', {}, function (error, connection) {
                if(error) { throw new Error(error) };

                console.log('Connected');

                connection.on('initialized', function() {
                    console.log('initilized');
                });
                connection.on('message', function(msg) {
                    console.log(msg);
                });
                connection.on('voice-start', function(user) {
                    console.log("VOICE START: " + user);
                });
                connection.on('voice-end', function(user) {
                    console.log("VOICE END: " + user);
                });
                connection.on('voice', function(user) {
                    console.log("VOICE " + user);
                });
                connection.on('initialized', function() {
                    //connection.outputStream().pipe(connection.inputStream());
                    //stream = process.stdin;
                    //stream.pipe(connection.inputStream());
                });

                var user = { con: connection, name: name };

                cons.push(user);

                connection.authenticate(name);
            });
        },
        // TODO: dont pass in name
        sendMsg: function(msg, name) {
            console.log(msg);
            var recp = { session: [], channel_id:[0]};
            
            for(var i = 0; i< cons.length; i++) {
                if(cons[i].name == name) {
                    cons[i].con.sendMessage(msg, recp);
                }
            }
        },
        sendVoice: function(name, data) {
            //console.log(name);
            /*
            var recp = { session: [], channel_id:[0]};
            for(var i = 0; i < cons.length; i++) {
                if(cons[i].name == name) {
                    var curCon = cons[i].con;
                }
            }
            */
        }
    });
});
