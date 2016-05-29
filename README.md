A pure Javascript KNXnet/IP stack
based on https://github.com/lifeemotions/knx.net

#Installation
`npm install knx`


#Usage

```
// load the library
var knx = require('knx');

// create a multicast connection
var connection = new knx.KnxConnectionRouting();
// or, in case your machine isn't in the same LAN as the KNX IP router, use:
var connection = new KnxConnectionTunneling('192.168.2.222');
// you can optionally specify the port number and the local interface:
var connection = new KnxConnectionTunneling('192.168.2.222', 3671, 'eth0');

// sending a Write request to a binary group address
connection.Write("1/0/0", true);
// you also can be explicit about the datapoint type
connection.Write("2/1/0", 22.5, "DPT")

connection.Connect(function () {
    setTimeout(toggleLight, 2000);
    setTimeout(toggleLight, 5000);
    setTimeout(function () {
        connection.Disconnect();
    }, 7000);
});
```
