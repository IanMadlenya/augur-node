/**
 * Augur market monitor
 * @author Keivn Day (@k_day)
 */

"use strict";

var async = require("async");
var elasticsearch = require('elasticsearch');

var noop = function () {};

module.exports = {
    market_index: require('./indexes/markets'),
    debug: false,
    augur: require("augur.js"),
    watcher: null,
    elastic: null,
    idRegex: /^(0x)(0*)(.*)/,

    connect: function (config, callback) {
        var self = this;
        callback = callback || noop;

        var elastic_host = process.env.ELASTIC_HOST || 'localhost';
        var elastic_port = process.env.ELASTIC_PORT || '9200';
        var elastic_endpoint = 'http://' + elastic_host + ':' + elastic_port;

        self.augur.connect(config, () => {
            self.augur.rpc.debug.abi = true;
            self.augur.rpc.retryDroppedTxs = true;
            self.augur.rpc.POST_TIMEOUT = 120000;
            self.elastic = new elasticsearch.Client({host: elastic_endpoint, maxRetries: 5});
            self.market_index.init(self.elastic).then(function(){
                callback();
            });
        });
    },

    disconnect: function (callback) {
        var self = this;
        callback = callback || function (e, r) { console.log(e, r); };
        self.elastic = null;
        return callback(null);
    },

    scan: function (config, callback) {
        var self = this;
        callback = callback || noop;

        if (self.elastic) {
            self.market_index.scan(self.augur, config)
            .then(function (numMarkets){
                return callback(null, numMarkets);
            })
            .catch(function (e){
                return callback(e);
            })
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
                self.market_index.indexMarket(id, marketInfo);
            });
        }

        function priceChanged(filtrate) {
            if (!filtrate) return;
            if (self.debug) console.log("priceChanged filter:", filtrate);
            if (!filtrate['market']) return;

            var id = filtrate['market'];
            self.augur.getMarketInfo(id, (marketInfo) => {
                if (self.debug) console.log("priceChanged market info:", marketInfo);
                self.market_index.indexMarket(id, marketInfo);
            });
        }

        function feeChanged(filtrate) {
            if (self.debug) console.log("feeChanged filter:", filtrate);
            if (!filtrate) return;
            if (!filtrate['marketID']) return;
            var id = filtrate['marketID'];

            self.augur.getMarketInfo(id, (marketInfo) => {
                if (self.debug) console.log("feeChanged market info:", marketInfo);
                self.market_index.indexMarket(id, marketInfo);
            });
        }

        function txChange(filtrate) {
            if (self.debug) console.log("tx change:", filtrate);
            if (!filtrate) return;
            if (!filtrate['market']) return;
            var id = filtrate['market'];

            self.augur.getMarketInfo(id, (marketInfo) => {
                if (self.debug) console.log("tx change market info:", marketInfo);
                self.market_index.indexMarket(id, marketInfo);
            });
        }

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
                    peers=parseInt(peers);
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

        function doneSyncing(){

            function scanHelper(){
                if (!config.scan) {
                    if (callback) callback(null, 0);
                }else{
                    self.scan(config, (err, updates) => {
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