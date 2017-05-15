import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import './main.html';
var socket = require('socket.io-client')('http://localhost:8080');
var ss = require('socket.io-stream');
var getUserMedia = require('get-user-media-promise');
var MicrophoneStream = require('microphone-stream');
var microphone = null;
var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
var Writable = require('web-audio-stream/writable');

var writable = Writable(audioCtx.destination, {
    context: audioCtx,
    channels: 1,
    sampleRate: 48000,
    samplesPerFrame: 480,
    mode: Writable.BUFFER_MODE,
    audoend: true
});

function float32ToInt16(buffer) {
    var len = buffer.length;
    var buf = new Int16Array(len);

    while (len--)
        buf[len] = buffer[len] * 0xFFFF;
    
    return buf.buffer;
}

Session.set("room-list", [{ person: "not connected" }]);

socket.on('connect', function() {
    console.log('client connected');
});

socket.on('getRoomList', function(data) {
    Session.set("room-list", data);
});

ss(socket).on('voice', function(stream) {
    stream.on('data', function(data) {
        var floatArray = [];
        for(var i = 0; i < data.length; i+=2)
            floatArray.push(data.readInt16LE(i) / 0xFFFF);
        writable.write(floatArray);
    });
});

window.onbeforeunload = function(e) {
    socket.disconnect();
}

Template.main.helpers({
    room: function() {        
        return Session.get("room-list");
    },
});

Template.main.events = {
    'click #connect': function() {
        socket.emit('mumble-connect', $('#name').val());
    },
    'click #voice': function() {
        var ssStream = ss.createStream();
        ss(socket).emit('voice', ssStream);
        getUserMedia({video: false, audio: true})
            .then(function(stream) {
            var mic = new MicrophoneStream(stream, {objectMode: true, bufferSize: null});
            mic.on('data', function(chunk) {
                var buf = float32ToInt16(chunk.getChannelData(0));
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
