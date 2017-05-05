import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import './main.html';
var socket = require('socket.io-client')('http://localhost:8080');
var ss = require('socket.io-stream');
var getUserMedia = require('get-user-media-promise');
var MicrophoneStream = require('microphone-stream');
var microphone = null;
var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function bufferToFloat32(data) {
    var j = 0;
    var l = data.length;
    var out = new Float32Array(l/2);
    for(var i = 0; i < l; i+=2) {
        var sign = data[i+1] & (1 << 7);
        var result = (((data[i+1] & 0xFF) << 8) | (data[i] & 0xFF));
        if(sign)
            result = 0xFFFF0000 | result;
        out[i-j] = result / 0xFFFF;
        j++;
    }
    return out;
}

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
        var floatArray = bufferToFloat32(data);
        var audioBuffer = audioCtx.createBuffer(1, floatArray.length, audioCtx.sampleRate);
        var source = audioCtx.createBufferSource();
        audioBuffer.getChannelData(0).set(floatArray);
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.start();
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
