var knxnetprotocol = require('./src/KnxProtocol.js');
/*
var BinaryProtocol = require('binary-protocol');
var knxnetprotocol = new BinaryProtocol();
var ipv4 = require('ipv4.js');

knxnetprotocol.define('IPv4Endpoint', {
  read: function (propertyName) {
    this.pushStack({ addr: null, port: null});
		this.Int32BE('addr');
		this.Int16BE('port');
    this.popStack(propertyName, function (data) {
      return ipv4.ntoa(data.addr) + ':' + data.port;
     });
   	},
  write: function (value) {
    var arr = value.split(':');
    var ip = arr[0].split('.');
    for (i = 0; i <= 3; i++) this.Int8(parseInt(ip[i]));
    this.Int16BE(arr[1]);
  }
});
*/

//var buffer = parseHexString("061002060014030008010a0c17350e5704040000");
//var r = kp.createReader(buffer);
//r.KNXNetHeader('p');
//console.log(JSON.stringify(r.next()));
var dgrams = [
  "061004200015040200002e00bce000000832010081",
  "061004200016040201002900bce00000083b0200804a",
"061002060014030008010a0c17350e5704040000"];
for (var i=0; i< dgrams.length; i++) {
	var buf = new Buffer(dgrams[i], 'hex');
	console.log("\n==== %s ==== (%d bytes)", dgrams[i], buf.length);
	var reader = knxnetprotocol.createReader(buf);
	reader.KNXNetHeader('packet'+i);
	console.log(reader.next());
}

//061004200015 0402 00002e00bce000000832010081
