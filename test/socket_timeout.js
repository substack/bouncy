var test = require('tap').test;
var bouncy = require('../');
var http = require('http');
var net = require('net');

test('socket timeout', function (t) {
    t.plan(10);

    var s0 = http.createServer(function (req, res) {
        res.writeHead(200, {'Content-Type': 'text/plain'});
        setTimeout((function() {
            res.write('ping');
            res.end();
        }), 1500);
    });
    s0.listen(connect);

    var s1 = bouncy({socketTimeout: 1000}, function (req, bounce) {
        var s = bounce(s0.address().port);
        t.ok(s instanceof net.Stream, 'bounce() @ 1000 returns a stream');
    });
    s1.listen(connect);

    var s2 = bouncy({socketTimeout: 2000}, function (req, bounce) {
        var s = bounce(s0.address().port);
        t.ok(s instanceof net.Stream, 'bounce() @ 2000 returns a stream');
    });
    s2.listen(connect);

    var s3 = bouncy(function (req, bounce) {
        var s = bounce(s0.address().port);
        t.ok(s instanceof net.Stream, 'bounce() @ default returns a stream');
    });
    s3.listen(connect);

    function done () {
        s0.close();
        s1.close();
        s2.close();
        s3.close();
        t.end();
    }

    var connected = 0;
    function connect () {
        if (++connected !== 4) return;
        request(s1, 
            function () { t.ok(true, "timed out @ 1000") }, 
            function () { t.fail("should fail with timeout") }, 
            function () {
                request(s2, 
                    function () { t.fail("shouldn't fail") }, 
                    function (data) { t.equal(data, 'ping', "received proper response @ 2000") }, 
                    function () {
                        request(s3, 
                            function () { t.fail("shouldn't fail") }, 
                            function (data) { t.equal(data, 'ping', "received proper response @ default timeout"); }, 
                            function() {
                                done();
                            }
                        );
                    }
                );
            }
        );
    }
    
    function request (s, error, success, close) {
        var opts = {
            method : 'GET',
            host : 'localhost',
            headers : {
                host : 'example.com',
                connection : 'close'
            },
            port : s.address().port,
            path : '/',
        };
        var req = http.request(opts, function (res) {
            t.equal(res.statusCode, 200, "response status is 200/OK")
            t.equal(res.headers['content-type'], 'text/plain', "response type is text/plain");

            var data = '';
            res.on('data', function (buf) {
                data += buf.toString();
            });

            res.on('end', function () { success(data); close(); });
        });
        req.on('error', function () { error(); close(); });
        req.end();
    }
});
