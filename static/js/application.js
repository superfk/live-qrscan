var url = 'https://live-qrscan.herokuapp.com';
var url = 'http://127.0.0.1'
var port = '5000';
var socket = io.connect(url + ':' + port);

let backBtn = document.getElementById('back');
let systemTime = document.getElementById('systime');

let pageHome = document.getElementById('home-page');
let pageScan = document.getElementById('scan-page');
let pageLogin = document.getElementById('login-page');
let pageInOut = document.getElementById('inout-page');
let pageQR = document.getElementById('qrcode-page')

let iamOwnerBtn = document.getElementById('iamOwner');
let iamMemberBtn = document.getElementById('iamMember');
let ownerLoginForm = document.getElementById('owner_login_form');

let jbScanner;
let scannerParentElement = document.getElementById("scanner");
let scannedTextMemo = document.getElementById("scannedTextMemo");

let startScanBtn = document.getElementById('startScan');
let stopScanBtn = document.getElementById('stopScan');

let inQrBtn = document.getElementById('showInQr');
let outQrBtn = document.getElementById('showOutQr');

var qrcode = new QRCode(document.getElementById("qrcode"))

let viewHistory = [];
let whichGate = {gate:'', inout:'in'};
let jsqrInited = false;

// socket
socket.on('connect', function() {
  socket.emit('my event', {data: 'connected!'});
  init();
})

// listener
backBtn.addEventListener('click', ()=>{
  let curV = getCurrentView();
  let lastV = showLastView();
  console.log(curV.id)
  let isTop = lastV.id === 'home-page';
  if (isTop){
    $(backBtn).hide();
  }else if (curV.id === 'scan-page'){
    jbScanner.removeFrom(scannerParentElement);
  }
})

iamOwnerBtn.addEventListener('click',()=>{
  showView(pageLogin);
  $(backBtn).show();
})

iamMemberBtn.addEventListener('click',()=>{
  if(!jsqrInited){
    initJsQRScanner();
  }
  showView(pageScan);
  $("#scan-page .qrscan_text_info").hide();
  $(backBtn).show();
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
  qrcode.makeCode(JSON.stringify(whichGate));
})

outQrBtn.addEventListener('click', ()=>{
  showView(pageQR);
  $(pageQR).find('h4').html('通關結束QRCODE');
  whichGate.inout = 'out';
  qrcode.makeCode(JSON.stringify(whichGate));
})

startScanBtn.addEventListener('click', ()=>{
  jbScanner.resumeScanning();
})

stopScanBtn.addEventListener('click', ()=>{
  jbScanner.stopScanning();
})

// functions
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
    	
    	if(scannedTextMemo)
    	{
            scannedTextMemo.innerText = scannedText;

            $("#scan-page .qrscan_text_info").show();

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

function initJsQRScanner(){
  //create a new scanner passing to it a callback function that will be invoked when
  //the scanner succesfully scan a QR code
  jbScanner = new JsQRScanner(onQRCodeScanned);
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

  //this function will be called when JsQRScanner is ready to use
// function JsQRScannerReady()
// {
//   jsqrReady = true;      
// }