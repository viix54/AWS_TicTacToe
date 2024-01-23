const httpAWSBeanstalk = 'TicTacToe-env-1.eba-tpvjsxkt.us-east-1.elasticbeanstalk.com';
var socket = io.connect(`http://${httpAWSBeanstalk}:2000`);
// window.onbeforeunload = ()=>{
// 	document.cookie = ''


scoreTableData();
// };
// var socket = io();
var message = document.getElementById('playing');
var winnersTable = [];
var decodedToken;

socket.on('token',({message:token})=>{
	document.cookie = `token=${token.IDtoken}`;
	console.log(`IDToken - ${token.IDtoken}`);
	console.log(`Decoded User name - ${token.decodToken['cognito:username']}`);
	decodedToken = token.decodToken;
	// console.log(`That how it looks like from cookies, man : ${document.cookie}`);
	checkingCookies();
	checkingForNewGamer();
})

//Handle greeting from server
socket.on('greeting-from-server', function(data){
	// message.innerText = data.message;
	console.log(data.message);
});

//Emit greeting from client
socket.emit('greeting-from-client', {
	message: "Hello server"
});


//Player

var myTurn = true
var symbol;

function getBoardState(){
	var obj = {};
	$('.board button').each(function(){
		obj[$(this).attr('id')] = $(this).text() || ' ';
	});
	
	return obj;
}

function isGameOver(){
	var state = getBoardState(),
	matches = ['XXX', 'OOO'];
	
	rows = [
			state.a0 + state.a1 + state.a2,
            state.b0 + state.b1 + state.b2,
            state.c0 + state.c1 + state.c2,
            state.a0 + state.b1 + state.c2,
            state.a2 + state.b1 + state.c0,
            state.a0 + state.b0 + state.c0,
            state.a1 + state.b1 + state.c1,
            state.a2 + state.b2 + state.c2
			];
	
	for(var i=0; i<rows.length; i++){
		if(rows[i] === matches[0] || rows[i] === matches[1]){
			return true;
		}
	}
}

function isGameDraw(){
	var s = getBoardState();
	if( s.a0 ===' ' || s.a1 === ' ' || s.a2 === ' ' ||
		s.b0 ===' ' || s.b1 === ' ' || s.b2 === ' ' ||
		s.c0 ===' ' || s.c1 === ' ' || s.c2 === ' ' )
		return false;
	return true;	
}

//Change Turn message
function TurnMessage(){
	if(!myTurn){
		$('#turn').text('Your friend\'s turn..');
		$('.board button').attr('disabled', true);
	}
	else{
		$('#turn').text('Your turn..');
		$('.board button').removeAttr('disabled');
	}
}

function makeMove (e){
	e.preventDefault();
	
	if(!myTurn){
		return;
	}
	
	if($(this).text().length){
		return;
	}
	
	socket.emit('make.move', {
		symbol: symbol,
		position: $(this).attr('id')
	});
}

// After player makes move
socket.on('move.made', function (data) {
	
    $('#' + data.position).text(data.symbol);
    myTurn = (data.symbol !== symbol);
	
	if(isGameDraw()){
		$('#turn').text('Game Over.  It was a draw!');
		$('.board button').attr('disabled', true);
	}
	else if (!isGameOver()) {
		TurnMessage();
    }
	else {
        if (myTurn) {
            $('#turn').text('Game over. You lost.');
        } 
		else {
            $('#turn').text('Game over. You won!');
			addingPointsForWin();
        }
        $('.board button').attr('disabled', true);
    }
});

// Set up the initial state when the game begins
socket.on('game.begin', function (data) {

	// The server will asign X or O to the player
	symbol = data.symbol;

	// Give X the first turn
	myTurn = (symbol === 'X');
    TurnMessage();
});

// Disable the board if the opponent leaves
socket.on('opponent.left', function () {
    $('#turn').text('Your opponent left the game.');
    $('.board button').attr('disabled', true);
});

function uiForLoggedInUser(){
	$('.login_btn').attr('disabled', true)
	document.getElementsByClassName('start-playing')[0].style.display = 'block';
	document.getElementsByClassName('score__table')[0].style.display = 'none';
	document.getElementsByClassName('miniScore__table')[0].style.display = 'flex';
}

