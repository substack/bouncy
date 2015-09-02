var through = require('through');

module.exports = function (opts, req) {
    var tr = through(write);
    var inHeader = true;
    var addHeaders = {};
    var headersLower = opts.headers
        && Object.keys(opts.headers).reduce(function (acc, key) {
            acc[key.toLowerCase()] = opts.headers[key];
            return acc;
        }, {}) || {}
    ;

    if (opts.addForwardedHeaders) {
        if (typeof req.connection.address === 'function') {
            addHeaders['x-forwarded-for'] = req.connection.address().address;
        } else {
            console.warn('boom');
        }
    }

    var line = '';
    var firstLine = true;
    return tr;
    
    function write (buf) {
        if (!inHeader) return this.queue(buf);
        if (typeof buf === 'string') buf = Buffer(buf);
        
        for (var i = 0; i < buf.length; i++) {
            if (buf[i] !== 10) {
                line += String.fromCharCode(buf[i]);
                continue;
            }
            
            if (line === '' || line === '\r') {
                inHeader = false;
                this.queue(Object.keys(opts.headers || {}).map(function (key) {
                    return key + ': ' + opts.headers[key];
                }).concat(Object.keys(addHeaders).map(function(key) {
                    return key + ': ' + addHeaders[key];
                })).join(line + '\n') + line + '\n' + line + '\n');
               
                line = undefined;
                return this.queue(buf.slice(i + 1));
            }
            
            if (firstLine) {
                firstLine = false;
                if (opts.method || opts.path) {
                    line = line.replace(/^(\S+)\s+(\S+)/, function (_, m, p) {
                        return (opts.method || m).toUpperCase()
                            + ' ' + (opts.path || p)
                        ;
                    });
                }
                this.queue(line + '\n');
                line = '';
                continue;
            }
            firstLine = false;
            
            var m = line.match(/^([^:]+)\s*:/);
            if (!m) {
                this.queue(line + '\n');
            }
            else {
                var key = m[1];
                var lowerKey = key.toLowerCase();

                if (addHeaders[lowerKey]) {
                    line = line.split(', ').concat(addHeaders[lowerKey]).join(', ');
                    delete addHeaders[lowerKey];
                    delete headersLower[lowerKey];
                }

                if (!headersLower || !headersLower[lowerKey]) {
                    this.queue(line + '\n');
                }
            }
            line = '';
        }
    }
}
