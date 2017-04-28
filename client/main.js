import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import './main.html';
var socket = require('socket.io-client')('http://localhost:8080');
var ss = require('socket.io-stream');
var getUserMedia = require('get-user-media-promise');
var MicrophoneStream = require('microphone-stream');
var microphone = null;

Session.set("room-list", [{ person: "not connected" }]);

socket.on('connect', function() {
    console.log('client connected');
});

socket.on('getRoomList', function(data) {
    Session.set("room-list", data);
});

window.onbeforeunload = function(e) {
    socket.disconnect();
}

function convertFloat32ToInt16(buffer) {
    var len = buffer.length;
    var buf = new Int16Array(len);

    while (len--)
        buf[len] = buffer[len] * 0xFFFF;

    return buf.buffer;
}

Template.tester.helpers({
    room: function() {        
        return Session.get("room-list");
    },
});

Template.tester.events = {
    'click #connect': function() {
        socket.emit('mumble-connect', $('#name').val());
    },
    'click #message': function() {
        Meteor.call('sendMsg', $('#msg').val(), $('#name').val(), function(error, response) {
            console.log(response);
        });
    },
    'click #voice': function() {
        var ssStream = ss.createStream();
        ss(socket).emit('voice', ssStream);
        getUserMedia({video: false, audio: true})
            .then(function(stream) {
            var mic = new MicrophoneStream(stream, {objectMode: true, bufferSize: null});
            mic.on('data', function(chunk) {
                var buf = convertFloat32ToInt16(chunk.getChannelData(0));
                ssStream.write(new ss.Buffer(buf));
            });
            microphone = mic;
        });
    },
    'click #stop-voice': function() {
        if(microphone != null) {
            microphone.stop();
            microphone = null;
        }
    },
};
