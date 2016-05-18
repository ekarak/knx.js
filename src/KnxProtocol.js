var ipv4 = require('ipv4.js');
var Parser = require('binary-parser').Parser;
var KnxHelper = require('./KnxHelper.js');
var BinaryProtocol = require('binary-protocol');
var knxnetprotocol = new BinaryProtocol();

knxnetprotocol.define('IPv4Endpoint', {
  read: function (propertyName) {
    this.pushStack({ addr: null, port: null})
      .UInt32BE('addr')
      .UInt16BE('port')
      .popStack(propertyName, function (data) {
        return ipv4.ntoa(data.addr) + ':' + data.port;
       });
     },
  write: function (value) {
    if (!(typeof value === 'string' && value.match(/\d*\.\d*\.\d*\.\d*:\d*/))) {
      throw "Invalid IPv4 endpoint, please provide ipaddress:port";
    }
    var arr = value.split(':');
    console.log("ipv4 write: %j", arr);
    this.UInt32BE(ipv4.aton(arr[0]));
    this.UInt16BE(arr[1]);
  }
});

/* helper function to print enum keys */
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
var CONNECTION_TYPE = {
  DEVICE_MGMT_CONNECTION: 0x03,
  TUNNEL_CONNECTION: 0x04
};
/** Tunneling on busmonitor layer, establishes a busmonitor tunnel to the KNX network.
public static final int BUSMONITOR_LAYER = 0x80; */
/** Tunneling on link layer, establishes a link layer tunnel to the KNX network.
public static final int LINK_LAYER = 0x02; */
/** Tunneling on raw layer, establishes a raw tunnel to the KNX network.
public static final int RAW_LAYER = 0x04; */
var KNX_LAYER = {
  LINK_LAYER: 0x02,
  RAW_LAYER: 0x03,
  BUSMONITOR_LAYER: 0x80
}

// CRI: connection request/response
knxnetprotocol.define('CRI', {
  read: function (propertyName) {
    this
    .pushStack({ header_length: 0, connection_type: null, knx_layer: null}) //
    .Int8  ('header_length')
    .Int8  ('connection_type')
    .Int8  ('knx_layer')
    .tap(function (hdr) {
      switch (hdr.connection_type) {
        case CONNECTION_TYPE.DEVICE_MGMT_CONNECTION:
          break; // TODO
        case CONNECTION_TYPE.TUNNEL_CONNECTION:
          break; // TODO
        default: throw "Unsupported connection type: " + hdr.connection_type;
      }
    })
    .popStack(propertyName, function (data) {
      console.log('read CRI: '+JSON.stringify(data));
      // pop the interim value off the stack and insert the real value into `propertyName`
      return data
    });
  },
  write: function (value) {
    this
      .Int8  (value.header_length)
      .Int8  (value.connection_type)
      .Int8  (value.knx_layer);
      // TODO?
  }
});

// connection state response/request
knxnetprotocol.define('ConnState', {
  read: function (propertyName) {
    this.pushStack({  channel_id: null, seqnum: null })
    .Int8('channel_id')
    .Int8('seqnum')
    .popStack(propertyName, function (data) {
      console.log('read ConnState: %j', data);
      return data;
    });
  },
  write: function (value) {
    this
      .Int8(value.channel_id)
      .Int8(value.seqnum);
  }
});

// connection state response/request
knxnetprotocol.define('SeqState', {
  read: function (propertyName) {
    this.pushStack({ length: null, channel_id: null, seqnum: null, rsvd: null})
    .Int8('length')
    .Int8('channel_id')
    .Int8('seqnum')
    .Int8('rsvd')
    .tap(function (hdr) {
      console.log('reading SeqState: %j', hdr);
      switch (hdr.status) {
        case 0x00:
          break;
        //default: throw "Connection State status: " + hdr.status;
      }
      return hdr;
    })
    .popStack(propertyName, function (data) {
      return data;
    });
  },
  write: function (value) {
    console.log('writing SeqState: %j', value);
    // TODO
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
    this.pushStack({ header_length: 0, protocol_type: null,  total_length: 0})
    .Int8('header_length')
    .Int8('protocol_type')
    .IPv4Endpoint('tunnelEndpoint')
    .tap(function (hdr) {
      console.log('read HPAI: %j', hdr);
      if (hdr.header_length < hdr.length)
        throw "Incomplete KNXNet HPAI header";
      console.log("     HPAI: proto = %s", keyText(PROTOCOL_TYPE, hdr.protocol_type));
      switch (hdr.service_type) {
        case PROTOCOL_TYPE.IPV4_TCP:  throw "TCP is unsupported";
        default:
      }
    })
    .popStack(propertyName, function (data) {
      return data;
    });
  },
  write: function (value) {
    this
      .Int8(value.header_length)
      .Int8(value.protocol_type)
      .IPv4Endpoint(value.tunnelEndpoint);
  }
});

