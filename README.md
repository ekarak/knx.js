A KNXnet/IP implementation for Javascript
Based on https://github.com/lifeemotions/knx.net

#Installation
`npm install knx`


#Usage

```
var KnxConnectionTunneling = require('knx').KnxConnectionTunneling;
var connection = new KnxConnectionTunneling('192.168.2.222', 3671, '192.168.2.107', 13671);

var lightValue = false;
function toggleLight() {
    lightValue = !lightValue;
    connection.Action("1/0/0", lightValue);
}

connection.Connect(function () {
    setTimeout(toggleLight, 2000);
    setTimeout(toggleLight, 5000);
    setTimeout(function () {
        connection.Disconnect();
    }, 7000);
});



```
 
