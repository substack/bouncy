var test = require('tap').test;
var http = require('http');
var https = require('https');
var bouncy = require('../');

var fs = require('fs');
var sOpts = {
    key : fs.readFileSync(__dirname + '/https/privatekey.pem'),
    cert : fs.readFileSync(__dirname + '/https/certificate.pem')
};

test('https', function (t) {
    t.plan(4);
    
    var s0 = https.createServer(sOpts, function (req, res) {
        res.setHeader('content-type', 'text/plain');
        res.write('beep boop');
        t.equal(req.url, '/beep');
        res.end();
    });
    s0.listen(connect);
    
    var s1 = bouncy(function (req, bounce) {
        bounce("https://localhost:"+s0.address().port+"/beep");
    });
    s1.listen(connect);
    
    var connected = 0;
    function connect () {
        if (++connected !== 2) return;
        var opts = {
            host : 'localhost',
            port : s1.address().port,
            path : '/beep',
            headers : { connection : 'close' }
        };
        
        http.get(opts, function (res) {
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
    }
});
