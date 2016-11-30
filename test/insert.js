var test = require('tap').test;
var insert = require('../lib/insert');
var chunky = require('chunky');

test('insert headers CRLF', function (t) {
    t.plan(2 * 50);
    var msg = [
        'POST / HTTP/1.1',
        'Host: beep',
        '',
        'sound=boop'
    ].join('\r\n');
    
    for (var i = 0; i < 50; i++) {
        var bufs = chunky(msg);
        t.equal(bufs.map(String).join(''), msg);
        
        var s = insert({ headers: { foo : 'bar', baz : 'quux' } });
        var data = '';
        s.on('data', function (buf) { data += buf });
        s.on('end', function () {
            t.equal(data, [
                'POST / HTTP/1.1',
                'Host: beep',
                'foo: bar',
                'baz: quux',
                '',
                'sound=boop'
            ].join('\r\n'));
        });
        
        for (var j = 0; j < bufs.length; j++) {
            s.write(bufs[j]);
        }
        s.end();
    }
});

test('insert headers LF', function (t) {
    t.plan(2 * 50);
    var msg = [
        'POST / HTTP/1.1',
        'Host: beep',
        '',
        'sound=boop'
    ].join('\n');
    
    for (var i = 0; i < 50; i++) {
        var bufs = chunky(msg);
        t.equal(bufs.map(String).join(''), msg);
        
        var s = insert({ headers: { foo : 'bar', baz : 'quux' } });
        var data = '';
        s.on('data', function (buf) { data += buf });
        s.on('end', function () {
            t.equal(data, [
                'POST / HTTP/1.1',
                'Host: beep',
                'foo: bar',
                'baz: quux',
                '',
                'sound=boop'
            ].join('\n'));
        });
        
        for (var j = 0; j < bufs.length; j++) {
            s.write(bufs[j]);
        }
        s.end();
    }
});

test('set Host', function (t) {
    t.plan(2 * 50);
    var msg = [
        'GET / HTTP/1.1',
        'Host: beep',
        '',
    ].join('\n');
    
    for (var i = 0; i < 50; i++) {
        var bufs = chunky(msg);
        t.equal(bufs.map(String).join(''), msg);
        
        var s = insert({ host : 'changed' });
        var data = '';
        s.on('data', function (buf) { data += buf });
        s.on('end', function () {
            t.equal(data, [
                'GET / HTTP/1.1',
                'Host: changed',
                '',
            ].join('\n'));
        });
        
        for (var j = 0; j < bufs.length; j++) {
            s.write(bufs[j]);
        }
        s.end();
    }
});
