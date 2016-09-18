var http = require('http');
var url = require('url');
var express = require('express');
var redis = require('redis');
var getenv = require('getenv');

//var client = redis.createClient('6379', '127.0.0.1').setMaxListeners(0);
var client = redis.createClient('6379', '10.92.2.4').setMaxListeners(0);
var app = express();
app.set('port',3000);



client.on('connect', function() {
	console.log('Connected to redis!');
})

var cluster = require('cluster'),
	restartWorkers = function restartWorkers() {
		var wid, workerIds = [];

		for(wid in cluster.workers)
			workerIds.push(wid);

		workerIds.forEach(function(wid){
			cluster.workers[wid].send({
				text: 'shutdown',
				from: 'master'
			});

			setTimeout(function() {
				if(cluster.workers[wid])
					cluster.workers[wid].kill('SIGKILL');
			}, 5000);
		});
	};

if(cluster.isMaster) {
//	var numWorkers = require('os').cpus().length,
	var numWorkers = 2,
		fs = require('fs'), 
		i, worker;

	console.log('Master cluster setting up ' + numWorkers + ' workers...');
	
	for(var i = 0; i < numWorkers; i++) {
		worker = cluster.fork();
		worker.on('message', function() {
			console.log('arguments', arguments);
		});
	}
	
	fs.readdir('.', function(err, files) {
		files.forEach(function(file) {
			fs.watch(file, function() {
				restartWorkers();
			});	
		});
	});

	cluster.on('exit', function(_worker, code, signal) {
		console.log('Worker ' + worker.process.pid + 'died with code: ' + code + ', and signal: ' + signal);
		console.log('Starting a new worker');
		worker = cluster.fork();
		worker.on('message', function() {
			console.log('arguments', arguments);
		});
	});

} else {
	process.on('message', function(message) {
		if(message.type == 'shutdown') {
			process.exit(0);
		}
	});
	
	app.get('/*', function(req, res) {
		var key = url.parse(req.url).pathname;
		client.on('connect', function() {
			console.log('connected to redis!');
		});
		client.get(key, function(err, reply) {
			if(reply == null) {
				client.set(key, 1);
				client.expire(key, 300);
				res.send('updated using deployment, count: 1');
			}
			else {
				client.incr(key, function(err, reply) {
					res.send('updated using deployment, count: ' + reply);
				});
			}
		});
	});
	
	http.createServer(app).listen(app.get('port'), function() {
		console.log('listening');
	});
}
