var test = require('tap').test;
var bouncy = require('../');
var ws = require('ws').Server;
var wc = require('ws');
var crypto = require('crypto');
require('buffertools');

test('ws_binary', function (t) {
    t.plan(2);
    crypto.randomBytes(5*1024*1024, function(ex, randomBuf) {
        if (ex) throw ex;
        
        var p0 = Math.floor(Math.random() * (Math.pow(2,16) - 1e4) + 1e4);
        var s0 = new ws({port: p0}, connect);
        s0.on('connection', function (c) {
            c.on('message', function (msg) {
                t.equal(0, msg.compare(randomBuf));
                c.send(msg, {binary: true});
                c.close();
            });
            c.on('error', function (error) {
                throw error;
            });
        });
            
        var p1 = Math.floor(Math.random() * (Math.pow(2,16) - 1e4) + 1e4);
        var s1 = bouncy(function (req, bounce) {
            bounce(p0);
        });
        s1.listen(p1, connect);
        
        var connected = 0;
        function connect () {
            if (++connected !== 2) return;
            
            var c = new wc('ws://localhost:' + p1 + '/');

            c.on('open', function () {
                c.send(randomBuf, {binary: true});
            });

            c.on('close', function () {
                s0.close();
                s1.close();
                t.end();
            });
            
            c.on('message', function (buf) {
                t.equal(0, buf.compare(randomBuf));
            });
        }
    });
});
