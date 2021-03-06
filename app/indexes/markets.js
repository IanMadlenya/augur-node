/**
 * Augur market monitor
 * @author Keivn Day (@k_day)
 */

var async = require("async");
var bodybuilder = require("bodybuilder");

module.exports = {

    //increment int here to create new index version
    index_name: "markets_info_v1",
    type: "info",
    NUM_RPC_WORKERS: 10,
    DEFAULT_TAG_LIMIT: 100,
    DEFAULT_SEARCH_LIMIT: 10,
    DEFAULT_SEARCH_PAGE: 1,

    elastic: null,

    properties: {
        makerFee: {type: "float"},
        takerFee: {type: "float"},
        tradingFee: {type: "float"},
        tradingPeriod: {type: "integer"},
        creationTime: {type: "long"},
        endDate: {type: "long"},
        branchID: {type: "text"},
        description: {type: "text"},
        extraInfo: {type: "text"},
        tags: {type: "text"},
        tags_full: {type: "keyword"},
        volume: {type: "float"},
        active: {type: "boolean"},
    },

    deleteIndex: function () {
        var self = this;
        return self.elastic.indices.delete({
            index: self.index_name
        });
    },

    initIndex: function () {
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

    indexExists: function () {
        var self = this;
        return self.elastic.indices.exists({
            index: self.index_name
        });
    },

    init: function (elastic) {
        var self = this;

        self.elastic = elastic;

        return self.indexExists()
            .then((exists) => {
                if (!exists) {
                    return self.initIndex();
                }
            }).catch((err) => {
                console.log("error initializing index:", err);
            });
    },

    indexMarket: function (id, info) {
        var self = this;

        return new Promise(function (resolve, reject) {
            if (!id) reject("indexMarket: id not found");
            if (!info) reject("indexMarket: market data not found");
            if (!info.branchID) reject("indexMarket: branchID not found in market data");
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
                    branchID: info.branchID,
                    description: info.description,
                    extraInfo: info.extraInfo,
                    tags: info.tags,
                    tags_full: info.tags,
                    volume: parseFloat(info.volume),
                    active: !(info.consensus)
                }
            }).then(() => {
                resolve();
            }).catch((err) => {
                console.log(err);
                reject("index error", error);
            });
        });
    },

    getMarket: function (id) {
        var self = this;

        return new Promise(function (resolve, reject) {
            if (!id) reject("indexMarket: id not found");
            if (!self.elastic) reject("indexMarket: elasticSearch not ready");

            self.elastic.get({
                index: self.index_name,
                type: self.type,
                id: id,
            }).then((result) => {
                if (result._source) {
                    resolve(result._source)
                } else {
                    reject("getMarket error: _source missing");
                }
            }).catch((err) => {
                console.log(err);
                reject("get error", error);
            });
        });

    },

    scan: function (augur, config) {
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

        return new Promise(function (resolve, reject) {
            var numMarkets = 0;

            //careful about setting # workers too high. Geth will choke
            var marketQueue = async.queue(indexMarkets, self.NUM_RPC_WORKERS);

            // called when all items in queue have been processed
            marketQueue.drain = function () {
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
                for (var i = 0; i < marketsInBranch; i += step) {
                    var end = Math.min(i + step, marketsInBranch);
                    marketIds = marketIds.concat(augur.getSomeMarketsInBranch(branch, i, end));
                }
                var batchSize = 5;
                for (var j = 0; j < marketIds.length; j += batchSize) {
                    if (numMarkets >= config.limit) break;
                    var remaining = config.limit - numMarkets;
                    var markets = marketIds.slice(j, j + Math.min(batchSize, remaining));
                    //print some occasional status info
                    var status = null;
                    if (j == 0) {
                        status = "Loading " + Math.min(remaining, marketIds.length) + " markets from branch " + branch;
                    } else if (j % (batchSize * 5) == 0) {
                        status = (j / Math.min(remaining + numMarkets, marketIds.length) * 100).toFixed(2) + " % complete";
                    }
                    marketQueue.push({augur: augur, ids: markets, status: status}, function (err) {
                        if (err) reject(err);
                    });
                    numMarkets += Math.min(batchSize, remaining);
                }
            }
        });
    },

    queryHelper: function (options, body) {
        var self = this;

        return new Promise(function (resolve, reject) {

            var query = {
                index: self.index_name,
                type: self.type,
            };

            var page = options.page || self.DEFAULT_SEARCH_PAGE;
            var limit = options.limit || self.DEFAULT_SEARCH_LIMIT;

            //still do want to allow 0 search results, in the case of a pure aggregration query.
            if (options.limit == 0) limit = 0;
            body.from((page - 1) * limit);
            body.size(limit);

            //add active, tag, branch filters if specified.
            if (options.active != undefined && options.active != null) {
                body.filter("term", "active", options.active);
            }
            if (options.tag) {
                body.filter("term", "tags_full", options.tag);
            }
            if (options.branchID) {
                body.filter('term', 'branchID', options.branchID);
            }

            query.body = body.build();
            self.elastic.search(query)
                .then(function (response) {
                    resolve(response);
                }, function (error) {
                    reject(error);
                });
        });
    },

    filterMarkets: function (options) {
        var self = this;

        return new Promise(function (resolve, reject) {
            if (!self.elastic) reject("market index not initialized");

            var body = bodybuilder();
            switch (options.sort) {
                case "newest_market":
                    body.sort([{creationTime: "desc"}, {volume: "desc"}]);
                    break;
                case "oldest_market":
                    body.sort([{creationTime: "asc"}, {volume: "desc"}]);
                    break;
                case "most_volume":
                    body.sort("volume", "desc");
                    break;
                case "least_volume":
                    body.sort("volume", "asc");
                    break;
                case "soonest_expiry":
                    body.sort([{endDate: "asc"}, {volume: "desc"}]);
                    break;
                case "furthest_expiry":
                    body.sort([{endDate: "desc"}, {volume: "desc"}]);
                    break;
                case "lowest_maker_fee":
                    body.sort([{makerFee: "asc"}, {volume: "desc"}]);
                    break;
                case "lowest_taker_fee":
                    body.sort([{takerFee: "asc"}, {volume: "desc"}]);
                    break;
                case "highest_maker_fee":
                    body.sort([{makerFee: "desc"}, {volume: "desc"}]);
                    break;
                case "highest_taker_fee":
                    body.sort([{takerFee: "desc"}, {volume: "desc"}]);
                    break;
                default:
                    body.sort("volume", "desc");
            }

            self.queryHelper(options, body)
                .then((response) => {
                    resolve(response);
                }).catch((error) => {
                reject(error);
            });
        });
    },

    searchMarkets: function (options) {
        var self = this;

        return new Promise(function (resolve, reject) {
            if (!options.query) return reject("queryrequired.");
            if (!self.elastic) return reject("market index not initialized");

            var body = bodybuilder();

            body.orQuery('match_phrase', 'description', {'query': options.query, 'boost': 10})
                .orQuery('match', 'description', {'query': options.query, 'boost': 3, fuzziness: 2})
                .orQuery('match', 'tags', {'query': options.query, 'boost': 2, fuzziness: 2})
                .orQuery('match', 'extraInfo', {'query': options.query, 'boost': 1, fuzziness: 2})

            self.queryHelper(options, body)
                .then((response) => {
                    resolve(response);
                }).catch((error) => {
                reject(error);
            });
        });
    },

    getTags: function (options, callback) {
        var self = this;

        return new Promise(function (resolve, reject) {
            if (!options.branchID) reject("branch required.");
            var num_tags = options.limit || self.DEFAULT_TAG_LIMIT;
            options.limit = 0;

            var body = bodybuilder();
            //agg type, agg field, agg name, options
            body.aggregation('terms', 'tags_full', 'tag_agg', {'size': num_tags});

            self.queryHelper(options, body)
                .then((response) => {
                    resolve(response);
                }).catch((error) => {
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