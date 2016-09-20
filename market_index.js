/**
 * Augur market monitor
 * @author Jack Peterson (jack@tinybike.net), Keivn Day (@k_day)
 */

"use strict";

var async = require("async");
var elasticsearch = require('elasticsearch');

var noop = function () {};

module.exports = {

    debug: false,

    augur: require("augur.js"),

    watcher: null,

    elastic: null,

    idRegex: /^(0x)(0*)(.*)/,

    market_index: null,

    market_index_version: 1,


    connect: function (config, callback) {
        var self = this;
        callback = callback || noop;

        self.market_index = "markets";

        var elastic_host = process.env.ELASTIC_HOST || 'localhost';
        var elastic_port = process.env.ELASTIC_PORT || '9200';
        var elastic_endpoint = 'http://' + elastic_host + ':' + elastic_port;

        self.augur.connect(config, () => {
            self.augur.rpc.debug.abi = true;
            self.augur.rpc.retryDroppedTxs = true;
            self.augur.rpc.POST_TIMEOUT = 120000;
            //self.augur.rpc.debug.broadcast = true;
            self.elastic = new elasticsearch.Client({host: elastic_endpoint, maxRetries: 5});
            //self.initScripts();
            self.initMarketIndex(callback);
        });
    },
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
    indexExists: function(index_name) { 
        var self = this;
        return self.elastic.indices.exists({
            index: index_name
        });
    },

    initMarketIndex: function (callback){
        var self = this;

        self.indexExists(self.market_index).then(function (exists) {
            if (exists) return callback(null);
            self.elastic.indices.create({index: self.market_index}, function (error, response) {
                if (error) return callback(error);
                if (self.debug) console.log("index created", response);
                self.elastic.indices.putMapping({
                    index: self.market_index,
                    type: "marketInfo",
                    body: {
                        properties: {
                            makerFee: { type: "float" },
                            takerFee: { type: "float" },
                            tradingFee: { type: "float" },
                            creationTime: {type: "long" },
                            endDate: {type: "long" },
                            branchId: { type: "string" },
                            description: { type: "string" },
                            extraInfo: { type: "string" },
                            tags: {type: "string"},
                            tags_full: {type: "string", index: "not_analyzed"},
                            volume: { type: "float" },
                            active: { type: "boolean" }
                        }
                    }
                }, function (error, response){
                    if (error) return callback(error);
                    if (self.debug) console.log("mapping created:", response);
                    return callback(null);
                });
            });
        });
    },

    //some ids returned from filters with leading 0s. This removes them
    //e.g, 0x0a12345 => 0x12345
    normalizeId: function (id){
        var self = this;

        if (!id) return null;
        var m;
        if ((m = self.idRegex.exec(id)) !== null) {
            return (m[1]+m[3]);
        }
        return null;
    },

    disconnect: function (callback) {
        var self = this;
        callback = callback || function (e, r) { console.log(e, r); };
        self.elastic = null;
        return callback(null);
    },

    marketSearch: function(options, callback){
        var self = this;

        if (!options.branchId) return callback("branch required.");
        if (!options.query) return callback("queryrequired.");

        var query_body = {
            index: self.market_index,
            type: "marketInfo",
            body: {
                query: {
                    filtered: {
                        query:{
                            bool: {
                                should: [
                                { match_phrase: {
                                    description: {
                                      query: options.query,
                                      boost: 10,
                                      fuzziness : 0
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
                                    tag:  {
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
                                }}]
                            }
                        },
                        filter: [ { term: { branchId: options.branchId } } ]
                    }
                }
            }
        };
        options.query_body = query_body;
        self.queryHelper(options, callback);
    },

    loadMarkets: function(options, callback){
        var self = this;

        if (!options.branchId) return callback("branch required.");

        var query_body = {
            index: self.market_index,
            type: "marketInfo",
            body: {
                query: {
                    filtered: {
                        filter: [
                            { term: { branchId: options.branchId } }
                        ]
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
        self.queryHelper(options, callback);
    },

    getTags: function(options, callback){
        var self = this;

        //if (!options.branchId) return callback("branch required.");
        var num_tags = options.limit || 100;
        options.limit = 0;

        var query_body = {
            index: self.market_index,
            type: "marketInfo",
            body: {
                query: {
                    filtered: {
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
        self.queryHelper(options, callback);
    },

    queryHelper: function(options, callback){
        var self = this;

        var page = options.page || 1;
        var limit = options.limit || 10;

        //still do want to allow 0 search results, in the case of a pure aggregration query.
        if (options.limit == 0) limit = 0;

        options.query_body.from = (page - 1) * limit;
        options.query_body.size = limit;

        //add active filter if specified.
        if (options.active != undefined && options.active != null){
            options.query_body.body.query.filtered.filter.push({ term: { active: options.active } });
        }

        if (options.tag){
            options.query_body.body.query.filtered.filter.push({ term: { tags_full: options.tag } });
        }

        self.elastic.search(options.query_body, function (error, response, status) {
            if (error){
                return callback(error);
            }
            return callback(null, response);
        });
    },

    indexMarket: function(id, info, callback){
        var self = this;

        id = self.normalizeId(id);
        if (!id) return callback("indexMarket: id not found");
        if (!info) return callback("indexMarket: market data not found");
        if (!info.branchId) return callback("indexMarket: branchId not found in market data");
        if (!self.elastic) return callback("indexMarket: elasticSearch not ready");

        self.elastic.index({
            index: self.market_index,
            id: id,
            type: "marketInfo",
            body: {
                makerFee: parseFloat(info.makerFee),
                takerFee: parseFloat(info.takerFee),
                tradingFee: parseFloat(info.tradingFee),
                endDate: info.endDate,
                creationTime: info.creationTime,
                branchId: info.branchId,
                tags: info.tags,
                tags_full: info.tags,
                description: info.description,
                extraInfo: info.extraInfo,
                volume: parseFloat(info.volume),
                active: !(info.winningOutcomes.length),
            }
        }, function (err, response, status) {
            if (err) return callback(err);
            if (self.debug) console.log(response, status);
            return callback(null);
        });
    },

    scan: function (config, callback) {
        var self = this;
        var numMarkets = 0;
        
        function indexMarkets(data, callback) {
            
            self.augur.batchGetMarketInfo(data.ids, (markets) => {
                if (!markets) return callback("error fetching markets");
                async.each(Object.keys(markets), function (id, nextMarket) {
                    var marketInfo = markets[id];
                    if (!marketInfo) nextMarket("error loading marketInfo");
                    self.indexMarket(id, marketInfo, (err) => {                     
                        if (err) return callback(err);
                        return nextMarket(null);
                    });
                }, function (err) {
                    if (data.status) console.log(data.status);
                    if (err) return callback(err);
                    return callback(null);
                });
            });
            
        }

        //careful about setting # workers too high. Geth will choke
        var marketQueue = async.queue(indexMarkets, 10);

        // called when all items in queue have been processed
        marketQueue.drain = function() {
            console.log('Done loading Markets');

            return callback(null, numMarkets);   
        }

        config = config || {};
        callback = callback || noop;

        if (self.elastic) {

            config.limit = config.limit || Number.MAX_VALUE;
            var branches = self.augur.getBranches();
            console.log("Loading Market Data and Price History");
            for (var i = 0; i < branches.length; i++) {
                if (numMarkets >= config.limit) continue;
                var branch = branches[i];

                //get a list of marketIds
                var marketIds = [];
                var step = 2000;
                var marketsInBranch = self.augur.getNumMarketsBranch(branch);
                for (var i = 0; i < marketsInBranch; i += step){
                    var end = Math.min(i+step, marketsInBranch);
                    marketIds = marketIds.concat(self.augur.getSomeMarketsInBranch(branch, i, end));
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
                    marketQueue.push({ids: markets, status: status}, function(err) {
                        if (err) return callback(err);
                    });
                    numMarkets += Math.min(batchSize, remaining);
                }
            }
        } else {
            this.connect(config, (err) => {
                if (err) return callback(err);
                self.scan(config, callback);
            });
        }
    },

    watch: function (config, callback) {
        var self = this;
        config = config || {};

        function marketCreated(filtrate) {
            if (!filtrate) return;
            if (!filtrate.marketID) return;
            var id = filtrate.marketID;
            if (self.debug) console.log("marketCreated filter:", id);
            self.augur.getMarketInfo(id, (marketInfo) => {
                if (self.debug) console.log("marketCreated filter info:", id, marketInfo);
                self.indexMarket(id, marketInfo);
            });
        }

        function priceChanged(filtrate) {
            if (!filtrate) return;
            if (self.debug) console.log("priceChanged filter:", filtrate);
            if (!filtrate['market']) return;

            var id = filtrate['market'];
            self.augur.getMarketInfo(id, (marketInfo) => {
                if (self.debug) console.log("priceChanged market info:", marketInfo);
                self.indexMarket(id, marketInfo);
            });
        }

        function feeChanged(filtrate) {
            if (self.debug) console.log("feeChanged filter:", filtrate);
            if (!filtrate) return;
            if (!filtrate['marketID']) return;
            var id = filtrate['marketID'];

            self.augur.getMarketInfo(id, (marketInfo) => {
                if (self.debug) console.log("feeChanged market info:", marketInfo);
                self.indexMarket(id, marketInfo);
            });
        }

        function txChange(filtrate) {
            if (self.debug) console.log("tx change:", filtrate);
            if (!filtrate) return;
            if (!filtrate['market']) return;
            var id = filtrate['market'];

            self.augur.getMarketInfo(id, (marketInfo) => {
                if (self.debug) console.log("tx change market info:", marketInfo);
                self.indexMarket(id, marketInfo);
            });
        }

        function doneSyncing(){

            function scanHelper(){
                if (!config.scan) {
                    if (callback) callback(null, 0);
                }else{
                    self.scan(config, (err, updates, markets) => {
                        if (callback) {
                            if (err) return callback(err);
                            callback(null, updates);
                        }
                    });
                }
            }

            //if we are filtering, delay watch callback/scan until filters are set up
            if (config.filtering) {
                self.augur.filters.listen({
                    marketCreated: marketCreated,
                    log_fill_tx: priceChanged,
                    tradingFeeUpdated: feeChanged,
                    log_add_tx: txChange,
                    log_cancel: txChange,
                }, function (filters) {
                    if (self.debug) console.log(filters);
                    scanHelper();
                });
            }else{
                scanHelper();
            }
        }

        this.connect(config, (err) => {
            if (err) {
                if (callback) callback(err);
            } else {
                if (self.debug) console.log("Connected");
                //Wait until syncing completes to scan/setup filters.
                function syncWait() {
                    self.augur.rpc.eth("syncing", {}, function (syncing) {
                        if (syncing.error){
                            console.log("RPC error:", syncing.error);
                            setTimeout(syncWait, 30000);
                            return;
                        }
                        self.augur.rpc.net("peerCount", {}, (peers) => {
                            if (peers.error){
                                console.log("RPC error:", peers.error);
                                setTimeout(syncWait, 30000);
                                return;
                            }
                            if (self.debug) console.log("syncWait:", syncing, peers);
                            if (!peers){
                                console.log("Waiting for peers");
                                setTimeout(syncWait, 30000);
                                return;
                            }
                            if (syncing == false){
                                doneSyncing();
                            }else{
                                console.log('Blockchain still syncing:', (parseInt(syncing['currentBlock'])/parseInt(syncing['highestBlock'])*100).toFixed(1) + "% complete");
                                setTimeout(syncWait, 30000);
                            }
                        });
                    });
                }
                syncWait();
            }
        });
    },

    unwatch: function (callback) {
        var self = this;

        callback = callback || noop;

        if (self.watcher) {
            clearTimeout(this.watcher);
            self.watcher = null;
        }
        self.augur.filters.ignore(true, callback);
    }

};