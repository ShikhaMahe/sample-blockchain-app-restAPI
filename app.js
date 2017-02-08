process.env.GOPATH = __dirname;

var util = require('util');
var fs = require('fs');
const https = require('https');

// 1 - started
var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var http = require('http');
var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// =====================================================================================================================
//                                              Launch Webserver
// =====================================================================================================================
// Start the web server using our express app to handle requests
var host = process.env.VCAP_APP_HOST || '0.0.0.0';
var port = process.env.VCAP_APP_PORT || process.env.PORT;
console.log('Staring http server on: ' + host + ':' + port);
var server = http.createServer(app).listen(port, function () {
    console.log('Server Up - ' + host + ':' + port);
});
// 1- End


//Rest - start
var Ibc1 = require('ibm-blockchain-js');                                                        //rest based SDK for ibm blockchain
var ibc = new Ibc1();
var chaincode = {};
var network;
var peers = null;
var users = null;
// Read and process the credentials.json
    try {
        network = JSON.parse(fs.readFileSync(__dirname + '/ServiceCredentials.json', 'utf8'));
        if (network.credentials) network = network.credentials;
    } catch (err) {
        console.log("ServiceCredentials.json is missing or invalid file, Rerun the program with right file")
        process.exit();
    }

    peers = network.peers;
    users = network.users;

// ==================================
// configure options for ibm-blockchain-js sdk
// ==================================
var options =   {
                    network:{
                        peers: [peers[0]],                                                                  //lets only use the first peer! since we really don't need any more than 1
                        users: [users[2]],                                                   //dump the whole thing, sdk will parse for a good one
                        options: {
                                    quiet: true,                                                            //detailed debug messages on/off true/false
                                    tls: true,                                          //should app to peer communication use tls?
                                    maxRetry: 1                                                             //how many times should we retry register before giving up
                                }
                    },
                    chaincode:{
                        zip_url: 'https://github.com/ibm-blockchain/learn-chaincode/archive/master.zip',
                        unzip_dir: 'learn-chaincode-master/finished',                                                 //subdirectroy name of chaincode after unzipped
                        git_url: 'https://github.com/IBM-Blockchain/learn-chaincode/finished',                     //GO get http url
                    
                        //hashed cc name from prev deployment, comment me out to always deploy, uncomment me when its already deployed to skip deploying again
                        //deployed_name: '09d93af173f1e6b1ee202a550bc88e6fae877fd42e9e1e557438dbe860f23a8c'
                    }
                };

function initialize() {
    console.log("initializing...");
    ibc.load(options, function(err, cc){
        console.log("ibc.load: err - ", err);
        console.log("ibc.load: cc - ", JSON.stringify(cc));
        chaincode = cc;

        if(!cc.details.deployed_name || cc.details.deployed_name === ''){                   //yes, go deploy
            chaincode.deploy('init', ['Welcome to Blockchain!'], {delay_ms: 30000}, function(e){                       //delay_ms is milliseconds to wait after deploy for conatiner to start, 50sec recommended
                if (!e) {
                    chaincode.query.read(['hello_world'], function(err, output){
                    console.log('read func (hello_world):', output, err);
                    });
                }
            });
        }  
    });
}

initialize();

app.get('/', function (req, res) {
    res.render('index.html', {title: 'Sample App Demo', bag: {session: req.session}});
});

app.get('/invoke', function (req, res) {
    console.log("in invoke - req:", req.query.key, "--", req.query.value);
    chaincode.invoke.write([req.query.key, req.query.value], function(err, output){
            console.log('write func (newKey1):', output, err);
            res.json(output);
    });
});

app.get('/read', function (req, res) {
    console.log("in read - req:", req.query.key);
    chaincode.query.read([req.query.key], function(err, output){
            console.log('read func (newKey):', output, err);
            res.json(output);
    });
});

//Rest -- end

