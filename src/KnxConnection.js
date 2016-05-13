/**
 * Created by aborovsky on 24.08.2015.
 * refactored by ekarakou
 */
var os = require('os');
var util = require('util');
var dgram = require('dgram');
var EventEmitter = require('events').EventEmitter;
var InvalidKnxDataException = require('./InvalidKnxDataException');
var ConnectionErrorException = require('./ConnectionErrorException');

var CONNECT_TIMEOUT = 5000;

// an array of all available IPv4 addresses
var localAddresses = [];
var interfaces = os.networkInterfaces();
for (var k in interfaces) {
    for (var k2 in interfaces[k]) {
        var intf = interfaces[k][k2];
        if (intf.family === 'IPv4' && !intf.internal) {
            localAddresses.push(intf.address);
        }
    }
}

/*
*
*/
function KnxConnection(addr, port, intf) {

    KnxConnection.super_.call(this);
		//
		this.localAddress = null;
		if (localAddresses.length == 0) {
			throw "No valid IPv4 interfaces detected";
		} else if (localAddresses.length == 1) {
			console.log("Using %s as local IP for KNX traffic", localAddresses[0]);
			this.localAddress = localAddresses[0];
		} else {
			if (intf) {
				for (var k2 in interfaces[intf]) {
						var intf = interfaces[k][k2];
						if (intf.family === 'IPv4' && !intf.internal) {
							console.log("Using %s as local IP for KNX traffic", intf.address);
							this.localAddress = intf.address;
						}
				}
			} else {
				throw "You must supply a valid network interface for KNX traffic";
			}
		}
		this.udpClient = null;
    this.ClassName = 'KnxConnection';
    this.remoteEndpoint = { addr: addr, port: port };
    this.connected = false;
    this.ActionMessageCode = 0x00;
    this.ThreeLevelGroupAddressing = true;
}

util.inherits(KnxConnection, EventEmitter);

/// <summary>
///     Send a byte array value as data to specified address
/// </summary>
/// <param name="address">KNX Address</param>
/// <param name="data">Byte array value or integer</param>
/*
 Datatypes

 KNX/EIB Function                   Information length      EIS         DPT     Value
 Switch                             1 Bit                   EIS 1       DPT 1	0,1
 Dimming (Position, Control, Value) 1 Bit, 4 Bit, 8 Bit     EIS 2	    DPT 3	[0,0]...[1,7]
 Time                               3 Byte                  EIS 3	    DPT 10
 Date                               3 Byte                  EIS 4       DPT 11
 Floating point                     2 Byte                  EIS 5	    DPT 9	-671088,64 - 670760,96
 8-bit unsigned value               1 Byte                  EIS 6	    DPT 5	0...255
 8-bit unsigned value               1 Byte                  DPT 5.001	DPT 5.001	0...100
 Blinds / Roller shutter            1 Bit                   EIS 7	    DPT 1	0,1
 Priority                           2 Bit                   EIS 8	    DPT 2	[0,0]...[1,1]
 IEEE Floating point                4 Byte                  EIS 9	    DPT 14	4-Octet Float Value IEEE 754
 16-bit unsigned value              2 Byte                  EIS 10	    DPT 7	0...65535
 16-bit signed value                2 Byte                  DPT 8	    DPT 8	-32768...32767
 32-bit unsigned value              4 Byte                  EIS 11	    DPT 12	0...4294967295
 32-bit signed value                4 Byte                  DPT 13	    DPT 13	-2147483648...2147483647
 Access control                     1 Byte                  EIS 12	    DPT 15
 ASCII character                    1 Byte                  EIS 13	    DPT 4
 8859_1 character                   1 Byte                  DPT 4.002	DPT 4.002
 8-bit signed value                 1 Byte                  EIS 14	    DPT 6	-128...127
 14 character ASCII                 14 Byte                 EIS 15	    DPT 16
 14 character 8859_1                14 Byte                 DPT 16.001	DPT 16.001
 Scene                              1 Byte                  DPT 17	    DPT 17	0...63
 HVAC                               1 Byte                  DPT 20	    DPT 20	0..255
 Unlimited string 8859_1            .                       DPT 24	    DPT 24
 List 3-byte value                  3 Byte                  DPT 232	    DPT 232	RGB[0,0,0]...[255,255,255]
 */
