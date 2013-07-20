var net = require('net');
var tls = require('tls');

module.exports = function (args) {
    var opts = {};

    for (var i = 0; i < args.length; i++) {
        var arg = args[i];
        var m;
        
        if (typeof arg === 'number') {
            opts.port = arg;
        }
        else if (typeof arg === 'string') {
            if (/^\d+$/.test(arg)) {
                opts.port = parseInt(arg, 10);
            }
            else if (/^\.?\//.test(arg)) {
                opts.unix = arg;
            }
            else if ((m = arg.match(
                /^(?:(http|https):\/\/)?([^:\/]+)?(?::(\d+))?(\/.*)?$/
            )) && (m[1] || m[2] || m[3] || m[4])) {
                opts.tls = (m[1] === "https");
                opts.host = m[2] || 'localhost';
                opts.port = m[3] || 80;
                if (m[4]) opts.path = m[4];
            }
            else opts.host = arg;
        }
        else if (typeof arg === 'object') {
            if (arg.write) opts.stream = arg;
            else {
                for (var key in arg) {
                    opts[key] = arg[key]
                }
            }
        }
    }
    
    if (opts.stream) return opts;
    
    opts.streamType = (opts.tls ? tls : net);

    if (opts.unix) {
        opts.stream = opts.streamType.connect(opts.unix);
    }
    else if (opts.host && opts.port) {
        opts.stream = opts.streamType.connect(opts.port, opts.host);
    }
    else if (opts.port) {
        opts.stream = opts.streamType.connect(opts.port);
    }
    return opts;
}