/* ==================== APCI ====================== */
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
knxnetprotocol.define('APCI', {
 read: function (propertyName) {
    console.log('reading APCI');
    this.pushStack({ tpci: null, ttl: null, ctrl: null, proto: null, csum: null, src_addr: null, dest_addr: null, apdu_length: null })
    .UInt16BE('tpci')
    .Int8('ttl')
    .Int8('proto')
    .UInt16BE('csum')
    .UInt16BE('src_addr')
    .UInt16BE('dest_addr')
    .Uint8('apdu_length')
    .tap(function (hdr) {
      // TODO: bitshifting for the two ctrl bytes
      console.log('read APCI: %j', hdr);
      return hdr;
    })
    .popStack(propertyName, function (data) {
      return data;
    });
  },
  write: function (value) {
   this
    .UInt16BE(value.tpci)
    .Int8(value.ttl)
    .Int8(value.proto)
    .UInt16BE(value.csum)
    .UInt16BE(value.src_addr)
    .UInt16BE(value.dest_addr)
    .Uint8(value.apdu_length);
  }
});

/* ==================== CEMI ====================== */

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
           2   |       service_type: -1,        0x3 low
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
*/
var FRAME_TYPE = {
   EXTENDED: 0x00,
   STANDARD: 0x01,
};
var MESSAGECODES = {
  "L_Raw.req":       0x10,
  "L_Data.req":      0x11,
  "L_Poll_Data.req": 0x13,
  "L_Poll_Data.con": 0x25,
  "L_Data.ind":      0x29,
  "L_Busmon.ind":    0x2B,
  "L_Raw.ind":       0x2D,
  "L_Data.con":      0x2E,
  "L_Raw.con":       0x2F
};

// control field
var ctrlStruct = new Parser()
  // byte 1
  .bit1('frameType')
  .bit1('reserved')
  .bit1('repeat')
  .bit1('broadcast')
  .bit2('priority')
  .bit1('acknowledge')
  .bit1('confirm')
  // byte 2
  .bit1('destAddrType')
  .bit3('hopCount')
  .bit4('extendedFrame');

knxnetprotocol.define('CEMI', {
 read: function (propertyName) {
    this.pushStack({ msgcode: 0, addinfo_length: -1, ctrl: null, src_addr: null, dest_addr: null, apdu_length: null, tpdu: null, apdu: null })
    .Int8('msgcode')
    .Int8('addinfo_length')
    .raw('ctrl', 2)
    .UInt16BE('src_addr')
    .UInt16BE('dest_addr')
    .Int8('apdu_length')
    .Int8('tpdu')
    .tap(function (hdr) {
      // parse 16bit control field
      hdr.ctrl = ctrlStruct.parse(hdr.ctrl);
      console.log("ctrl fields: %j", hdr.ctrl);
      switch(hdr.msgcode) {
        case MESSAGECODES["L_Data.ind"]: // received a data frame
        case MESSAGECODES["L_Data.con"]: // received a data frame
          this.raw('apdu', hdr.apdu_length);
          break;
        default:
          throw "Unhandled message code: "+keyText(MESSAGECODES, hdr.msgcode);
      }
      //console.log("cemi: apdu collect: %j", hdr);
      //console.log(KnxHelper.GetAddress(hdr.src_addr, '.', true));
      return hdr;
    })
    .popStack(propertyName, function (data) {
      //console.log('popStack CEMI: %j', data);
      return data;
    });
  },
  write: function (value) {
   this
     .Int8(value.msgcode)
     .Int8(value.addinfo_length)
     .raw(value.ctrl, 2)
     .UInt16BE(value.src_addr)
     .UInt16BE(value.dest_addr)
     .Int8(value.apdu_length)
     .Int8(value.tpdu);
  }
});

