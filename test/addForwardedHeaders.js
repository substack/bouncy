var test = require('tap').test;
var http = require('http');
var net = require('net');
var bouncy = require('../');

test('x-forwarded-for', function (t) {
    var s0 = http.createServer(function (req, res) {
        res.setHeader('content-type', 'text/plain');
        res.write('beep boop');
        t.equal(req.headers['x-forwarded-for'], '127.0.01');
        res.end();
    });
    s0.listen(connect);
    
    var s1 = bouncy(function (req, bounce) {
        bounce({
            port: s0.address().port, 
            addForwardedHeaders: true
        });
    });
    s1.listen(connect);
    
    var connected = 0;
    function connect () {
        if (++connected !== 2) return;
        var opts = {
            method : 'GET',
            host : 'localhost',
            port : s1.address().port,
            path : '/',
            headers : { connection : 'close' }
        };
        var req = http.request(opts, function (res) {
            t.equal(res.statusCode, 200)
            t.equal(res.headers['content-type'], 'text/plain');
            
            var data = '';
            res.on('data', function (buf) {
                data += buf.toString();
            });
            
            res.on('end', function () {
                t.equal(data, 'beep boop');
                s0.close();
                s1.close();
                t.end();
            });
        });
        req.end();
    }
});
