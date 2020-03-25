var url = 'https://live-qrscan.herokuapp.com';
// var url = 'http://127.0.0.1:5000'
var port = '5000';
var socket = io.connect(url);

let backBtn = document.getElementById('back');
let showStatusBtn = document.getElementById('showStatus');
let systemTime = document.getElementById('systime');

let pageHome = document.getElementById('home-page');
let pageGroup = document.getElementById('whichgroup-page');
let pageScan = document.getElementById('scan-page');
let pageLogin = document.getElementById('login-page');
let pageInOut = document.getElementById('inout-page');
let pageQR = document.getElementById('qrcode-page')
let pageLive  = document.getElementById('dashboard-page');

let iamOwnerBtn = document.getElementById('iamOwner');
let iamMemberBtn = document.getElementById('iamMember');
let groupInputForm = document.getElementById('group_name_input_form');
let ownerLoginForm = document.getElementById('owner_login_form');

let jbScanner;
let switchCamBtn = document.getElementById("switchCam");
let scannerParentElement = document.getElementById("scanner");
let scannedTextMemo = document.getElementById("scannedTextMemo");

let startScanBtn = document.getElementById('startScan');
let stopScanBtn = document.getElementById('stopScan');

let inQrBtn = document.getElementById('showInQr');
let outQrBtn = document.getElementById('showOutQr');

var qrcode = new QRCode(document.getElementById("qrcode"))
var debugMsg = document.getElementById("debugMsg");

let curGroup = document.getElementById('curGroup');

let ctx = document.getElementById('liveChart').getContext('2d');
let chartData = {
  labels: [],
  datasets: []
};

let liveStatusChart = new Chart(ctx, {
  type: 'horizontalBar',
  data: chartData,
  options: {
      // Elements options apply to all of the options unless overridden in a dataset
      // In this case, we are setting the border of each horizontal bar to be 2px wide
      elements: {
          rectangle: {
              borderWidth: 2,
          }
      },
      responsive: true,
      legend: {
        display: false,
      },
      title: {
          display: true,
          text: '即時資訊'
      }
  }
});

var color = Chart.helpers.color;

let currentStream;
let camDirection = true; // true is rear cam
let gpName = '__not_defined'
let viewHistory = [];
let whichGate = {groupName:gpName, gate:'', inout:'in'};
let jsqrInited = false;

// socket
socket.on('connect', function() {
  socket.emit('my event', {data: 'connected!'});
  init();
  let queryStatus = setInterval(getStatus,5000)
})

socket.on('reply', function(data) {
  console.log(data)
  // debug only
  // debugMsg.innerText = JSON.stringify(data);

})

socket.on('status', function(data) {
  console.log(data);
  updateLiveStatus(liveStatusChart, data.data)
  // debug only
  debugMsg.innerText = JSON.stringify(data);

})

// listener
showStatusBtn.addEventListener('click', ()=>{
  $(pageLive).toggleClass('view-shown');
})

backBtn.addEventListener('click', ()=>{
  let curV = getCurrentView();
  let lastV = showLastView();
  console.log(curV.id)
  let isTop = lastV.id === 'home-page';
  if (isTop){
    $(backBtn).hide();
  }else if (curV.id === 'scan-page'){
    jbScanner.removeFrom(scannerParentElement);
    scannerParentElement.innerHTML = '';
    jsqrInited = false;
  }
})

iamOwnerBtn.addEventListener('click',()=>{
  showView(pageLogin);
  $(backBtn).show();
})

iamMemberBtn.addEventListener('click',()=>{
  showView(pageGroup);
  $(backBtn).show();
})

groupInputForm.addEventListener('submit',(e)=>{
  e.preventDefault();
  let inputGpName = groupInputForm.elements.namedItem("group_name").value;
  if (inputGpName === ''){
    $("#whichgroup-page .alert").show();
    let showAlert = setTimeout(()=>{
      $("#whichgroup-page .alert").hide();
    },1500);
  }else{
    if(!jsqrInited){
      initJsQRScanner();
    }
    gpName = inputGpName;
    curGroup.innerHTML = "我的小隊: " + inputGpName;
    $("#scan-page .qrscan_text_info").hide();
    showView(pageScan);
    $(backBtn).show();
  }
  
})

ownerLoginForm.addEventListener('submit',(e)=>{
  let pw = ownerLoginForm.elements.namedItem("password").value;
  let gate = $(ownerLoginForm).find(":selected").text();
  e.preventDefault();
  // check password
  if (pw === '1234'){
    whichGate.gate = gate;
    showView(pageInOut);
  }else{
    $("#login-page .alert").show();
    let showAlert = setTimeout(()=>{
      $("#login-page .alert").hide();
    },2000);
  }

})

inQrBtn.addEventListener('click', ()=>{
  showView(pageQR);
  $(pageQR).find('h4').html('通關開始QRCODE');
  whichGate.inout = 'in';
  whichGate.groupName = '__not_defined';
  qrcode.makeCode(JSON.stringify(whichGate));
})

