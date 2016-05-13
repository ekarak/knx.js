var BinaryProtocol = require('binary-protocol');
var ipv4 = require('ipv4.js');
var knxnetprotocol = new BinaryProtocol();

knxnetprotocol.define('IPv4Endpoint', {
  read: function (propertyName) {
    this.pushStack({ addr: null, port: null}).
    	UInt32BE('addr').UInt16BE('port').
    	popStack(propertyName, function (data) {
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

function keyText(map, value) {
  for (var key in map) {
    if (map[key] == value) return key;
  }
  return "(not found: "+value+")";
}

/* CRI */
// creq[22] = 0x04;  /* structure len (4 bytes) */
// creq[23] = 0x04;  /* connection type: DEVICE_MGMT_CONNECTION = 0x03; TUNNEL_CONNECTION = 0x04; */
// creq[24] = 0x02;  /* KNX Layer (Tunnel Link Layer) */
// creq[25] = 0x00;  /* Reserved */
// ==> 4 bytes
/** Tunneling on busmonitor layer, establishes a busmonitor tunnel to the KNX network.
public static final int BUSMONITOR_LAYER = 0x80; */
/** Tunneling on link layer, establishes a link layer tunnel to the KNX network.
public static final int LINK_LAYER = 0x02; */
/** Tunneling on raw layer, establishes a raw tunnel to the KNX network.
public static final int RAW_LAYER = 0x04; */
var CONNECTION_TYPE = {
  DEVICE_MGMT_CONNECTION: 0x03,
  TUNNEL_CONNECTION: 0x04
};
knxnetprotocol.define('CRI', {
  read: function (propertyName) {
    this
    .pushStack({ header_length: 0, protocol_version: -1, service_type: -1, total_length: 0, data:null}) // allocate a new object to read the data into.
    .Int8    ('header_length')
    .Int8    ('connection_type')
    .tap(function (hdr) {
      switch (hdr.connection_type) {
        case CONNECTION_TYPE.DEVICE_MGMT_CONNECTION: break; // TODO
        case CONNECTION_TYPE.DEVICE_MGMT_CONNECTION: break; // TODO
        default: throw "Unsupported connection type: " + hdr.connection_type;
      }
    })
    .popStack(propertyName, function (data) {
      // pop the interim value off the stack and insert the real value into `propertyName`
      return data.value;
    });
  },
  write: function (value) {
    if (value === null) {
      this.Int32BE(-1); // a length of -1 indicates a null value.
    }
    else {
      // value is a buffer
      this
      .Int32BE(value.length) // write the buffer length
      .raw(value); // write the raw buffer
    }
  }
});

/* Connection HPAI */
//   creq[6]     =  /* Host Protocol Address Information (HPAI) Lenght */
//   creq[7]     =  /* IPv4 protocol UDP = 0x01, TCP = 0x02; */
//   creq[8-11]  =  /* IPv4 address  */
//   creq[12-13] =  /* IPv4 local port number for CONNECTION, CONNECTIONSTAT and DISCONNECT requests */
// ==> 8 bytes

/* Tunnelling HPAI */
//   creq[14]    =  /* Host Protocol Address Information (HPAI) Lenght */
//   creq[15]    =  /* IPv4 protocol UDP = 0x01, TCP = 0x02; */
//   creq[16-19] =  /* IPv4 address  */
//   creq[20-21] =  /* IPv4 local port number for TUNNELLING requests */
// ==> 8 bytes
var PROTOCOL_TYPE = {
    IPV4_UDP: 0x01,
    IPV4_TCP: 0x02,
};
knxnetprotocol.define('HPAI', {
  read: function (propertyName) {
    this
    .pushStack({ header_length: 0, protocol_version: -1, service_type: -1, total_length: 0})
    .Int8('header_length')
    .Int8('protocol_type')
    .IPv4Endpoint('tunnelEndpoint')
    .tap(function (hdr) {
      if (hdr.header_length < hdr.length)
        throw "Incomplete KNXNet HPAI header";
      console.log("KNXNetHeader: proto = %s", keyText(PROTOCOL_TYPE, data.protocol_type));
      switch (data.service_type) {
        case PROTOCOL_TYPE.IPV4_TCP:
          throw "TCP is unsupported";
      }
    })
    .popStack(propertyName, function (data) {
      return data;
    });
  },
  write: function (value) {
    if (value === null) {
      this.Int32BE(-1); // a length of -1 indicates a null value.
    }
    else {
      // value is a buffer
      this
      .Int32BE(value.length) // write the buffer length
      .raw(value); // write the raw buffer
    }
  }
});


/* header */
//creq[0] = 0x06;                     /* 06 - Header Length */
//creq[1] = 0x10;                     /* 10 - KNXnet version (1.0) */
//creq[2] = 0x02;                     /* 02 - hi-byte Service type descriptor (CONNECTION_REQUEST) */
//creq[3] = 0x05;                     /* 05 - lo-byte Service type descriptor (CONNECTION_REQUEST) */
//creq[4] = 0x00;                     /* 00 - hi-byte total length */
//creq[5] = 0x1A;                     /* 1A - lo-byte total lengt 26 bytes */
// ==> 6 (SIX) bytes
var SERVICE_TYPE = {
    SEARCH_REQUEST: 0x0201,
    SEARCH_RESPONSE: 0x0202,
    DESCRIPTION_REQUEST: 0x0203,
    DESCRIPTION_RESPONSE: 0x0204,
    CONNECT_REQUEST: 0x0205,
    CONNECT_RESPONSE: 0x0206,
    CONNECTIONSTATE_REQUEST: 0x0207,
    CONNECTIONSTATE_RESPONSE: 0x0208,
    DISCONNECT_REQUEST: 0x0208,
    DISCONNECT_RESPONSE: 0x020a,
    DEVICE_CONFIGURATION_REQUEST: 0x0310,
    DEVICE_CONFIGURATION_ACK: 0x0311,
    TUNNELLING_REQUEST: 0x0420,
    TUNNELLING_ACK: 0x0421,
    ROUTING_INDICATION: 0x0530,
    ROUTING_LOST_MESSAGE: 0x0531,
    UNKNOWN: -1
};
knxnetprotocol.define('KNXNetHeader', {
  read: function (propertyName) {
    this
    .pushStack({ header_length: 0, protocol_version: -1, service_type: -1, total_length: 0, data:null}) // allocate a new object to read the data into.
    .Int8    ('header_length')
    .Int8    ('protocol_version')
    .Int16BE('service_type')
    .Int16BE('total_length')
    .tap(function (hdr) {
      if (hdr.header_length < hdr.length)
        throw "Incomplete KNXNet header";
      console.log("KNXNetHeader: serviceType = %s", keyText(SERVICE_TYPE, hdr.service_type));
      switch (hdr.service_type) {
        case  SERVICE_TYPE.SEARCH_REQUEST: {
          break;
        }
        case SERVICE_TYPE.CONNECTIONSTATE_REQUEST: {
          break;
        }
        case SERVICE_TYPE.CONNECTIONSTATE_RESPONSE: {
          this.raw('value', data.total_length);
          break;
        }
        case SERVICE_TYPE.DESCRIPTION_RESPONSE: {
          this.raw('value', data.total_length);
          break;
        }
      }
      this.raw('data', hdr.total_length);
      this.HPAI('data');
    })
    .popStack(propertyName, function (data) {
      // pop the interim value off the stack and insert the real value into `propertyName`
      return data.value;
    });
  },
  write: function (value) {
    if (value === null) {
      this.Int32BE(-1); // a length of -1 indicates a null value.
    }
    else {
      // value is a buffer
      this
      .Int32BE(value.length) // write the buffer length
      .raw(value); // write the raw buffer
    }
  }
});




// CEMI (start at position 6)
// +--------+--------+--------+--------+----------------+----------------+--------+----------------+
// |  Msg   |Add.Info| Ctrl 1 | Ctrl 2 | Source Address | Dest. Address  |  Data  |      APDU      |
// | Code   | Length |        |        |                |                | Length |                |
// +--------+--------+--------+--------+----------------+----------------+--------+----------------+
//   1 byte   1 byte   1 byte   1 byte      2 bytes          2 bytes       1 byte      2 bytes
//
/*
Control Field 1

          Bit  |
         ------+---------------------------------------------------------------
           7   | Frame Type  - 0x0 for extended frame
               |               0x1 for standard frame
         ------+---------------------------------------------------------------
           6   | Reserved
               |
         ------+---------------------------------------------------------------
           5   | Repeat Flag - 0x0 repeat frame on medium in case of an error
               |               0x1 do not repeat
         ------+---------------------------------------------------------------
           4   | System Broadcast - 0x0 system broadcast
               |                    0x1 broadcast
         ------+---------------------------------------------------------------
           3   | Priority    - 0x0 system
               |               0x1 normal
         ------+               0x2 urgent
           2   |               0x3 low
               |
         ------+---------------------------------------------------------------
           1   | Acknowledge Request - 0x0 no ACK requested
               | (L_Data.req)          0x1 ACK requested
         ------+---------------------------------------------------------------
           0   | Confirm      - 0x0 no error
               | (L_Data.con) - 0x1 error
         ------+---------------------------------------------------------------


         Control Field 2

          Bit  |
         ------+---------------------------------------------------------------
           7   | Destination Address Type - 0x0 individual address
               |                          - 0x1 group address
         ------+---------------------------------------------------------------
          6-4  | Hop Count (0-7)
         ------+---------------------------------------------------------------
          3-0  | Extended Frame Format - 0x0 standard frame
         ------+---------------------------------------------------------------

parser.packet('knxnet_cemi',
  'messageCode: b8,    \
   additionalInfo: b8, \
   b8{frameType: b1, rsvd1: b8, repeatFlag: b1, broadcast: b1, priority: b2, ackRequest: b1, confirm: b1},  \
   b8{destAddrType: b1, hopCount: b3, extendedFrame: b4}, \
   sourceAddress: b16, \
   destAddress: b16,   \
   dataLength: b8');
*/
//
//  Message Code    = 0x11 - a L_Data.req primitive
//      COMMON EMI MESSAGE CODES FOR DATA LINK LAYER PRIMITIVES
//          FROM NETWORK LAYER TO DATA LINK LAYER
//          +---------------------------+--------------+-------------------------+---------------------+------------------+
//          | Data Link Layer Primitive | Message Code | Data Link Layer Service | Service Description | Common EMI Frame |
//          +---------------------------+--------------+-------------------------+---------------------+------------------+
//          |        L_Raw.req          |    0x10      |                         |                     |                  |
//          +---------------------------+--------------+-------------------------+---------------------+------------------+
//          |                           |              |                         | Primitive used for  | Sample Common    |
//          |        L_Data.req         |    0x11      |      Data Service       | transmitting a data | EMI frame        |
//          |                           |              |                         | frame               |                  |
//          +---------------------------+--------------+-------------------------+---------------------+------------------+
//          |        L_Poll_Data.req    |    0x13      |    Poll Data Service    |                     |                  |
//          +---------------------------+--------------+-------------------------+---------------------+------------------+
//          |        L_Raw.req          |    0x10      |                         |                     |                  |
//          +---------------------------+--------------+-------------------------+---------------------+------------------+
//          FROM DATA LINK LAYER TO NETWORK LAYER
//          +---------------------------+--------------+-------------------------+---------------------+
//          | Data Link Layer Primitive | Message Code | Data Link Layer Service | Service Description |
//          +---------------------------+--------------+-------------------------+---------------------+
//          |        L_Poll_Data.con    |    0x25      |    Poll Data Service    |                     |
//          +---------------------------+--------------+-------------------------+---------------------+
//          |                           |              |                         | Primitive used for  |
//          |        L_Data.ind         |    0x29      |      Data Service       | receiving a data    |
//          |                           |              |                         | frame               |
//          +---------------------------+--------------+-------------------------+---------------------+
//          |        L_Busmon.ind       |    0x2B      |   Bus Monitor Service   |                     |
//          +---------------------------+--------------+-------------------------+---------------------+
//          |        L_Raw.ind          |    0x2D      |                         |                     |
//          +---------------------------+--------------+-------------------------+---------------------+
//          |                           |              |                         | Primitive used for  |
//          |                           |              |                         | local confirmation  |
//          |        L_Data.con         |    0x2E      |      Data Service       | that a frame was    |
//          |                           |              |                         | sent (does not mean |
//          |                           |              |                         | successful receive) |
//          +---------------------------+--------------+-------------------------+---------------------+
//          |        L_Raw.con          |    0x2F      |                         |                     |
//          +---------------------------+--------------+-------------------------+---------------------+

//  Add.Info Length = 0x00 - no additional info
//  Control Field 1 = see the bit structure above
//  Control Field 2 = see the bit structure above
//  Source Address  = 0x0000 - filled in by router/gateway with its source address which is
//                    part of the KNX subnet
//  Dest. Address   = KNX group or individual address (2 byte)
//  Data Length     = Number of bytes of data in the APDU excluding the TPCI/APCI bits
//  APDU            = Application Protocol Data Unit - the actual payload including transport
//                    protocol control information (TPCI), application protocol control
//                    information (APCI) and data passed as an argument from higher layers of
//                    the KNX communication stack
/*
parser.packet('knxnet_apci',
   'b16{flags: b3, fragmentOffset: b13},       \
   timeToLive: b8,                     \
   protocol: b8,                       \
   checksum: b16,                      \
   sourceAddress: b16,                 \
   destinationAddress: b16             \
  ');
*/


module.exports = knxnetprotocol;
