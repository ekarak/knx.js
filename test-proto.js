const knxnetprotocol = require('./src/KnxProtocol.js');
const assert = require('assert');

//var buffer = parseHexString("061002060014030008010a0c17350e5704040000");
//var r = kp.createReader(buffer);
//r.KNXNetHeader('p');
//console.log(JSON.stringify(r.next()));
var dgrams = [
//  "06100205001a0801c0a80ab3d96d0801c0a80ab3d83604040200", //CONNECT_REQUEST
  "061002060014030008010a0c17350e5704040000", // connect response
//  "061004200015040200002e00bce000000832010081", // tunneling
//  "061004200016040201002900bce00000083b0200804a"
];
for (var i=0; i< dgrams.length; i++) {
	var buf = new Buffer(dgrams[i], 'hex');
	console.log("\n==== %j ==== (%d bytes)", dgrams[i], buf.length);
	var reader = knxnetprotocol.createReader(buf);
  var writer = knxnetprotocol.createWriter();
	reader.KNXNetHeader('packet'+i);
  var decoded = reader.next();
  console.log(decoded);
  console.log('... checking against original: ....');
  writer.KNXNetHeader(decoded['packet'+i]);
//
  try {
    assert(Buffer.compare(buf, writer.buffer) == 0);
    console.log("+++ buffer[%d] check is SUCCESS", i);
  } catch (err) {
    console.log("--- OOPS, buffer[%d] is different", i);
    console.log(buf);
    console.log(writer.buffer);
  }
}

//061004200015 0402 00002e00bce000000832010081
