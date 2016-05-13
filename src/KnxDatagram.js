var util = require('util');
var binary = require('binary');

function KnxDatagram(other) {

}

// copy a datagram from 
KnxDatagram.prototype.Copy = function (other)
{
    // HEADER
    /*int*/     this.header_length = other.header_length;
    /*byte*/    this.protocol_version = other.protocol_version;
    /*byte[]*/  this.service_type = other.service_type;
    /*int*/     this.total_length = other.total_length;

    // CONNECTION
    /*byte*/    this.channel_id = other.channel_id;
    /*byte*/    this.status = other.status;

    // CEMI
    /*byte*/    this.message_code = other.message_code;
    /*int*/     this.additional_info_length = other.additional_info_length;
    /*byte[]*/  this.additional_info = other.additional_info;
    /*byte*/    this.control_field_1 = other.control_field_1;
    /*byte*/    this.control_field_2 = other.control_field_2;
    /*string*/  this.source_address = other.source_address;
    /*string*/  this.destination_address = other.destination_address;
    /*int*/     this.data_length = other.data_length;
    /*byte[]*/  this.apdu = other.apdu;
    /*string*/  this.data = other.data;
}

// just parse the first 6 bytes off the buffer
KnxDatagram.prototype.Parse = function (buf)
{
	var self = this;
	var vars = binary(buf)
		.word8   ( 'header_length' )
		.word8   ( 'protocol_version' )
		.word16bs( 'service_type' )
		.word8   ( 'length1' )
		.word8   ( 'length2' )
		.vars;
	self.total_length = vars.length1 + vars.length2;
	for (var key in vars) {
		self[key] = vars[key];
	}
}

module.exports = KnxDatagram;
