const knxnetprotocol = require('./KnxProtocol');

function KnxSender(/*KnxConnection*/ connection) {
    this.connection = connection;
    this.writer = knxnetprotocol.createWriter();
}

KnxSender.prototype.SendDataSingle = function (/*KnxDatagram*/ datagram, callback) {
    var self = this;

    var buf  = this.writer.KNXNetHeader(datagram).buffer;

		if (self.connection.debug) {
			console.log('KnxSender.prototype.SendDataSingle (%d bytes) ==> %s', buf.length, JSON.stringify(datagram, null, 2));
    }
    function cb(err) {
        if (self.connection.debug)
            console.log('udp sent, err[' + (err ? err.toString() : 'no_err') + ']');
        if (typeof callback === 'function') callback(err);
    }

    this.connection.udpClient.send(
			buf, 0, buf.length,
			this.connection.remoteEndpoint.port, this.connection.remoteEndpoint.addr,
			cb);
}

KnxSender.prototype.SendData = KnxSender.prototype.SendDataSingle;

module.exports = KnxSender;