var SERVICE_TYPE = {
    SEARCH_REQUEST:   0x0201,
    SEARCH_RESPONSE:  0x0202,
    DESCRIPTION_REQUEST:  0x0203,
    DESCRIPTION_RESPONSE: 0x0204,
    CONNECT_REQUEST:   0x0205,
    CONNECT_RESPONSE:  0x0206,
    CONNECTIONSTATE_REQUEST:  0x0207,
    CONNECTIONSTATE_RESPONSE: 0x0208,
    DISCONNECT_REQUEST:   0x0208,
    DISCONNECT_RESPONSE:  0x020a,
    DEVICE_CONFIGURATION_REQUEST: 0x0310,
    DEVICE_CONFIGURATION_ACK:     0x0311,
    TUNNELLING_REQUEST: 0x0420,
    TUNNELLING_ACK:     0x0421,
    ROUTING_INDICATION:   0x0530,
    ROUTING_LOST_MESSAGE: 0x0531,
    UNKNOWN: -1
};
knxnetprotocol.define('KNXNetHeader', {
  read: function (propertyName) {
    console.log('reading KNXNetHeader');
    this.pushStack({ header_length: 0, protocol_version: -1, service_type: -1, total_length: 0, payload: {} })
    .Int8   ('header_length')
    .Int8   ('protocol_version')
    .Int16BE('service_type')
    .Int16BE('total_length')
    .tap(function (hdr) {
      if (hdr.header_length < hdr.length)
        throw "Incomplete KNXNet header";
      console.log("offset %d ==> %s", this.offset, keyText(SERVICE_TYPE, hdr.service_type));
      switch (hdr.service_type) {
//        case SERVICE_TYPE.SEARCH_REQUEST:
        case SERVICE_TYPE.CONNECT_REQUEST: {
          this.HPAI('hpai').HPAI('tunn').CRI('cri').collect(function (data) {
            return data;
          });
        break; }
        case SERVICE_TYPE.CONNECT_RESPONSE: {
          this.ConnState('connstate').collect(function (data) {
            //console.log("connect_response collect: %j", data);
            return data;
          });
          break;
        }
        case SERVICE_TYPE.CONNECTIONSTATE_REQUEST: {
          break;
        }
        case SERVICE_TYPE.CONNECTIONSTATE_RESPONSE: {
          this.ConnState('conn_state');
          break;
        }
        case SERVICE_TYPE.DESCRIPTION_RESPONSE: {
          this.raw('value', hdr.total_length);
          break;
        }
        // most common case:
        case SERVICE_TYPE.TUNNELLING_REQUEST: {
          this.SeqState('seqstate').CEMI('cemi').collect(function (data) {
            return data;
          });
          break;
        }
        default: {
          console.log("KNXNetHeader: unhandled serviceType = %s", keyText(SERVICE_TYPE, hdr.service_type));
        }
      }
      console.log('+++ %j +++', hdr);
//      this.raw('data', hdr.total_length);
//      this.HPAI('data');
    })
    .popStack(propertyName, function (data) {
      console.log('%%% popstack KnxHeader %%%');
      // pop the interim value off the stack and insert the real value into `propertyName`
      return data;
    });
  },
  write: function (value) {
    console.log("writing KnxHeader %j", value);
    if (value === null) throw "cannot write null value"
    else {
      this
      .Int8   (6)
      .Int8   (0x10)
      .Int16BE(value.service_type)
      .Int16BE(value.total_length);
      switch (value.service_type) {
        case SERVICE_TYPE.SEARCH_REQUEST:
        case SERVICE_TYPE.CONNECT_REQUEST: {
          this.HPAI(value.hpai).HPAI(value.tunn).CRI(value.cri);
          break;
        }
        case SERVICE_TYPE.CONNECT_RESPONSE: {
          this.ConnState(value.connstate).
          break;
        }
        case SERVICE_TYPE.CONNECTIONSTATE_REQUEST: {
          // TODO
          break;
        }
        case SERVICE_TYPE.CONNECTIONSTATE_RESPONSE: {
          this.ConnState(value.conn_state);
          break;
        }
        case SERVICE_TYPE.DESCRIPTION_RESPONSE: {
          //this.raw('value', value.total_length);
          break;
        }
        // most common case:
        case SERVICE_TYPE.TUNNELLING_REQUEST: {
          this.SeqState(value.seqstate).CEMI(value.cemi);
          break;
        }
        default: {
          console.log("KNXNetHeader: unhandled serviceType = %s", keyText(SERVICE_TYPE, hdr.service_type));
        }
      }
    }
  }
});



module.exports = knxnetprotocol;
