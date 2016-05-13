/**
 * Created by aborovsky on 24.08.2015.
 * refactored by ekarakou
 */
var KnxConnection = require('./KnxConnection');
var KnxReceiverTunneling = require('./KnxReceiverTunneling');
var KnxSenderTunneling = require('./KnxSenderTunneling');
var ConnectionErrorException = require('./ConnectionErrorException');
var os = require('os');
var util = require('util');
var dgram = require('dgram');
var Promise = require('promise');

/// <summary>
///     Initializes a new KNX tunneling connection with provided values. Make sure the local system allows
///     UDP messages to the localIpAddress and localPort provided
/// </summary>
/// <param name="remoteIpAddress">Remote gateway IP address</param>
/// <param name="remotePort">Remote gateway port</param>
/// <param name="localInterface">Local interface to bind to</param>
function KnxConnectionTunneling(remoteIpAddress, remotePort, localInterface) {

    KnxConnectionTunneling.super_.call(this, remoteIpAddress, remotePort, localInterface);
    this._stateRequestTimer = null; //Timer
    this._sequenceNumber = null; //byte
    this.ChannelId = 0x00;
}

util.inherits(KnxConnectionTunneling, KnxConnection);

KnxConnectionTunneling.prototype.InitialiseSenderReceiver = function() {
	if (this.knxReceiver == null || this.knxSender == null) {
			this.knxReceiver = new KnxReceiverTunneling(this);
			this.knxSender = new KnxSenderTunneling(this);
	}
}

KnxConnectionTunneling.prototype.BindSocket = function(callback) {
	this.udpClient.bind({/*options*/}, callback);

	if (this.debug) console.log('KnxConnectionTunneling.prototype.BindSocket');
}

/*
function delay(time) {
    return new Promise(function (fulfill, reject) {
        setTimeout(fulfill, time);
    });
}

function timeout(func, time, timeoutFunc) {

    var success = null;

    var succPromise = new Promise(function (fulfill, reject) {
        func(function () {
            if (success === null) {
                fulfill();
                success = true;
            }
            else
                reject();
        });
    });

    var timeoutPromise = delay(time);

    timeoutPromise.then(function () {
        if (!success)
            return timeoutFunc && timeoutFunc();
    });

    return Promise.race([succPromise, timeoutPromise]);
}
*/

module.exports = KnxConnectionTunneling;
