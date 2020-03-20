var url = 'https://live-qrscan.herokuapp.com';
var port = '5000';
var socket = io.connect(url + ':' + port);
socket.on('connect', function() {
  socket.emit('my event', {data: 'connected!'});
})

var aaa = setInterval(()=>{
  socket.emit('my event', {data: 'connected!'});
}, 1000)