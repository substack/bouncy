var test = require('tap').test;
var bouncy = require('../');
var http = require('http');
var net = require('net');
var through = require('through');

var postData = '';

for (var x = 0; x < 10000000; x++) {
    postData += String.fromCharCode((x % 26) + 97);
}

test('POST large data', function (t) {
    t.plan(3);
    t.on('end', function () {
        b.close();
        s.close();
    });
    
    var b = bouncy(function (req, res, bounce) {
        t.equal(req.method, 'POST');
        t.equal(req.headers['content-length'], String(postData.length));
        bounce(s.address().port);
    });
    var s = http.createServer(function (req, res) {
        req.pipe(res);
    });
    s.listen(0);
    
    b.listen(function () {
        var c = net.connect(b.address().port);
        c.write([
            'POST / HTTP/1.1',
            'Host: localhost',
            'Content-Length: ' + String(postData.length),
            'Connection: close',
            '',
            postData
        ].join('\r\n'));
        
        var data = '';
        c.pipe(through(write, end));
        function write (buf) { data += buf }
        function end () {
            //strip off response headers and filter out lengths that
            //show up every 10000 bytes or so. I'm not sure what that's
            //all about. Is it part of HTTP chunked encoding?
            data = data.split('\r\n').map(function (chunk, i) {
                if (i > 5 && !(i % 2)) {
                    return chunk;
                }
            }).filter(function (chunk) {
                return chunk; 
            }).join('');

            t.equal(data, postData);
            c.end();
        }
    });
});
