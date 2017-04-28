import { meteor } from 'meteor/meteor';
import mumble from 'mumble';
import http from 'http';
import socketio from 'socket.io';
import ss from 'socket.io-stream';

var server = http.createServer();
var io = socketio(server);

function getRoomList(con, socket, user) {
    var people = [];
    var users = con.users();
    if(user != null)
        people.push({person: user.name});
    for(var u in users)
        people.push({person: users[u].name});
    console.log(people);
    socket.emit('getRoomList', people);
}

Meteor.startup(() => {
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
                connection.on('user-connect', function(user) {
                    getRoomList(connection, socket, user);
                });
                connection.on('user-disconnect', function(user) {
                    getRoomList(connection, socket, null);
                });
                connection.on('ready', function() {
                    getRoomList(connection, socket, null);

                    ss(socket).on('voice', function(stream) {
                        stream.pipe(connection.inputStream());
                    });
                });

                connection.authenticate(data);

                socket.on('disconnect', function() {
                    connection.disconnect();
                });
            });
        });
    });

    try {
        server.listen(8080);
    } catch(e) {
        cosole.log(e);
    }
});
