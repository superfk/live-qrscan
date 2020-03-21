var url = 'https://live-qrscan.herokuapp.com';
var url = 'http://127.0.0.1'
var port = '5000';
var socket = io.connect(url + ':' + port);

let backBtn = document.getElementById('back');
let systemTime = document.getElementById('systime');

let pageHome = document.getElementById('home-page');
let pageLogin = document.getElementById('login-page');
let pageInOut = document.getElementById('inout-page');

let iamOwnerBtn = document.getElementById('iamOwner');
let iamMemberBtn = document.getElementById('iamMember');
let ownerLoginForm = document.getElementById('owner_login_form');

let viewHistory = [];

// socket
socket.on('connect', function() {
  socket.emit('my event', {data: 'connected!'});
  init();
})

// listener
backBtn.addEventListener('click', ()=>{
  let ltView = getLastView();
})

iamOwnerBtn.addEventListener('click',()=>{
  $(pageHome).hide();
  $(backBtn).show();
  $(pageLogin).show();
  nextView()
})

iamMemberBtn.addEventListener('click',()=>{
})

ownerLoginForm.addEventListener('submit',(e)=>{
  console.log('hihi')
  let pw = ownerLoginForm.elements.namedItem("password").value;
  let gate = $(ownerLoginForm).find(":selected").text();
  console.log(pw)
  e.preventDefault();
  // check password
  if (pw === '1234'){
    console.log('good password')
    console.log('gate:' + gate)
    $(pageLogin).hide();
    $(pageInOut).show();
    setLastView(pageLogin);

  }

})

// functions
let monitorTime = setInterval(()=>{
  let currentDate = new Date();
  systemTime.innerHTML = currentDate.toLocaleTimeString();
},1000)

function init(){
  $('#home-page').show();
  nextView(pageHome);
  $(backBtn).hide();
}

init()

function nextView(viewDOM){
  viewHistory.push(viewDOM);
}

function lastView(){
  return viewHistory.pop();
}