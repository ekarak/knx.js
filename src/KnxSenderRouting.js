/**
 * KNX Routing support (IP Multicast)
 * Created by ekarak on 01.05.2016.
 */
var util = require('util');
var KnxSender = require('./KnxSender');

function KnxSenderRouting(/*KnxConnection*/ connection) {
    KnxSenderRouting.super_.call(this, connection);
}

util.inherits(KnxSenderRouting, KnxSender);

module.exports = KnxSenderRouting;
