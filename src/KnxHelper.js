/**
 * Created by aborovsky on 24.08.2015.
 */
var InvalidKnxAddressException = require('./InvalidKnxAddressException');
var KnxHelper = {};


// Bit order
// +---+---+---+---+---+---+---+---+
// | 7 | 6 | 5 | 4 | 3 | 2 | 1 | 0 |
// +---+---+---+---+---+---+---+---+

//  Control Field 1

//   Bit  |
//  ------+---------------------------------------------------------------
//    7   | Frame Type  - 0x0 for extended frame
//        |               0x1 for standard frame
//  ------+---------------------------------------------------------------
//    6   | Reserved
//        |
//  ------+---------------------------------------------------------------
//    5   | Repeat Flag - 0x0 repeat frame on medium in case of an error
//        |               0x1 do not repeat
//  ------+---------------------------------------------------------------
//    4   | System Broadcast - 0x0 system broadcast
//        |                    0x1 broadcast
//  ------+---------------------------------------------------------------
//    3   | Priority    - 0x0 system
//        |               0x1 normal (also called alarm priority)
//  ------+               0x2 urgent (also called high priority)
//    2   |               0x3 low
//        |
//  ------+---------------------------------------------------------------
//    1   | Acknowledge Request - 0x0 no ACK requested
//        | (L_Data.req)          0x1 ACK requested
//  ------+---------------------------------------------------------------
//    0   | Confirm      - 0x0 no error
//        | (L_Data.con) - 0x1 error
//  ------+---------------------------------------------------------------


//  Control Field 2

//   Bit  |
//  ------+---------------------------------------------------------------
//    7   | Destination Address Type - 0x0 individual address
//        |                          - 0x1 group address
//  ------+---------------------------------------------------------------
//   6-4  | Hop Count (0-7)
//  ------+---------------------------------------------------------------
//   3-0  | Extended Frame Format - 0x0 standard frame
//  ------+---------------------------------------------------------------


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



KnxHelper.GetChannelId = function (/*buffer*/datagram) {
    if (datagram.length > 6)
        return datagram[6];

    return -1;
}

module.exports = KnxHelper;
