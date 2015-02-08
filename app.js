var net = require('net');

var host_proxy = 'sg-2.sshgoogle.com';
var port_proxy = 80;

var server = net.createServer(function(socket) {

	socket.once('data', function(data) {
		var request_origin = data;

		// Buat koneksi ke original proxy server

		var socketProxy = new net.Socket();
		socketProxy.setKeepAlive(true);

		socketProxy.connect(port_proxy, host_proxy, function() {
			var header = addHeader(getHeader(request_origin.toString()), "\r\nProxy-Connection: Keep-Alive\r\nConnection: Keep-Alive\r\n\r\n");
			console.log(header);
			socketProxy.write(header);
		});

		socketProxy.on('end', function() {
			console.log(socketProxy.remoteAddress + ":" + socketProxy.remotePort + " proxy koneksi terputus...");
		});

		socketProxy.on('error', function(error) {
			console.log("err proxy : " + error.code);
			socketProxy.destroy();
			socket.destroy();
		});

		socketProxy.once('data', function(data) {
			
			console.log("INIT PROXY, length : " + data.toString());
			socket.write(data, 'binary');

			if(data.toString().search(/^HTTP\/1\.0 200/) != -1) {
				console.info("Server status : OK");

				// Lanjutkan koneksi - forward
				socket.on('data', function(data) {
					console.log("CLIENT Meminta Request, length req :" + data.length);
					socketProxy.write(data, 'binary');
				});

				socketProxy.on('data', function(data) {
					console.log("Menerima Response dari PROXY, length res :"+ data.length);
					socket.write(data, 'binary');
				});

			} else {
				socketProxy.destroy();
				socket.destroy();
			}
		});

		socketProxy.on('error', function(error) {
			console.log("err proxy : " + error.code);
			socketProxy.destroy();
			socket.destroy();
		});

	});

	socket.on('end', function() {
		console.log(socket.remoteAddress + ":" + socket.remotePort + " koneksi terputus...");
	});

	socket.on('error', function(error) {
		console.log("err app : " + error.code);
		socket.destroy();
	});

}).listen(6789, function(){
  	console.log("Inject listening on port %d", server.address().port)
});

server.on("error", function(error) {
	console.error("Server error..");
	console.error("Error Code : " + error.code)
});

function getHeader(str) {
    var data = str.split("\r\n\r\n");
    if(data.length > 0){
        return data[0];
    } else {
        return str;
    }
}

function addHeader(header, newHeader) {
    return header + newHeader;
}