function addingWinnersToScoreTable(tablesBody,place,winner){
	let checkingForBigTable = tablesBody.id === 'tables__body';
	let newRow = document.createElement('tr');

	let newHead = document.createElement('th')
	newHead.appendChild(document.createTextNode(place));

	let newUser = document.createElement('td');
	newUser.appendChild(document.createTextNode(winner.user));

	let newWinnings = document.createElement('td');
	checkingForBigTable ? newWinnings.appendChild(document.createTextNode(`${winner.winnings} wins`)) : newWinnings.appendChild(document.createTextNode(`${winner.winnings} w`) );
	// console.log(place);
	switch(place){
		case 1:
		 	checkingForBigTable ? newWinnings.style.color = 'lightgreen': newWinnings.style.color = 'green';
			break;
		case 2:
			newWinnings.style.color = 'yellow' ;
			break;
		case 3:
			newWinnings.style.color = 'red' ;	
			break;
		default:
			null;	
	}
	

	newRow.appendChild(newHead);
	newRow.appendChild(newUser);
	newRow.appendChild(newWinnings);
	tablesBody.appendChild(newRow);
}

function fetchingWinnersDataOut(){
	console.log(winnersTable);
	winnersTable.sort((f,s)=> s.winnings - f.winnings);
	let tablesBody = document.getElementById('tables__body');
	let miniTablesBody = document.getElementById("miniTable__body");
	let place = 1;
	winnersTable.forEach((winner)=>{
		addingWinnersToScoreTable(tablesBody,place,winner);
		addingWinnersToScoreTable(miniTablesBody,place,winner);
		++place;
	})
}

$(function () {
    $('.board button').attr('disabled', true);
    $('.board button').on('click', makeMove); //---------********
});
function checkingCookies () {
    let cookies = document.cookie.split('; ');
	let token;
	cookies.forEach((cookie)=>{
		let cookieItself = cookie.split('=');
		cookieItself.includes('token')?(token = cookieItself[1]):null;
	});
	// console.log(token);
	(token !== 'undefined' && token !=='' && token !== ' ' && token !== null && token !== undefined)? (uiForLoggedInUser()):null;
};
$(function(){
	let cookies = document.cookie.split('; ');
	// document.getElementsByClassName('miniScore__table')[0].style.display = 'none';
	document.getElementsByClassName('start-playing')[0].style.display = 'none';
	document.getElementsByClassName('score__table')[0].style.display = 'flex';
	// let newCookies = [];
	cookies.forEach((cookie)=>{
		let cookieItself = cookie.split('=');
		cookieItself.includes('token')?(document.cookie=`token=; max-age=0`):null;
	});
	checkingCookies();
});

async function scoreTableData(){
	await fetch(`http://${httpAWSBeanstalk}:2000/dbTable`).then(result => result.json()).then(data => winnersTable = data);
	// console.log(winnersTable);
	fetchingWinnersDataOut();
};

async function addingNewGamerToDB(){
	await fetch (`http://${httpAWSBeanstalk}:2000/addingNewGamer`,{
		method: 'POST',
		headers:{
			'Content-Type':'application/json'
		},
		body:JSON.stringify({user:decodedToken['cognito:username']})
	}).then(response => response.json())
	.then((data) => {
		winnersTable = data;
	})
	.catch(error => console.error(`Error: ${error}`));
	deleteOldTableData();
	socket.emit('userDataChanged',{
		message:'something changed',
	})
}

function deleteOldTableData(){
	let tablesBody = document.getElementById('tables__body');
	let miniTablesBody = document.getElementById("miniTable__body");
	while (tablesBody.firstChild && miniTablesBody.firstChild) {
		tablesBody.removeChild(tablesBody.firstChild);
		miniTablesBody.removeChild(miniTablesBody.firstChild);
	}
}

socket.on('changeUsersData',function(data){
	console.log(`change Users Data`);
	deleteOldTableData();
	scoreTableData();
})

function checkingForNewGamer(){
	winnersTable.find((winner)=>winner.user === decodedToken['cognito:username']) === undefined ? addingNewGamerToDB():null;
}

async function addingPointsForWin(){
	await fetch (`http://${httpAWSBeanstalk}:2000/addingPointForWin`,{
		method: 'POST',
		headers:{
			'Content-Type':'application/json'
		},
		body:JSON.stringify({user:decodedToken['cognito:username']})
	}).then(response => response.json())
	.then((data) => {
		socket.emit('userDataChanged',{
			message:'something changed',
		})
	})
	.catch(error => console.error(`Error: ${error}`));
}

function login(){
	let loginTab = window.open( `https://test0002.auth.us-east-1.amazoncognito.com/login?client_id=7tm9crg9rlf0c4lh0qubfe9lu1&redirect_uri=http://${httpAWSBeanstalk}:2000/callback&response_type=code`,'_blank');
}

	