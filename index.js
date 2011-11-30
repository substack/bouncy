var http = require('http');
var ServerResponse = http.ServerResponse;
var parsley = require('parsley');
var BufferedStream = require('morestreams').BufferedStream;

var insertHeaders = require('./lib/insert_headers');
var parseArgs = require('./lib/parse_args');

var net = require('net');
var tls = require('tls');

var bouncy = module.exports = function (opts, cb) {
    if (typeof opts === 'function') {
        cb = opts;
        opts = {};
    }
    
    if (opts && opts.key && opts.cert) {
        return tls.createServer(opts, handler.bind(null, cb));
    }
    else {
        return net.createServer(handler.bind(null, cb));
    }
};

var handler = bouncy.handler = function (cb, c) {
    parsley(c, function (req) {
        c.setMaxListeners(0);
        
        var stream = new BufferedStream;
        stream.pause();
        
        function onData (buf) {
            stream.write(buf);
        }
        
        req.socket.on('close', function() {
           stream.end(); 
        });

        req.on('rawHead', onData);
        req.on('rawBody', onData);
        
        req.on('rawEnd', function () {
            req.removeListener('rawHead', onData);
            req.removeListener('rawBody', onData);
        });
        
        function onHeaders () {
            req.removeListener('error', onError);
            var bounce = makeBounce(stream, c, req);
            cb(req, bounce);
        }
        req.on('headers', onHeaders);
        
        function onError (err) {
            req.removeListener('headers', onHeaders);
            var bounce = makeBounce(stream, c, req);
            cb(req, bounce);
            req.emit('error', err);
        }
        req.once('error', onError);
    });
};

function makeBounce (bs, client, req) {
    var bounce = function (stream, opts) {
        if (!stream || !stream.write) {
            opts = parseArgs(arguments);
            stream = opts.stream;
        }
        if (!opts) opts = {};
        
        if (!opts.headers) opts.headers = {};
        if (!('x-forwarded-for' in opts.headers)) {
            opts.headers['x-forwarded-for'] = client.remoteAddress;
        }
        if (!('x-forwarded-port' in opts.headers)) {
            var m = (req.headers.host || '').match(/:(\d+)/);
            opts.headers['x-forwarded-port'] = m && m[1] || 80;
        }
        if (!('x-forwarded-proto' in opts.headers)) {
            opts.headers['x-forwarded-proto'] =
                client.encrypted ? 'https' : 'http';
        }
        
        insertHeaders(bs.chunks, opts.headers);
        
        if (stream.writable && client.writable) {
            bs.pipe(stream);
            stream.pipe(client);
        }
        else {
            opts.emitter.emit('drop', client);
        }
        
        return stream;
    };
    
    bounce.respond = function () {
        var res = new ServerResponse(req);
        res.assignSocket(client);
        return res;
    };
    
    return bounce;
}
