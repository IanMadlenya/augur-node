/**
 * Augur market monitor
 * @author Keivn Day (@k_day)
 */

var async = require("async");

module.exports = {

	//increement int here to create new index version
	index_name: "markets_info_v1",
	type: "info",

	elastic: null,

	properties: {
        makerFee:        { type: "float" },
        takerFee:        { type: "float" },
        tradingFee:      { type: "float" },
        tradingPeriod:   { type: "integer" },
        creationTime:    { type: "long" },
        endDate:         { type: "long" },
        branchId:        { type: "text" },
        description:     { type: "text" },
        extraInfo:       { type: "text" },
        tags:            { type: "text" },
        tags_full:       { type: "text", fielddata: true},
        volume:          { type: "float" },
        active:          { type: "boolean" },
	},

	deleteIndex: function() { 
        var self = this;
	    return self.elastic.indices.delete({
	        index: self.index_name
	    });
	},

	initIndex: function() {  
        var self = this;
        var payload = {
            index: self.index_name,
            body: {
                mappings: {}
            }
        };
        payload["body"]["mappings"][self.type] = {"properties": self.properties};

        return self.elastic.indices.create(payload);
	},

	indexExists: function() {
        var self = this;
	    return self.elastic.indices.exists({
	        index: self.index_name
	    });
	},

    init: function (elastic){
        var self = this;

    	self.elastic = elastic;

        return self.indexExists()
        .then( (exists) =>{
            if (!exists) {
                return self.initIndex();
            }
        }).catch((err) => {
            console.log("error initializing index:", err);
        });
    },

    indexMarket: function(id, info){
        var self = this;

        return new Promise(function(resolve, reject) {
            if (!id) reject("indexMarket: id not found");
            if (!info) reject("indexMarket: market data not found");
            if (!info.branchId) reject("indexMarket: branchId not found in market data");
            if (!self.elastic) reject("indexMarket: elasticSearch not ready");

            self.elastic.index({
                index: self.index_name,
                type: self.type,
                id: id,
                body: {
                    makerFee: parseFloat(info.makerFee),
                    takerFee: parseFloat(info.takerFee),
                    tradingFee: parseFloat(info.tradingFee),
                    tradingPeriod: info.tradingPeriod,
                    creationTime: info.creationTime,
                    endDate: info.endDate,
                    branchId: info.branchId,
                    description: info.description,
                    extraInfo: info.extraInfo,
                    tags: info.tags,
                    tags_full: info.tags,
                    volume: parseFloat(info.volume),
                    active: !(info.reportedOutcome)
                }            
            }).then( () => {
                resolve();
            }).catch((err) => {
                console.log(err);
                reject("index error", error);
            });
        });
    },

    getMarket: function (id){
        var self = this;

        return new Promise(function(resolve, reject) {
            if (!id) reject("indexMarket: id not found");
            if (!self.elastic) reject("indexMarket: elasticSearch not ready");

            self.elastic.get({
                index: self.index_name,
                type: self.type,
                id: id,         
            }).then( (result) => {
                if (result._source){
                    resolve(result._source)
                }else{
                    reject("getMarket error: _source missing");
                }
            }).catch((err) => {
                console.log(err);
                reject("get error", error);
            });
        });

    },

    scan: function(augur, config){
        var self = this;
        function indexMarkets(data, index_callback) {

            var augur = data.augur;
            augur.batchGetMarketInfo(data.ids, (markets) => {
                if (!markets) return index_callback("error fetching markets");
                async.each(Object.keys(markets), function (id, nextMarket) {
                    var marketInfo = markets[id];
                    if (!marketInfo) nextMarket("error loading marketInfo");
                    self.indexMarket(id, marketInfo)
                    .then(nextMarket)
                    .catch(function (error) {
                        index_callback(error);
                    });          
                }, function (err) {
                    if (data.status) console.log(data.status);
                    if (err) return index_callback(err);
                    return index_callback(null);
                });
            });
        }

        config = config || {};
        config.limit = config.limit || Number.MAX_VALUE;
        var branches = augur.getBranches();

        return new Promise(function(resolve, reject) {
            var numMarkets = 0;

            //careful about setting # workers too high. Geth will choke
            var marketQueue = async.queue(indexMarkets, 10);

            // called when all items in queue have been processed
            marketQueue.drain = function() {
                resolve(numMarkets);  
            }

            if (!self.elastic) reject("Market index not initialized");

            console.log("Loading Market Data and Price History");
            for (var i = 0; i < branches.length; i++) {
                if (numMarkets >= config.limit) continue;
                var branch = branches[i];

                //get a list of marketIds
                var step = 2000;
                var marketsInBranch = augur.getNumMarketsBranch(branch);
                var marketIds = [];
                for (var i = 0; i < marketsInBranch; i += step){
                    var end = Math.min(i+step, marketsInBranch);
                    marketIds = marketIds.concat(augur.getSomeMarketsInBranch(branch, i, end));
                }
                var batchSize = 5;
                for (var j = 0; j < marketIds.length; j += batchSize) {
                    if (numMarkets >= config.limit) break;
                    var remaining = config.limit - numMarkets;
                    var markets = marketIds.slice(j, j + Math.min(batchSize, remaining));
                    //print some occasional status info
                    var status = null;
                    if (j==0){
                        status = "Loading " + Math.min(remaining, marketIds.length) + " markets from branch " + branch;
                    }else if (j % (batchSize * 5) == 0){
                        status = (j / Math.min(remaining + numMarkets, marketIds.length) * 100).toFixed(2) + " % complete";
                    }
                    marketQueue.push({augur: augur, ids: markets, status: status}, function(err) {
                        if (err) reject(err);
                    });
                    numMarkets += Math.min(batchSize, remaining);
                }
            }
        });
    },

    queryHelper: function(options){
        var self = this;

        return new Promise(function(resolve, reject) {
            var page = options.page || 1;
            var limit = options.limit || 10;

            var query_body = {
                index: self.index_name,
                type: self.type,
                body: {
                    query: {
                        bool: {
                            filter: [ { term: { branchId: options.branchId } } ]
                        }
                    },
                },
            };

            //still do want to allow 0 search results, in the case of a pure aggregration query.
            if (options.limit == 0) limit = 0;

            options.query_body.from = (page - 1) * limit;
            options.query_body.size = limit;

            //add active filter if specified.
            if (options.active != undefined && options.active != null){
                options.query_body.body.query.bool.filter.push({ term: { active: options.active } });
            }

            if (options.tag){
                options.query_body.body.query.bool.filter.push({ term: { tags_full: options.tag } });
            }

            self.elastic.search(options.query_body)
            .then(function (response) {
                resolve(response);
            }, function (error) {
                reject(error);
            });
        });
    },

    filterMarkets: function(options){
        var self = this;

        return new Promise(function(resolve, reject) {
            if (!options.branchId) reject("branch required.");
            if (!self.elastic) reject("market index not initialized");

            var query_body = {
                index: self.index_name,
                type: self.type,
                body: {
                    query: {
                        bool: {
                            filter: [ { term: { branchId: options.branchId } } ]
                        }
                    },
                },
            };

            var sort;
            switch (options.sort){
                case "newest_market":
                    sort = [{ creationTime: "desc" }, { volume: "desc" }];
                    break;
                case "oldest_market":
                    sort = [{ creationTime: "asc" }, { volume: "desc" }];
                    break;
                case "most_volume":
                    sort = { volume: "desc" };
                    break;
                case "least_volume":
                    sort = { volume: "asc" };
                    break;
                case "soonest_expiry":
                    sort = [{ endDate: "asc" }, { volume: "desc" }];
                    break;
                case "furthest_expiry":
                    sort = [{ endDate: "desc" }, { volume: "desc" }];
                    break;
                case "lowest_maker_fee":
                    sort = [{ makerFee: "asc" }, { volume: "desc" }];
                    break;
                case "lowest_taker_fee":
                    sort = [{ takerFee: "asc" }, { volume: "desc" }];
                    break;
                case "highest_maker_fee":
                    sort = [{ makerFee: "desc" }, { volume: "desc" }];
                    break;
                case "highest_taker_fee":
                    sort = [{ takerFee: "desc" }, { volume: "desc" }];
                    break;
                default:
                    sort = { volume: "desc" };
            }
            query_body.body.sort = sort;
            options.query_body = query_body;
            self.queryHelper(options)
            .then((response) => {
                resolve(response);
            }).catch( (error) => {
                reject(error);
            });
        });
    },

    searchMarkets: function(options){
        var self = this;

        return new Promise(function(resolve, reject) {
            if (!options.branchId) return reject("branch required.");
            if (!options.query) return reject("queryrequired.");
            if (!self.elastic) return reject("market index not initialized");

            var query_body = {
                index: self.index_name,
                type: self.type,
                body: {
                    query: {
                        bool: {
                            should: [
                            { match_phrase: {
                                description: {
                                    query: options.query,
                                    boost: 10,
                                }
                            }},
                            { match: { 
                                description:  {
                                    query: options.query,
                                    boost: 3,
                                    fuzziness : 2
                                }
                            }},
                            { match: { 
                                tags:  {
                                    query: options.query,
                                    boost: 2,
                                    fuzziness : 2
                                }
                            }},
                            { match: { 
                                extraInfo:  {
                                    query: options.query,
                                    boost: 1,
                                    fuzziness : 2
                                }
                            }}],
                            filter: [ { term: { branchId: options.branchId } } ]
                        }
                    }
                }
            };

            options.query_body = query_body;
            self.queryHelper(options)
            .then((response) => {
                resolve(response);
            }).catch( (error) => {
                reject(error);
            });
        });
    },

    getTags: function(options, callback){
        var self = this;

        return new Promise(function(resolve, reject) {
            if (!options.branchId) reject("branch required.");
            var num_tags = options.limit || 100;
            options.limit = 0;

            var query_body = {
                index: self.index_name,
                type: self.type,
                body: {
                    query: {
                        bool: {
                            filter: [
                                { term: { branchId: options.branchId } }
                            ]
                        }
                    },
                    aggs: {
                        tag_agg : {
                            terms: {
                                size: num_tags,
                                field : "tags_full",
                            }
                        }
                    }
                }
            }

            options.query_body = query_body;
            self.queryHelper(options)
            .then((response) => {
                resolve(response);
            }).catch( (error) => {
                reject(error);
            });
        });
    },

};


/*
    initScripts: function(){
        var self = this;
        //delete and re-add script each time for easier tweaking.
        self.elastic.deleteScript({
            lang: "groovy",
            id: "volume_boost",
        }, function (error, response, status){
            self.elastic.putScript({
                id: "volume_boost",
                lang: "groovy",
                body: {
                    script: "_score + 20"
                }
            });
        });
    },
*/