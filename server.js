var express = require('express');
var app = express();
var socket = require('socket.io');
const path = require('path');

const AWS = require('aws-sdk');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const jose = require('jose');
const util = require('util');

const https = require('https');
const fs = require('fs');
const httpAWSBeanstalk = 'TicTacToe-env-1.eba-tpvjsxkt.us-east-1.elasticbeanstalk.com'

// const port = 2000;

// const sslOptions = {
//   key: fs.readFileSync('key.pem'),
//   cert: fs.readFileSync('cert.pem'),
//   passphrase: 'local',
// };

// app.get('/', (req, res) => {
//   res.send('Hello, HTTPS World!');
// });

// const server = https.createServer(sslOptions, app);

// server.listen(port, () => {
//   console.log(`Server is running on https://localhost:${port}`);
// });


const mysql = require('mysql2');
const connection = mysql.createConnection({
	host:'afterunderstanding-db.c9a0oausqpq2.us-east-1.rds.amazonaws.com',
	user:'admin',
	password:'adminadmin',
	database:'nowWorks'
})
var winnersTable ;
connection.connect(err=>{
	if(err){
		console.error(`Ошибка подключения: `,err.stack);
		return;
	}
	console.log(`Подключение к базу данных успешно.`);
});


const port = process.env.PORT || 2000;
  
const redirectPagePath = path.join('D:\\PWRChmury\\Multiplayer-Tic-Tac-Toe-master\\src','views','index.html');
const DockerRedirectPagePath =path.join('/app/src/','views','index.html');

app.use(express.static('src'));
app.use(express.static('src/views'));

app.use(bodyParser.json());
app.use(cookieParser());

app.use((req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
	next();
  });

var server = app.listen(port, function(){
	console.log("Listening to port ", port);
});



const url = 'https://test0002.auth.us-east-1.amazoncognito.com/oauth2/token';
const clientId = '7tm9crg9rlf0c4lh0qubfe9lu1';
const clientSecret = '1fg019olc03oojei73o6v500j5li81i6crj9ec1rpceo2dnsek0';
const authorizationHeader = 'Basic ' + btoa(clientId + ':' + clientSecret);

// Данные запроса
const requestBody = new URLSearchParams();
requestBody.append('grant_type', 'authorization_code');
requestBody.append('redirect_uri', `http://${httpAWSBeanstalk}:2000/callback`);


// Опции запроса
const requestOptions = {
	method: 'POST',
	headers: {
		'Content-Type': 'application/x-www-form-urlencoded',
		'Authorization': authorizationHeader,
	},
	body: requestBody,
};

let publicKeys;
var io = socket(server); 

async function verifyIDtoken(token){
	let decodedIDtokenHeader = jose.decodeProtectedHeader(token);
	await fetch(`https://cognito-idp.us-east-1.amazonaws.com/us-east-1_kK4LmJ6hh/.well-known/jwks.json`).then(result => result.json()).then(res => publicKeys = res.keys);
	let jwk = publicKeys.find(key => key.kid === decodedIDtokenHeader.kid);
	pem = jwkToPem(jwk);
	console.log(jwt.verify(token,pem,{algorithms:[jwk.alg]},(err,decodedToken)=>{
		console.log(err || decodedToken);
		decodToken = decodedToken;
	}))
}

var IDtoken;
var decodToken;
app.get('/callback', async (req, res) => {
	const { code } = req.query;
	// console.log(`Old request body: ${requestBody}\\n`);
	// console.log(`----------------------------------`);
	requestBody.delete('code');
	requestBody.append('code', code);
	// console.log(`New requestBody: ${requestBody}\\n`);
	// console.log(`----------------------------------`);
	// Выполнение запроса
	fetch(url, requestOptions)
		.then(response => response.json())
		.then(data => {
		console.log('Ответ сервера:', data);
		IDtoken = data.id_token;
		// IDtokenExprDate;
		IDtoken && verifyIDtoken(IDtoken);
		})
		.catch(error => {
		console.error('Произошла ошибка:', error);
		});
		// io.emit('token',{
		// 	message:IDtoken
		// })
		res.redirect('/redirectPage');
	})

app.get('/redirectPage',(req,res)=>{
	res.sendFile(redirectPagePath);
})

const queryAsync = util.promisify(connection.query).bind(connection);

async function fetchUsers(){
	try {
		const result = await queryAsync('SELECT * FROM score');
		console.log(`Query result: `,result);
		return result;
	} catch (error) {
		console.log(`Error: `,error);
	}
}

app.get('/dbTable',async (req,res)=>{
	// connection.query(``,(error,results,fields)=>{
	// 	if(error) throw error;
	// 	winnersTable = results
	// 	console.log('Результат запроса: ',results);
	// })
	winnersTable = await fetchUsers();
	console.log(`Before sending to client - `,winnersTable);
	res.json(winnersTable);
})

