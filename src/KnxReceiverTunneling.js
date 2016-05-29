/**
 * Created by aborovsky on 24.08.2015.
 * refactored by ekarakou
 */
var util = require('util');

var KnxProtocol = require('./KnxProtocol');
var KnxReceiver = require('./KnxReceiver');

function KnxReceiverTunneling(/*KnxConnection*/ connection) {
	if (connection.debug) console.log('new KnxReceiverTunneling');
    KnxReceiverTunneling.super_.call(this, connection);
}
util.inherits(KnxReceiverTunneling, KnxReceiver);

KnxReceiverTunneling.prototype.ProcessDatagramHeaders = function (/*KnxDatagram*/ datagram) {

    if (datagram.connstate.channel_id != this.connection.ChannelId) {
      console.log('ignoring datagram for connection %j', datagram.connstate);
      return;
    }

    if (datagram.connstate.seqnum <= this._rxSequenceNumber) {
      console.log('wrong sequence number: got %d, expected %d',
        datagram.connstate.seqnum, this._rxSequenceNumber
      );
      return;
    }

    this._rxSequenceNumber = datagram.connstate.seqnum;

    var response = JSON.parse(JSON.stringify(datagram));

    this.ProcessCEMI(datagram, cemi);

    this.connection.knxSender.SendTunnelingAck(sequenceNumber);
}

KnxReceiverTunneling.prototype.ProcessDisconnectRequest = function (/*buffer*/ datagram) {
    if (channelId != this.connection.ChannelId)
        return;

    this.stop();
    this.connection.emit('close');
    this.udpClient.close();
}

/*
 TODO: implement ack processing!
 */
KnxReceiverTunneling.prototype.ProcessTunnelingAck = function (/*buffer*/ datagram) {
    // do nothing
}


KnxReceiverTunneling.prototype.ProcessConnectionStateResponse = function (datagram) {

    var response = datagram[7];
    if (response != 0x21) {
        this.connection.emit('alive');
        return;
    }
    if (this.connection.debug)
        console.log("KnxReceiverTunneling: Received connection state response - No active connection with channel ID %s", datagram.connstate.channel_id);
    this.connection.Disconnect();
}

KnxReceiverTunneling.prototype.ProcessConnectResponse = function (/*buffer*/ datagram) {

    if (datagram.connstate.channel_id == 0x00 && datagram.connstate.status == 0x24)
        throw "KnxReceiverTunneling: Received connect response - No more connections available";
    else {
        this.connection.ChannelId = datagram.connstate.channel_id;
        this.connection.ResetSequenceNumber();
        this.connection.connected = true;
        this.connection.emit('connected');
    }
}

module.exports = KnxReceiverTunneling;
