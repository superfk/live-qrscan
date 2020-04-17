document.addEventListener('DOMContentLoaded', () => {

  var url = 'https://live-qrscan.herokuapp.com:5000';
  var url = 'http://127.0.0.1:5000'
  var port = '5000';

  let backBtn = document.getElementById('back');
  let showStatusBtn = document.getElementById('showStatus');
  let systemTime = document.getElementById('systime');

  let pageHome = document.getElementById('home-page');
  let pageGroup = document.getElementById('whichgroup-page');
  let pageCheckRecord = document.getElementById('dev-check-record-page');
  let pageScan = document.getElementById('scan-page');
  let pageLogin = document.getElementById('login-page');
  let pageInOut = document.getElementById('inout-page');
  let pageQR = document.getElementById('qrcode-page')
  let pageLive  = document.getElementById('dashboard-page');

  let iamDevBtn = document.getElementById('iamDev');
  let iamOwnerBtn = document.getElementById('iamOwner');
  let iamMemberBtn = document.getElementById('iamMember');
  let checkRecordForm = document.getElementById('check_record_form');
  let groupInputForm = document.getElementById('group_name_input_form');
  let ownerLoginForm = document.getElementById('owner_login_form');

  let jbScanner;
  let switchCamBtn = document.getElementById("switchCam");
  let scannerParentElement = document.getElementById("scanner");
  let scannedTextMemo = document.getElementById("scannedTextMemo");

  let closeCamScanToogle = document.getElementById('closeCamScan');
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
            text: '闖關時間統計(秒)'
        },
        tooltips:{
          mode: 'index',
          intersect: false
        },
        scales:{
          xAxes: [{
            stacked: true,
          }],
          yAxes: [{
            stacked: true
          }]
        }
    }
  });

  var COLORS = ['#f1c40f','#e67e22','#e74c3c','#8e44ad', '#2c3e50', '#3498db', '#fdcb6e', '#ff7675', '#81ecec', '#b2bec3']

  let currentStream;
  let camDirection = true; // true is rear cam
  let gpName = '__not_defined'
  let viewHistory = [];
  let whichGate = {groupName:gpName, gate:'', inout:'in'};
  let jsqrInited = false;
  let showAlert = null;

  // socket
  let socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port, {transports: ['websocket']});

  socket.on('connect', function() {
    socket.emit('my event', {data: 'connected!'});
    init();
    getStatus()
    let queryStatus = setInterval(getStatus,30000)
  })
  
  socket.on('reply', function(data) {
    console.log(data)
  
  })
  
  socket.on('status', function(data) {
    updateLiveStatus(liveStatusChart, data.data)
  })

  socket.on('allRecords', function(data) {
    console.log(data);
    updateRecods(data);
  })

  // listener
  showStatusBtn.addEventListener('click', ()=>{
    $(pageLive).toggleClass('view-shown');
  })

  backBtn.addEventListener('click', ()=>{
    let curV = getCurrentView();
    let lastV = showLastView();
    let isTop = lastV.id === 'home-page';
    if (isTop){
      $(backBtn).hide();
    }else if (curV.id === 'scan-page'){
      stopMediaTracks();
    }
  })

  iamDevBtn.addEventListener('click',()=>{
    showView(pageCheckRecord);
    $(backBtn).show();
  })

  iamOwnerBtn.addEventListener('click',()=>{
    showView(pageLogin);
    $(backBtn).show();
  })

  iamMemberBtn.addEventListener('click',()=>{
    showView(pageGroup);
    $(backBtn).show();
  })

  checkRecordForm.addEventListener('submit',(e)=>{
    e.preventDefault();
    let myTable = document.getElementById('recordsTable')
    myTable.innerHTML = ''
    let inputGpName = checkRecordForm.elements.namedItem("searchTeamName").value;
    let inputGateNumber = checkRecordForm.elements.namedItem("searchGate").value;
    socket.emit('show records',{ group: inputGpName, gate: inputGateNumber });
    
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
    $(pageQR).find('h4').html('第'+whichGate.gate+'關:通關開始QRCODE');
    whichGate.inout = 'in';
    whichGate.groupName = '__not_defined';
    qrcode.makeCode(JSON.stringify(whichGate));
  })

  outQrBtn.addEventListener('click', ()=>{
    showView(pageQR);
    $(pageQR).find('h4').html('第'+whichGate.gate+'關:通關結束QRCODE');
    whichGate.inout = 'out';
    whichGate.groupName = '__not_defined';
    qrcode.makeCode(JSON.stringify(whichGate));
  })

  closeCamScanToogle.addEventListener('change', (e)=>{
    let isOpen = $(e.target).prop('checked');
    if (isOpen) {
      initJsQRScanner();
      console.log('resume cam')
    }else{
      stopMediaTracks();
      console.log('close cam')
    }
  })

  stopScanBtn.addEventListener('click', ()=>{
    jbScanner.stopScanning();
  })

  switchCamBtn.addEventListener('click', (event)=>{
    if (typeof currentStream !== 'undefined') {
      stopMediaTracks();
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
  function stopMediaTracks() {
    let vid = document.querySelector('#scanner video');
    try{
      let stream = vid.srcObject;
      stream.getTracks().forEach(track => {
        track.stop();
      });
      jbScanner.removeFrom(scannerParentElement);
      scannerParentElement.innerHTML = '';
      jsqrInited = false;
    }catch{
      console.log('close cam error')
    }
    
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

  function showQRText(){
    $("#scan-page .qrscan_text_info").hide();
  }

  // JsQRScanner function
  function onQRCodeScanned(scannedText)

      {
        console.log(scannedText)
        if(scannedText)
        {
          try{
            let decodedObj = JSON.parse(scannedText);
            decodedObj.groupName = gpName;
            // scannedTextMemo.innerText = scannedText;
            scannedTextMemo.innerHTML = `<i class="fas fa-check"></i>掃描完成
                                          <div>隊名:${decodedObj.groupName}</div>
                                          <div>關號:${decodedObj.gate}</div>
                                          <div>類別:${decodedObj.inout}</div>`;            
            
            $("#scannedTextMemo").removeClass("qrOK qrNG").addClass("qrOK");
            $("#scan-page .qrscan_text_info").show();
            clearTimeout(showAlert);
            showAlert = setTimeout(showQRText,2000);

            // save data to server

            socket.emit('check in', decodedObj);
            
            console.log(JSON.stringify(decodedObj));

          }catch{
            console.log('Not Recognize this QRCODE');

            // scannedTextMemo.innerText = scannedText;
            scannedTextMemo.innerHTML = `<i class="fas fa-times"></i>掃描失敗
                                          <div>無法識別</div>`;  

            $("#scannedTextMemo").removeClass("qrOK qrNG").addClass("qrNG");
            $("#scan-page .qrscan_text_info").show();
            clearTimeout(showAlert);
            showAlert = setTimeout(showQRText,2000);
          }
          

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
        })
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
              video: {
                facingMode: "environment"
              }
          });        
      });                
  } 

  function initJsQRScanner(){
    //create a new scanner passing to it a callback function that will be invoked when
    //the scanner succesfully scan a QR code
    jbScanner = new JsQRScanner(onQRCodeScanned, provideVideo);
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
    
    // get team names
    let teams = data.map((element)=>{
      return element.groupName;
    })
    // get interval
    let interv = data.map((element)=>{
      let inv = element.intv ===''?0:parseFloat(element.intv);
      return inv;
    })

    // get done
    let barColor = data.map((element)=>{
      return element.done?'#16a085':'#c0392b';
    })

    // wrap gate time data amoung teams
    let gateTimes = [];
    if (data){
      gateTimes = data[0].gate_status.map((elm,index)=>{
        let gateTimeOfTeams = data.map((e,i)=>{
          return e.gate_status[index].intv;
        })
        return {
          label: elm.gate,
          backgroundColor: COLORS[index%COLORS.length],
          borderColor: '#2c3e50',
          data: gateTimeOfTeams
        };
      })
    }
    

    chart.data.labels = teams;
    chart.data.datasets = gateTimes;
    chart.update();
  }

});

const updateRecods = data =>{

  let myTable = document.getElementById('recordsTable');

  let tableContent = ''

  data.data.forEach((elm,index)=>{
    tableContent += `
    <tr>
      <th scope="row">${index}</th>
      <td>${elm.name}</td>
      <td>${elm.gate}</td>
      <td>${elm.inout}</td>
      <td>${elm.time_stamp}</td>
    </tr>
    `
  })

  myTable.innerHTML = tableContent;
  
}