var index = require("../market_index");
var dbname = "augur_cache_db";

var config = {
    http: "http://localhost:8545",
    //ws: "ws://127.0.0.1:8546",
    ws: null,
    //ipc: process.env.GETH_IPC || join(DATADIR, "geth.ipc"),
    limit: null,
    filtering: true,
    scan: false,
}
var start = new Date().getTime();


var elasticsearch = require('elasticsearch');
var elastic = new elasticsearch.Client({host: 'localhost:9200'});

//elastic.indices.delete({ index: "market" }, function (error, response){console.log(error, response);});

/*
elastic.ping({
    requestTimeout: 5000
}, function (error, response) {
	console.log(error, response, status, d);
  if (error) {
    console.error('elasticsearch cluster is down!');
    return false;
  } else {
  	//console.log("hi")
    return true;
  }
});
*/


var options = {
     http: "http://localhost:8545",
     ws: null
};

var augur = require("augur.js");

augur.connect(options);

//console.log(augur.rpc.eth("syncing"));

//augur.rpc.eth("syncing", (result) =>{
//	console.log(result);
//});

augur.rpc.eth("syncing", (syncing) => {
    console.log(syncing);
    augur.rpc.net("peerCount", (peers) => {
    	console.log(peers)
    });
});

/*
index.watch(config, (err, numUpdates) => {
	console.log(numUpdates + " markets have been updated!");
	if (err) console.log(err);
});
*/

var info = { network: '2',
  makerFee: '0.01',
  takerFee: '0.02',
  tradingFee: '0.02',
  numOutcomes: 7,
  tradingPeriod: 8563,
  branchId: '0xf69b5',
  numEvents: 1,
  cumulativeScale: '1',
  creationTime: 1472401286,
  volume: '0',
  creationFee: '9',
  author: '0x7c0d52faab596c08f484e3478aebc6205f3f5d8c',
  tags: [ 'pieces', 'Tyra', 'Alaska' ],
  winningOutcomes: [],
  outcomes: 
   [ { id: 1,
       outstandingShares: '0',
       price: '0',
       sharesPurchased: '0' },
     { id: 2,
       outstandingShares: '0',
       price: '0',
       sharesPurchased: '0' },
     { id: 3,
       outstandingShares: '0',
       price: '0',
       sharesPurchased: '0' },
     { id: 4,
       outstandingShares: '0',
       price: '0',
       sharesPurchased: '0' },
     { id: 5,
       outstandingShares: '0',
       price: '0',
       sharesPurchased: '0' },
     { id: 6,
       outstandingShares: '0',
       price: '0',
       sharesPurchased: '0' },
     { id: 7,
       outstandingShares: '0',
       price: '0',
       sharesPurchased: '0' } ],
  type: 'categorical',
  endDate: 1479800271,
  events: 
   [ { id: '0x85411669dc7bf648dd834a313d6e5ef68a216e71a3f4aba2e44b6aae30625f31',
       endDate: 1479800271,
       outcome: undefined,
       minValue: '1',
       maxValue: '2',
       numOutcomes: 7,
       isEthical: undefined,
       type: 'categorical' } ],
  description: 'Which Tyra computer race Daryl Mission hatches?~|>whisper|caw|broil|pull|purr|cheep|whip',
  resolution: 'http://race.journeys.com',
  extraInfo: 'Daryl Mission is a radical update.  Motorbike Alaska race and sailor!' };

var elasticsearch = require('elasticsearch');

var elastic = new elasticsearch.Client({host: 'localhost:9200'});

var market_index = "markets";

function indexExists() {  
    return elastic.indices.exists({
        index: market_index
    });
}



//elastic.indices.delete({ index: market_index }, function (error, response){console.log(error, response);});
/*
indexExists().then(function (exists) {
	console.log(exists);
	if (!exists){
		elastic.indices.create({index: market_index}, function (error, response) {
			console.log("index created", error, response);
			elastic.indices.putMapping({
	            index: market_index,
	            type: "marketInfo",
	            body: {
	                properties: {
	                    makerFee: { type: "float" },
	                    takerFee: { type: "float" },
	                    tradingFee: { type: "float" },
	                    branchId: { type: "string" },
	                    description: { type: "string" },
	                    extraInfo: { type: "string" },
	                    tags: { type: "string" },
	                    volume: { type: "long" },
	                }
	            }
	        }, function (error, response){
	        	console.log("mapping created:", error, response);
	        });
		});
	}	
});

var marketId = "0x10e053ea82035a4e262f1354e76dfe62b582f7d732825a059ab20881c02ced89";
*/
/*
elastic.index({
	index: market_index,
	id: marketId,
	type: "marketInfo",
	body: {
		makerFee: parseFloat(info.makerFee),
	    takerFee: parseFloat(info.takerFee),
	    tradingFee: parseFloat(info.tradingFee),
	    branchId: info.branchId,
	    description: info.description,
	    extraInfo: info.extraInfo,
	    tags: info.tags,
	    volume: parseInt(info.volume),
	}
}, function (err, response, status) {
	console.log(err, response, status);
});
*/



var query = "win";

/*
elastic.search({
	index: "markets",
	type: "marketInfo",
	explain: true,
	size: 2,
	from: 2,
	body: {
		query: {
			multi_match: {
				fields: [ "description", "extraInfo", "tags" ],
				query: query,
				fuzziness : 2
			}
		}
	}
},function (error, response,status) {
    if (error){
      console.log("search error: "+error)
    }
    else {
      console.log("--- Response ---");
      console.log(response);
      console.log("--- Hits ---");
      response.hits.hits.forEach(function(hit){
        console.log(hit);
      })
    }
});
*/

/*

var pageNum = 1;
var perPage = 5;

//initial market filter
elastic.search({
	index: "markets",
	type: "marketInfo",
	explain: true,
	from: (pageNum - 1) * perPage,
	size: perPage,
	query: {
		filter: {
			term: { active: false}
		}
	}
},function (error, response,status) {
    if (error){
      console.log("search error: "+error)
    }
    else {
      console.log("--- Response ---");
      console.log(response);
      console.log("--- Hits ---");
      response.hits.hits.forEach(function(hit){
        console.log(hit);
      })
    }
});
*/

/*
elastic.getScript({lang: "groovy", id: "test_script"}, function (error, response, status){
	console.log(error, response, status)
});
*/

/*
elastic.deleteScript({
	lang: "groovy",
	id: "test_script",
}, function (error, response, status){
	elastic.putScript({
		opType: "create",
		id: "test_script",
		lang: "groovy",
		body: {
			script: "_score + 40"
		}
	});
});
*/


/*
elastic.deleteScript({
	lang: "groovy",
	id: "test_script",
});
elastic.putScript({
		opType: "create",
		id: "test_script",
		lang: "groovy",
		body: {
			script: "_score + 50"
		}
	});

elastic.getScript({lang: "groovy", id: "test_script"}, function (error, response, status){
	console.log(error, response, status)
});

*/

/*
elastic.putScript({
	opType: "create",
	id: "test_script",
	lang: "groovy",
	body: {
		script: "_score + 20"
	}
}, function (error, response, status){
	console.log(error, response, status)
});
*/
/*
elastic.deleteScript({
	lang: "groovy",
	id: "test_script",
}, function (error, response, status){
	console.log(error, response, status)
});
*/
/*
elastic.putScript({
	id: "test_script",
}, function (error, response, status){
	console.log(error, response, status)
});
*/
//elasticS
//console.log(indexExists());
//console.log(elastic.indices.exists({index: market_index}));