KnxConnection.prototype.Action = function (address, data, callback) {
    if (!Buffer.isBuffer(data)) {
        var buf = null;
        switch (typeof(data)) {
            case 'boolean':
                buf = new Buffer(1);
                buf.writeIntLE(data ? 1 : 0);
                break;
            case 'number':
                //if integer
                if (isInt(data)) {
                    buf = new Buffer(2);
                    if (data <= 255) {
                        buf[0] = 0x00;
                        buf[1] = data & 255;
                    }
                    else if (data <= 65535) {
                        buf[0] = data & 255;
                        buf[1] = (data >> 8) & 255;
                    }
                    else
                        throw new InvalidKnxDataException(data.toString());
                }
                //if float
                else if (isFloat(data)) {
                    buf = new Buffer(4);
                    buf.writeFloatLE(data, 0);
                }
                else
                    throw new InvalidKnxDataException(data.toString());
                break;
            case 'string':
                buf = new Buffer(data.toString());
                break;
        }
        data = buf;
    }
    if (this.debug)
        console.log("[%s] Sending %s to %s.", this.ClassName, JSON.stringify(data), JSON.stringify(address));
    this.knxSender.Action(address, data, callback);
    if (this.debug)
        console.log("[%s] Sent %s to %s.", this.ClassName, JSON.stringify(data), JSON.stringify(address));
}

// TODO: It would be good to make a type for address, to make sure not any random string can be passed in
/// <summary>
///     Send a request to KNX asking for specified address current status
/// </summary>
/// <param name="address"></param>
KnxConnection.prototype.RequestStatus = function (address, callback) {
    if (this.debug)
        console.log("[%s] Sending request status to %s.", this.ClassName, JSON.stringify(address));
    this.knxSender.RequestStatus(address, callback);
    if (this.debug)
        console.log("[%s] Sent request status to %s.", this.ClassName, JSON.stringify(address));
}

/// <summary>
///     Convert a value received from KNX using datapoint translator, e.g.,
///     get a temperature value in Celsius
/// </summary>
/// <param name="type">Datapoint type, e.g.: 9.001</param>
/// <param name="data">Data to convert</param>
/// <returns></returns>
KnxConnection.prototype.FromDataPoint = function (type, /*buffer*/data) {
    return DataPointTranslator.Instance.FromDataPoint(type, data);
}

/// <summary>
///     Convert a value to send to KNX using datapoint translator, e.g.,
///     get a temperature value in Celsius in a byte representation
/// </summary>
/// <param name="type">Datapoint type, e.g.: 9.001</param>
/// <param name="value">Value to convert</param>
/// <returns></returns>
KnxConnection.prototype.ToDataPoint = function (type, value) {
    return DataPointTranslator.Instance.ToDataPoint(type, value);
}

KnxConnection.prototype.GenerateSequenceNumber = function () {
    return this._sequenceNumber++;
}

KnxConnection.prototype.RevertSingleSequenceNumber = function () {
    this._sequenceNumber--;
}

KnxConnection.prototype.ResetSequenceNumber = function () {
    this._sequenceNumber = 0x00;
}

// <summary>
///     Start the connection
/// </summary>
KnxConnection.prototype.Connect = function (callback) {
    var self = this;
		if (this.debug) console.log("connecting...");

    function clearReconnectTimeout() {
        if (self.reConnectTimeout) {
            clearTimeout(self.reConnectTimeout);
            delete self.reConnectTimeout;
        }
    }

    function clearConnectTimeout() {
        if (self.connectTimeout) {
            clearTimeout(self.connectTimeout);
            delete self.connectTimeout;
        }
    }

    if (this.connected && this.udpClient) {
        if (typeof callback === 'function') callback();
        return true;
    }

    this.connectTimeout = setTimeout(function () {
        self.removeListener('connected', clearConnectTimeout);
        self.Disconnect(function () {
            if (self.debug)
                console.log('Error connecting: timeout');
            if (typeof callback === 'function') callback({
							msg: 'Error connecting: timeout', reason: 'CONNECTTIMEOUT'
						});
            clearReconnectTimeout();
            this.reConnectTimeout = setTimeout(function () {
                if (self.debug)
                    console.log('reconnecting');
                self.Connect(callback);
            }, 3 * CONNECT_TIMEOUT);
        });
    }, CONNECT_TIMEOUT);
    this.once('connected', clearConnectTimeout);
    if (callback) {
        this.removeListener('connected', callback);
        this.once('connected', callback);
    }
    // try {
        if (this.udpClient != null) {
            try {
                this.udpClient.close();
                //this.udpClient.Client.Dispose();
            }
            catch (e) {
                // ignore
            }
        }
        this.udpClient = dgram.createSocket("udp4");
    //} catch (e) {
      //  throw new ConnectionErrorException(e);
    //}

		this.InitialiseSenderReceiver();
		if (self.debug) console.log("initialised sender and receiver...");

    new Promise(function (fulfill, reject) {
			if (self.debug) console.log("Starting receiver...");
        self.knxReceiver.Start(fulfill);
    	})
      .then(function () {
				if (self.debug) console.log("InitializeStateRequest...");
          self.InitializeStateRequest();
      })
      .then(function () {
				if (self.debug) console.log("ConnectRequest...");
          self.ConnectRequest();
      })
      .then(function () {
          self.emit('connect');
          self.emit('connecting');
      });
}