app.post('/addingNewGamer',(req,res)=>{
	const postData = req.body;
	console.log(`Backend time to add !`);
	// Начало транзакции
	connection.beginTransaction(function(err) {
	if (err) { throw err; }
  
	// Выполнение UPDATE
	connection.query('INSERT INTO score (user,winnings) VALUES (?,0)', [postData.user], function(err, results, fields) {
	  if (err) {
		return connection.rollback(function() {
		  throw err;
		});
	  }
  
	  // Выполнение SELECT
	  connection.query('SELECT * FROM score', function(err, results, fields) {
		if (err) {
		  return connection.rollback(function() {
			throw err;
		  });
		}
  
		// Завершение транзакции
		connection.commit(function(err) {
		  if (err) {
			return connection.rollback(function() {
			  throw err;
			});
		  }
		  console.log('Transaction Complete.');
		  // Обработка  результатов SELECT
		  res.json(results);
		});
	  });
	});
  });
  
})

app.post('/addingPointForWin',async(req,res)=>{
	let woner = winnersTable.find((winner)=>winner.user === req.body.user);
	let winnersPreviousScore = woner.winnings;
	let newScore = ++winnersPreviousScore;
	try {
		const result = await queryAsync(`UPDATE score SET winnings = ${newScore} WHERE user='${woner.user}'`);
		console.log(`Query result: `,result);
		res.json({message:`POINTS WERE ADDED TO USER - ${woner.user}`});
	} catch (error) {
		console.log(`Error: `,error);
	}
})

io.on('connection', function(socket){
	console.log('Connection established to ', socket.id);
	IDtoken = null;
	// console.log(`TOKEN RIGHT BEFORE DEFINING! - ${IDtoken}`);

	// console.log(IDtoken);
	let tokenExist = false;
	let checkingTokenExist = setInterval(()=>{
		if(IDtoken !== 'undefined' && IDtoken !== null && IDtoken !== '' && IDtoken !== ' ' && IDtoken !== undefined){
			// console.log(`Token\`s emiting!`);
			console.log(`Here\`s your token: ${IDtoken}`);
			socket.emit('token',{
				message:{
					IDtoken,
					decodToken,
				}
			});
			tokenExist = true;
		}else{
			// console.log(`Waiting for token ! Right he is : ${IDtoken} (type of ${typeof IDtoken})`);
		}
	},2000)
	setInterval(()=>{
		tokenExist && clearInterval(checkingTokenExist);
	},1000)
	
	//greeting from server
	socket.emit('greeting-from-server', {
		message: "Hello client"
	});
	
	//greeting from client
	socket.on('greeting-from-client', function(data){
		console.log(data.message);
	});

	socket.on('userDataChanged',function(data){
		io.emit('changeUsersData',{
			message:'Changing everywhere',
		})
	})
	
	//join game
	
	joinGame(socket);
	
	//if opponent is found then start the game
	if(getOpponent(socket)){
		socket.emit('game.begin', {
			symbol: players[socket.id].symbol
		});
		
		getOpponent(socket).emit('game.begin',{
			symbol: players[getOpponent(socket).id].symbol
		});
	}
	
	//Listens for move and emit to both clients
	socket.on('make.move', function(data){
		if(!getOpponent(socket)){
			return;
		}
		socket.emit('move.made', data);
		getOpponent(socket).emit('move.made', data);
	});
	
	//Emit event when player leaves
	socket.on('disconnect', function(){
		if(getOpponent(socket)){
			getOpponent(socket).emit('opponent.left');
		}
		players[socket.id].opponent ? players[players[socket.id].opponent].opponent = null : null;
		unmatched = null; //Set back unmatched to null
		
		delete players[socket.id];
		// console.log(`\nUser has just been disconnected`);
		for (user in players){
			console.log(players[user]);
		}
		console.log('Disconnected ', socket.id);
	});
	
});

//Player
var players ={}
var unmatched;

function joinGame (socket){
	
	players[socket.id] = {
		opponent: unmatched,
		symbol: 'X',
		socket: socket
	};
	
	console.log(`\nNew User has just been added to array VALUES`);
	console.log(`His match status - ${unmatched}`);
	for (user in players){
		console.log(user);
	}
	//If any player who is present and is unmatched
	if(unmatched){
		players[socket.id].symbol = 'O';
		players[unmatched].opponent = socket.id;
		unmatched = null; //Set back unmatched to null
	}
	
	else{
		unmatched = socket.id;
	}
	// console.log(players);
}

function getOpponent(socket){
	if(!players[socket.id].opponent){
		return;
	}
	else{
		return players[players[socket.id].opponent].socket;
	}
}



