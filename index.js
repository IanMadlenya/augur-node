var http = require("http");
var getopt = require("posix-getopt");
var chalk = require("chalk");
var express = require('express');
var join = require("path").join;
var index = require("./market_index");

var geth_host = process.env.GETH_HOST || "localhost";

var config = {
    http: 'http://' + geth_host + ':8545',
    ws: 'ws://' + geth_host + ':8546',
    //ipc: process.env.GETH_IPC || join(DATADIR, "geth.ipc"),
    limit: null,
    filtering: true,
    scan: true,
}

var app = express();

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

function log(str) {
     console.log(chalk.cyan.dim("[augur]"), str);
}

function timestamp(s) {
    return chalk.cyan.dim((new Date()).toString() + ": ") + s;
}

function isPositiveInt(str) {
    var n = ~~Number(str);
    return String(n) === str && n >= 0;
}

function toBool(str){
    return str == "true";
}

app.get('/getMarketsInfo', function (req, res) {

    var options = {};
    options.branchId = req.query['branchId'] || index.augur.constants.DEFAULT_BRANCH_ID;
    options.active = req.query['active'];
    options.page = req.query['page'];
    options.limit = req.query['limit'];
    options.query = req.query['query'];
    options.sort = req.query['sort'];

    if (options.active) options.active = toBool(options.active);

    //convert branch id to hex if int as passed in
    if (isPositiveInt(options['branchId'])){
        options['branchId'] = "0x" + parseInt(options['branchId']).toString(16);
    }

    //if query passed in, it's a search. Otherwise it's a filter
    if (options.query){
        index.marketSearch(options, (err, response) => {
            if (err){
               return res.status(500).send({ error: err });
            }
            return res.send(response);   
        });
    }else{
        index.loadMarkets(options, (err, response) => {
            if (err){
               return res.status(500).send({ error: err });
            }
            return res.send(response);   
        });
    }

});

process.on("uncaughtException", function (e) {
    log(timestamp(chalk.red("Uncaught exception\n")));
    try {
        log(e.toString());
        log(e.stack.toString());
    } catch (exc) {
        console.log(exc);
    }
    log('\n');
    process.exit(1);
});

process.on("exit", function (code) {
     index.unwatch( () => {
        index.disconnect( () => {
            log(timestamp(chalk.red("Augur node shut down (" + code.toString() + ")\n")));
        });
    });
});

process.on("SIGINT", function () {
    index.unwatch( () => {
        index.disconnect( () => {
            log(timestamp(chalk.red("Augur node shut down (SIGINT)\n")));
            process.exit(2);
        })
    })    
});

function runserver(protocol, port) {
    app.listen(port, function() {
        log("Listening on port " + port);
    });
}

(function init(args) {
    var opt, port, protocol, parser;
    parser = new getopt.BasicParser("n(noscan)s(ssl)p:(port)d:(datadir)", args);
    while ( (opt = parser.getopt()) !== undefined) {
        switch (opt.option) {
            case 's':
                protocol = "https";
                break;
            case 'p':
                port = opt.optarg;
                break;
            case 'n':
                config.scan = null;
                break;
        }
    }
    runserver(protocol || "http", port || process.env.PORT || 8547);
    //to be safe, rescan on every restart. Markets might have updated
    //when node was down.
    index.watch(config, function (err, numUpdates) {
        if (err) throw err;
        log(numUpdates + " markets have been updated!");
    });

})(process.argv);
