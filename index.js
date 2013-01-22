var httpRaw = require('http-raw');

var insertHeaders = require('./lib/insert_headers');
var updatePath = require('./lib/update_path');
var parseArgs = require('./lib/parse_args');

var bouncy = module.exports = function (opts, cb) {
    if (typeof opts === 'function') {
        cb = opts;
        opts = {};
    }
    
    var createServer = opts && opts.key && opts.cert
        ? function (cb_) { return httpRaw.https(opts, cb_) }
        : httpRaw.http
    ;
    
    var server = createServer(function (req, res) {
        var bounce = makeBounce(req, res);
        if (cb.length === 3) {
            cb(req, res, bounce);
        }
        else cb(req, bounce);
    });
    
    server.on('upgrade', function (req, sock, buf) {
        if (req.headers.upgrade || req.method === 'CONNECT') {
            var bounce = makeBounce(req, sock);
            if (cb.length === 3) {
                cb(req, null, bounce);
            }
            else cb(req, bounce);
            
            sock.on('end', function () {
                req.destroy();
            });
        }
    });
    
    return server;
};


function makeBounce (req, res) {
    var bounce = function (stream, opts) {
        var rs = req.createRawStream();
        var ws = res.createRawStream && res.createRawStream() || res;
        
        if (!stream || !stream.write) {
            opts = parseArgs(arguments);
            stream = opts.stream;
        }
        if (!opts) opts = {};
        
        if (!opts.headers) opts.headers = {};
        if (!('x-forwarded-for' in opts.headers)) {
            opts.headers['x-forwarded-for'] = req.connection.remoteAddress;
        }
        if (!('x-forwarded-port' in opts.headers)) {
            var m = (req.headers.host || '').match(/:(\d+)/);
            opts.headers['x-forwarded-port'] = m && m[1] || 80;
        }
        if (!('x-forwarded-proto' in opts.headers)) {
            opts.headers['x-forwarded-proto'] =
                req.connection.encrypted ? 'https' : 'http';
        }
        
        insertHeaders(rs.buffers, opts.headers);
        if (opts.path) updatePath(rs.buffers, opts.path);
        
        if (stream.writable) {
            rs.pipe(stream, { end : false });
            stream.pipe(ws);
        }
        else if (opts.emitter) {
            opts.emitter.emit('drop', ws);
        }
        
        stream.on('error', function (err) {
            if (stream.listeners('error').length === 1) {
                // destroy the request and stream if nobody is listening
                req.destroy();
                stream.destroy();
            }
        });
        
        stream.on('close', function () {
            _onclose.forEach(function (fn) { fn() });
        });
        
        return stream;
    };
    
    var _onclose = [];
    bounce._onclose = function (fn) {
        _onclose.push(fn);
    };
    
    return bounce;
}