outQrBtn.addEventListener('click', ()=>{
  showView(pageQR);
  $(pageQR).find('h4').html('通關結束QRCODE');
  whichGate.inout = 'out';
  whichGate.groupName = '__not_defined';
  qrcode.makeCode(JSON.stringify(whichGate));
})

startScanBtn.addEventListener('click', ()=>{
  jbScanner.resumeScanning();
})

stopScanBtn.addEventListener('click', ()=>{
  jbScanner.stopScanning();
})

switchCamBtn.addEventListener('click', (event)=>{
  console.log(camDirection)
  if (typeof currentStream !== 'undefined') {
    stopMediaTracks(currentStream);
  }
  const videoConstraints = {};
  if (camDirection) {
    videoConstraints.facingMode = 'environment';
  } else {
    videoConstraints.facingMode = 'user';
  }
  const constraints = {
    video: videoConstraints,
    audio: false
  };

  navigator.mediaDevices
    .getUserMedia(constraints)
    .then(stream => {
      let video = document.querySelector('#scanner video');
      console.log(video)
      currentStream = stream;
      video.srcObject = stream;
      return navigator.mediaDevices.enumerateDevices();
    })
    .then(gotDevices=>{
      camDirection = !camDirection;
    })
    .catch(error => {
      console.error(error);
    });
})

// functions
function stopMediaTracks(stream) {
  stream.getTracks().forEach(track => {
    track.stop();
  });
}

function getStatus(){
  socket.emit('show status', whichGate);
}

let monitorTime = setInterval(()=>{
  let currentDate = new Date();
  systemTime.innerHTML = currentDate.toLocaleTimeString();
},1000)

function init(){
  $('#home-page').addClass('view-shown');
  $(backBtn).hide();
}

init()

function showView(targetView){
  let currentView = getCurrentView();
  $(currentView).removeClass('view-shown');
  setView(currentView);
  $(targetView).addClass('view-shown');
}

function showLastView(){
  let currentView = getCurrentView();
  $(currentView).removeClass('view-shown');
  let lastV = lastView();
  $(lastV).addClass('view-shown');
  return lastV;
}

function setView(viewDOM){
  viewHistory.push(viewDOM);
}

function lastView(){
  return viewHistory.pop();
}

function getCurrentView(){
  var currentView = document.querySelector('.view-shown');
  return currentView;
}


// JsQRScanner function
function onQRCodeScanned(scannedText)

    {
    	console.log(scannedText)
    	if(scannedText)
    	{
        let decodedObj = JSON.parse(scannedText);
        decodedObj.groupName = gpName;
        // scannedTextMemo.innerText = scannedText;
        scannedTextMemo.innerHTML = `<i class="fas fa-check"></i>掃描完成
                                      <div>隊名:${decodedObj.groupName}</div>
                                      <div>關號:${decodedObj.gate}</div>
                                      <div>類別:${decodedObj.inout}</div>`;            

        $("#scan-page .qrscan_text_info").show();
        let showAlert = setTimeout(()=>{
          $("#scan-page .qrscan_text_info").hide();
        },2000);

        // save data to server

        socket.emit('check in', decodedObj);
        
        console.log(JSON.stringify(decodedObj));

    	}
    }

function provideVideo()
{
    var n = navigator;

    if (n.mediaDevices && n.mediaDevices.getUserMedia)
    {
      return n.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment"
        },
        audio: false
      });
    } 
    
    return Promise.reject('Your browser does not support getUserMedia');
}

//funtion returning a promise with a video stream
function provideVideoQQ()
{
    return navigator.mediaDevices.enumerateDevices()
    .then(function(devices) {
        var exCameras = [];
        devices.forEach(function(device) {
        if (device.kind === 'videoinput') {
          exCameras.push(device.deviceId)
        }
     });
        
        return Promise.resolve(exCameras);
    }).then(function(ids){
        if(ids.length === 0)
        {
          return Promise.reject('Could not find a webcam');
        }
        
        return navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true
        });        
    });                
} 

function initJsQRScanner(){
  //create a new scanner passing to it a callback function that will be invoked when
  //the scanner succesfully scan a QR code
  jbScanner = new JsQRScanner(onQRCodeScanned, provideVideoQQ);
  //reduce the size of analyzed images to increase performance on mobile devices
  jbScanner.setSnapImageMaxSize(3000);
  jbScanner.setScanInterval(250);
  if(scannerParentElement)
  {
      //append the jbScanner to an existing DOM element
    jbScanner.appendTo(scannerParentElement);
  }
  jsqrInited = true;
}


// plot function
function updateLiveStatus(chart, data) {
  console.log(data)

  // get team names
  let label = data.map((element)=>{
    return element.groupName;
  })
  // get interval
  let interv = data.map((element)=>{
    let inv = element.intv ===''?0:parseFloat(element.intv);
    return inv;
  })
  console.log(label)
  console.log(interv)

  chart.data.labels = label;
  chart.data.datasets = [{
    label: '',
    backgroundColor: 'rgba(255, 99, 132, 0.2)',
    borderColor: 'rgba(255, 99, 132, 1)',
    data: interv
}];
  chart.update();
}
