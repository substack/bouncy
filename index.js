var http = require('http');
var https = require('https');
var through = require('through');
var parseArgs = require('./lib/parse_args.js');
var insert = require('./lib/insert');
var nextTick = typeof setImmediate !== 'undefined'
    ? setImmediate
    : process.nextTick
;

module.exports = function (opts, cb) {
    if (typeof opts === 'function') {
        cb = opts;
        opts = {};
    }
    if (!opts) opts = {};
    if (typeof opts === 'object' && opts.listen) opts = { server: opts };
    
    var ssl = Boolean(opts.key || opts.pfx);
    var connectionEvent = ssl ? 'secureConnection' : 'connection';
    
    var server = opts.server || (ssl
        ? https.createServer(opts)
        : http.createServer()
    );
    server.on(connectionEvent, function (stream) {
        var src = stream._bouncyStream = stealthBuffer();
        
        // hack to work around a node 0.10 bug:
        // https://github.com/joyent/node/commit/e11668b244ee62d9997d4871f368075b8abf8d45
        if (/^v0\.10\.\d+$/.test(process.version)) {
            var ondata = stream.ondata;
            var onend = stream.onend;
            
            //first data event, fires once time
            stream.ondata = function (buf, i, j) {
                var res = ondata(buf, i, j);
                src.write(buf.slice(i, j));
                return res;
            };
            //second data event, fires other times
            stream.on('data',function(buf){
                src.write(buf);
            });
            
            //does not fires with websocket connection
            stream.onend = function () {
                var res = onend();
                src.end();
                return res;
            };
            
            //fires when websocket connection ends
            stream.on('end',function(){
                src.end();
            });
        }
        else stream.pipe(src);
    });
    
    server.on('upgrade', onrequest);
    server.on('request', onrequest);
    return server;
    
    function onrequest (req, res) {
        //This somehow fixes issues #60 and 61 - multipart and long POST issues
        req.on('data', function (buf) {});
        
        var src = req.connection._bouncyStream;
        if (src._handled) return;
        src._handled = true;
        
        var bounce = function (dst) {
            var args = {};
            if (!dst || typeof dst.pipe !== 'function') {
                args = parseArgs(arguments);
                dst = args.stream;
            }
            if (!dst) dst = through();
            
            function destroy () {
                src.destroy();
                dst.destroy();
            }
            src.on('error', destroy);
            dst.on('error', destroy);
            
            var s = args.headers || args.method || args.path
                ? src.pipe(insert(args))
                : src
            ;
            s.pipe(dst).pipe(req.connection);
            
            nextTick(function () { src._resume() });
            return dst;
        };
        
        if (cb.length === 2) cb(req, bounce)
        else cb(req, res, bounce)
    }
};

function stealthBuffer () {
    // the raw_ok test doesn't pass without this shim
    // instead of just using through() and then immediately calling .pause()
    
    var tr = through(write, end);
    var buffer = [];
    tr._resume = function () {
        buffer.forEach(tr.queue.bind(tr));
        buffer = undefined;
    };
    return tr;
    
    function write (buf) {
        if (buffer) buffer.push(buf)
        else this.queue(buf)
    }
    function end () {
        if (buffer) buffer.push(null)
        else this.queue(null)
    }
}
