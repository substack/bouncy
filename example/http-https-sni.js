var fs = require('fs');
var crypto = require('crypto');
var bouncy = require('bouncy');

bouncy(function (req, bounce) {
    if (req.headers.host === 'beep.example.com') {
        bounce(8001);
    }
    else if (req.headers.host === 'boop.example.com') {
        bounce(8002);
    }
}).listen(8000);

// Listen to an SSL port at the same time. 
// Use SNI to serve different certificates 
// based on the hostname (vhost).

var ssl = {
    key : fs.readFileSync('/etc/ssl/private/default.key'),
    cert : fs.readFileSync('/etc/ssl/private/default.crt'),
    SNICallback: sni_select
};

bouncy(ssl, function (req, bounce) {
  bounce(8000)
}).listen(8043)

function sni_select(hostname) {
  var creds = {key: fs.readFileSync('/etc/ssl/private/'+hostname+'/private.key'),
               cert: fs.readFileSync('/etc/ssl/private/'+hostname+'/server.crt')}
  return crypto.createCredentials(creds).context
}