/// <summary>
///     Stop the connection
/// </summary>
KnxConnection.prototype.Disconnect = function (callback) {
    var self = this;
		if (self.debug) console.log("Disconnect...");
    if (callback)
        self.once('disconnect', callback);

    try {
        this.TerminateStateRequest();
        new Promise(function (fulfill, reject) {
            self.DisconnectRequest(fulfill);
        })
            .then(function () {
                self.knxReceiver.Stop();
                self.udpClient.close();
                self.connected = false;
                self.emit('close');
                self.emit('disconnect');
                self.emit('disconnected');
            })

    }
    catch (e) {
        self.emit('disconnect', e);
    }

}

KnxConnection.prototype.InitializeStateRequest = function () {
    var self = this;
    this._stateRequestTimer = setInterval(function () {
        timeout(function (fulfill) {
            self.removeListener('alive', fulfill);
            self.StateRequest(function (err) {
                if (!err)
                    self.once('alive', function () {
                        fulfill();
                    });
            });
        }, 2 * CONNECT_TIMEOUT, function () {
            if (self.debug)
                console.log('connection stale, so disconnect and then try to reconnect again');
            new Promise(function (fulfill) {
                self.Disconnect(fulfill);
            }).then(function () {
                  self.Connect();
            });
        });
    }, 60000); // same time as ETS with group monitor open
}

KnxConnection.prototype.TerminateStateRequest = function () {
    if (this._stateRequestTimer == null)
        return;
    clearTimeout(this._stateRequestTimer);
}

// given a buffer and an offset, write out the local endpoint IPv4 address
KnxConnection.prototype.appendLocalAddressAndPort = function (buf, offset) {
	if (!this.localAddress || this.localAddress === '' || this.localAddress.indexOf('.') === -1 )
		throw 'Need valid IPv4 address for local endpoint';

	var result = new Buffer(4);
	var aa = this.localAddress.split('.');
	for (i = 0; i <= 3; i++) {
		buf[offset+i] = parseInt(aa[i]) & 255;
	}
	var localPort = this.udpClient.address().port;
	buf[offset + 4] = (localPort >> 8) & 255;
	buf[offset + 5] = localPort & 255;
};

KnxConnection.prototype.ConnectRequest = function (callback) {
    // HEADER
		if (this.debug) console.log("ConnectRequest: init");
    var datagram = new Buffer(26);
    datagram[0] = 0x06;
    datagram[1] = 0x10;
    datagram[2] = 0x02;
    datagram[3] = 0x05;
    datagram[4] = 0x00;
    datagram[5] = 0x1A;
    datagram[6] = 0x08;
    datagram[7] = 0x01;
		this.appendLocalAddressAndPort(datagram, 8);
    datagram[14] = 0x08;
    datagram[15] = 0x01;
		this.appendLocalAddressAndPort(datagram, 16);
    datagram[22] = 0x04;
    datagram[23] = 0x04;
    datagram[24] = 0x02;
    datagram[25] = 0x00;
    try {
        this.knxSender.SendDataSingle(datagram, callback);
    }
    catch (e) {
        if (typeof callback === 'function') callback();
    }
}

KnxConnection.prototype.StateRequest = function (callback) {
    // HEADER
    var datagram = new Buffer(16);
    datagram[0] = 0x06;
    datagram[1] = 0x10;
    datagram[2] = 0x02;
    datagram[3] = 0x07;
    datagram[4] = 0x00;
    datagram[5] = 0x10;
    datagram[6] = this.ChannelId;
    datagram[7] = 0x00;
    datagram[8] = 0x08;
    datagram[9] = 0x01;
		this.appendLocalAddressAndPort(datagram, 10);
    try {
        this.knxSender.SendData(datagram, callback);
    }
    catch (e) {
        callback(e)
    }
}

KnxConnection.prototype.DisconnectRequest = function (callback) {
    if(!this.connected) {
        callback && callback();
        return false;
    }
    // HEADER
    var datagram = new Buffer(16);
    datagram[0] = 0x06;
    datagram[1] = 0x10;
    datagram[2] = 0x02;
    datagram[3] = 0x09;
    datagram[4] = 0x00;
    datagram[5] = 0x10;
    datagram[6] = this.ChannelId;
    datagram[7] = 0x00;
    datagram[8] = 0x08;
    datagram[9] = 0x01;
		this.appendLocalAddressAndPort(datagram, 10);

    try {
        this.knxSender.SendData(datagram, callback);
    }
    catch (e) {
        callback(e)
    }
}

module.exports = KnxConnection;
