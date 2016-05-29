/**
 * Created by aborovsky on 24.08.2015.
 */
var InvalidKnxAddressException = require('./InvalidKnxAddressException');
var KnxHelper = {};

KnxHelper.GetData = function (dataLength, apdu /*buffer*/) {
    switch (dataLength) {
        case 0:
            return '';
        case 1:
            //TODO: originally, here is utf code to char convert (String.fromCharCode).
            return parseInt(0x3F & apdu[1], 10).toString();
        case 2:
            //TODO: originally, here is utf code to char convert (String.fromCharCode).
            return parseInt(apdu[2]).toString();
        default:
            var data = new Buffer(apdu.length);
            //TODO: originally, here is utf code to char convert (String.fromCharCode).
            apdu[i].copy(data);
            return data;
    }
}

KnxHelper.GetDataLength = function (/*buffer*/ data) {
    if (data.length <= 0)
        return 0;

    if (data.length == 1 && data[0] < 0x3F)
        return 1;

    if (data[0] < 0x3F)
        return data.length;

    return data.length + 1;
}

KnxHelper.WriteData = function (/*buffer*/ datagram, /*buffer*/ data, dataStart) {
    if (data.length == 1) {
        if (data[0] < 0x3F) {
            datagram[dataStart] = (datagram[dataStart] | data[0]) & 255;
        }
        else {
            datagram[dataStart + 1] = data[0];
        }
    }
    else if (data.length > 1) {
        if (data[0] < 0x3F) {
            datagram[dataStart] = (datagram[dataStart] | data[0]) & 255;

            for (var i = 1; i < data.length; i++) {
                datagram[dataStart + i] = data[i];
            }
        }
        else {
            for (var i = 0; i < data.length; i++) {
                datagram[dataStart + 1 + i] = data[i];
            }
        }
    }
}

module.exports = KnxHelper;
