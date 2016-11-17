/**
 * Marketeer unit tests.
 * @author Kevin Day (@k_day)
 */

"use strict";

var chalk = require("chalk");
var crypto = require("crypto");
var assert = require("chai").assert;
var loader = require("../elastic_loader");

var DEBUG = false;
var TIMEOUT = 60000;

var config = {
    http: "http://localhost:8545",
    ws: null,
    limit: 5,
    interval: null,
    scan: false,
    filtering: true
};

var makeIndex = function (done) {
    //create a test index
    loader.market_index.index_name = "test_market_index";
    //loader.market_index.index_name = "test_" + crypto.randomBytes(4).toString("hex");
    loader.connect(config, function(){
        done();
    });
}

var removeIndex = function (done){
    //ckeanup index, disconnect
    loader.market_index.deleteIndex()
    .then(loader.disconnect( (err) => {
        if (err){
            console.log(err);
             done(err);
        }
        done();
    })).catch((err) => {
        if (err){
            console.log(err);
            done(err);
        }
        done();
    });
}
var marketId1 = "0x926de0662b697777f13e296a773c026d3831a58858f7c6b3b39506bec5e36c75";
var marketId2 = "0x969a5f7978efc98258c24e69892b6d9db7867652dd750c32e21bdf6c85dfab";
var marketId3 = "0x49bcd98d201ada87719a87ee7023302d669c74187aa955e56dea5780ba895167";
var marketId4 = "0xe8f87d6549b029039baa7728d85cbe3196b198a024848e2d20029ee2797558a9";
var marketId5 = "0xe8f87d6549b029039abc675545787777caccacc1234543322a6d7a6d5a4d8a9";

//test market Data
var doc1 = { network: '2',
  makerFee: '0.1',
  takerFee: '0.2',
  tradingFee: '0.03',
  numOutcomes: 2,
  tradingPeriod: 4893087,
  branchId: '1',
  numEvents: 1,
  cumulativeScale: '1',
  creationTime: 1000,
  volume: '1000',
  creationFee: '8.9',
  author: 'a',
  tags: [ 'ether', '2', '3' ],
  type: 'binary',
  endDate: 24000,
  winningOutcomes: [],
  description: 'price of ether',
  extraInfo: 'ether',
  outcomes: 
   [ { id: 1, outstandingShares: '0', price: '0' },
     { id: 2, outstandingShares: '0', price: '0' } ],
  events: 
   [ { id: '1',
       endDate: 1467926158,
       outcome: '0',
       minValue: '1',
       maxValue: '2',
       numOutcomes: 2,
       type: 'binary' } ] };

var doc2 = { network: '2',
  makerFee: '0.3',
  takerFee: '0.4',
  tradingFee: '0.03',
  numOutcomes: 2,
  tradingPeriod: 4893087,
  branchId: '1',
  numEvents: 1,
  cumulativeScale: '1',
  creationTime: 5000,
  volume: '500',
  creationFee: '8.9',
  author: 'a',
  tags: [ 'ether', '5', '6' ],
  type: 'binary',
  endDate: 20000,
  winningOutcomes: [],
  description: 'price of ether',
  extraInfo: '',
  outcomes: 
   [ { id: 1, outstandingShares: '0', price: '0' },
     { id: 2, outstandingShares: '0', price: '0' } ],
  events: 
   [ { id: '2',
       endDate: 1467926158,
       outcome: '0',
       minValue: '1',
       maxValue: '2',
       numOutcomes: 2,
       type: 'binary' } ] };

var doc3 = { network: '2',
  makerFee: '0.5',
  takerFee: '0.6',
  tradingFee: '0.03',
  numOutcomes: 2,
  tradingPeriod: 4893087,
  branchId: '1',
  numEvents: 1,
  cumulativeScale: '1',
  creationTime: 90000,
  volume: '200',
  creationFee: '8.9',
  author: 'a',
  tags: [ '7', '8', '9' ],
  type: 'binary',
  endDate: 27000,
  winningOutcomes: [],
  description:'price of ether',
  extraInfo: '',
  outcomes: 
   [ { id: 1, outstandingShares: '0', price: '0' },
     { id: 2, outstandingShares: '0', price: '0' } ],
  events: 
   [ { id: '3',
       endDate: 1467926158,
       outcome: '0',
       minValue: '1',
       maxValue: '2',
       numOutcomes: 2,
       type: 'binary' } ] };

var doc4 = { network: '2',
  makerFee: '0.7',
  takerFee: '0.8',
  tradingFee: '0.03',
  numOutcomes: 2,
  tradingPeriod: 4893087,
  branchId: '1',
  numEvents: 1,
  cumulativeScale: '1',
  creationTime: 3000,
  volume: '0',
  creationFee: '8.9',
  author: 'a',
  tags: [ '10', '11', '12' ],
  type: 'binary',
  endDate: 23000,
  winningOutcomes: [],
  description: 'doc4',
  outcomes: 
   [ { id: 1, outstandingShares: '0', price: '0' },
     { id: 2, outstandingShares: '0', price: '0' } ],
  events: 
   [ { id: '4',
       endDate: 1467926158,
       outcome: '0',
       minValue: '1',
       maxValue: '2',
       numOutcomes: 2,
       type: 'binary' } ] };

//inactive market
var doc5 = { network: '2',
  makerFee: '0.9',
  takerFee: '0.10',
  tradingFee: '0.03',
  numOutcomes: 2,
  tradingPeriod: 4893087,
  branchId: '1',
  numEvents: 1,
  cumulativeScale: '1',
  creationTime: 3000,
  volume: '0',
  creationFee: '8.9',
  author: 'a',
  tags: [ '10', '11', '12' ],
  type: 'binary',
  endDate: 23000,
  winningOutcomes: [ 0 ],
  description: 'doc5',
  outcomes: 
   [ { id: 1, outstandingShares: '0', price: '0' },
     { id: 2, outstandingShares: '0', price: '0' } ],
  events: 
   [ { id: '4',
       endDate: 1467926158,
       outcome: '0',
       minValue: '1',
       maxValue: '2',
       numOutcomes: 2,
       type: 'binary' } ] };

//market on different branch
var doc6 = { network: '2',
  makerFee: '0.9',
  takerFee: '0.10',
  tradingFee: '0.03',
  numOutcomes: 2,
  tradingPeriod: 4893087,
  branchId: '0xf69b5',
  numEvents: 1,
  cumulativeScale: '1',
  creationTime: 3000,
  volume: '0',
  creationFee: '8.9',
  author: 'a',
  tags: [ '10', '11', '12' ],
  type: 'binary',
  endDate: 23000,
  winningOutcomes: [ 0 ],
  description: 'doc6',
  outcomes: 
   [ { id: 1, outstandingShares: '0', price: '0' },
     { id: 2, outstandingShares: '0', price: '0' } ],
  events: 
   [ { id: '4',
       endDate: 1467926158,
       outcome: '0',
       minValue: '1',
       maxValue: '2',
       numOutcomes: 2,
       type: 'binary' } ] };

describe("loadMarket", function () {
    beforeEach(makeIndex);
    afterEach(removeIndex);

    it("retrieves and verifies document", function (done) {
        this.timeout(TIMEOUT);

        loader.market_index.indexMarket(marketId1, doc1)
        .then( () => {
            return loader.market_index.getMarket(marketId1);
        })
        .then( (result) => {
            assert.equal(result['makerFee'], doc1['makerFee']);
            assert.equal(result['takerFee'], doc1['takerFee']);
            assert.equal(result['tradingFee'], doc1['tradingFee']);
            assert.equal(result['tradingPeriod'], doc1['tradingPeriod']);
            assert.equal(result['numEvents'], doc1['numEvents']);
            assert.equal(result['cumulativeScale'], doc1['cumulativeScale']);
            assert.equal(result['author'], doc1['author']);
            assert.deepEqual(result['winningOutcomes'], doc1['winningOutcomes']);
            assert.equal(result['numOutcomes'], doc1['numOutcomes']);
            assert.equal(result['creationTime'], doc1['creationTime']);
            assert.equal(result['endDate'], doc1['endDate']);
            assert.equal(result['branchId'], doc1['branchId']);
            assert.equal(result['description'], doc1['description']);
            assert.equal(result['extraInfo'], doc1['extraInfo']);
            assert.deepEqual(result['tags'], doc1['tags']);
            assert.property(result, 'tags_full');
            assert.equal(result['type'], doc1['type']);
            assert.equal(result['volume'], doc1['volume']);
            assert.deepEqual(result['events'], doc1['events']);
            assert.property(result, "active");
            assert.equal(result['resolution'], doc1['resolution']);
            done();
        }).catch((err) =>{
            console.log(err);
            assert.fail(err);
            done();
        });
    });
});

describe("filterMarkets", function () {
    beforeEach(makeIndex);
    afterEach(removeIndex);

    it("tests sort options", function (done) {
        this.timeout(TIMEOUT);

        var options = {branchId: "1", limit: 1};
        //
        loader.market_index.indexMarket(marketId1, doc1)
        .then( () => {return loader.market_index.indexMarket(marketId2, doc2)})
        .then( () => {return loader.market_index.indexMarket(marketId3, doc3)})
        .then( () => {return loader.market_index.indexMarket(marketId4, doc4)})
        .then( () => {return loader.market_index.elastic.indices.refresh()})  //have to call refresh to ensure no race conditions for when docs are queryable
        .then( () => {
            options.sort = "newest_market";
            return loader.market_index.filterMarkets(options);
        }).then( (result) => {assert.equal(result.hits.hits[0]['_id'], marketId3);})
        .then( () => {
            options.sort = "oldest_market";
            return loader.market_index.filterMarkets(options);
        }).then( (result) => {assert.equal(result.hits.hits[0]['_id'], marketId1);})
        .then( () => {
            options.sort = "most_volume";
            return loader.market_index.filterMarkets(options);
        }).then( (result) => {assert.equal(result.hits.hits[0]['_id'], marketId1);})
        .then( () => {
            options.sort = "least_volume";
            return loader.market_index.filterMarkets(options);
        }).then( (result) => {assert.equal(result.hits.hits[0]['_id'], marketId4);})
        .then( () => {
            options.sort = "soonest_expiry";
            return loader.market_index.filterMarkets(options);
        }).then( (result) => {assert.equal(result.hits.hits[0]['_id'], marketId2);})
        .then( () => {
            options.sort = "furthest_expiry";
            return loader.market_index.filterMarkets(options);
        }).then( (result) => {assert.equal(result.hits.hits[0]['_id'], marketId3);})
        .then( () => {
            options.sort = "lowest_maker_fee";
            return loader.market_index.filterMarkets(options);
        }).then( (result) => {assert.equal(result.hits.hits[0]['_id'], marketId1);})
        .then( () => {
            options.sort = "lowest_taker_fee";
            return loader.market_index.filterMarkets(options);
        }).then( (result) => {assert.equal(result.hits.hits[0]['_id'], marketId1);})
        .then( () => {
            options.sort = "highest_maker_fee";
            return loader.market_index.filterMarkets(options);
        }).then( (result) => {assert.equal(result.hits.hits[0]['_id'], marketId4);})
        .then( () => {
            options.sort = "highest_taker_fee";
            return loader.market_index.filterMarkets(options);
        }).then( (result) => {assert.equal(result.hits.hits[0]['_id'], marketId4);})
        .then( () => {
            //default case
            options.sort = null
            return loader.market_index.filterMarkets(options);
        }).then( (result) => {
            assert.equal(result.hits.hits[0]['_id'], marketId1);
            done();
        })
        .catch((err) => {
            console.log(err);
            assert.fail(err);
            done();
        });
    });

    it("tests active flag", function (done) {
        this.timeout(TIMEOUT);

        var options = {branchId: "1"};
        //
        loader.market_index.indexMarket(marketId1, doc1)
        .then( () => {return loader.market_index.indexMarket(marketId2, doc2)})
        .then( () => {return loader.market_index.indexMarket(marketId5, doc5)}) //inactive market
        .then( () => {return loader.market_index.elastic.indices.refresh()})  //have to call refresh to ensure no race conditions for when docs are queryable
        .then( () => {
            //default case (not set, returns everything)
            return loader.market_index.filterMarkets(options);
        }).then( (result) => {assert.equal(result.hits.total, 3)})
        .then( () => {
            //active only
            options.active = true;
            return loader.market_index.filterMarkets(options);
        }).then( (result) => {assert.equal(result.hits.total, 2)})
        .then( () => {
            //inactive only
            options.active = false;
            return loader.market_index.filterMarkets(options);
        }).then( (result) => {
            assert.equal(result.hits.total, 1);
            done();
        })
        .catch((err) => {
            console.log(err);
            assert.fail(err);
            done();
        });
    });

    it("tests tag filter", function (done) {
        this.timeout(TIMEOUT);

        var options = {branchId: "1"};
        //
        loader.market_index.indexMarket(marketId1, doc1)
        .then( () => {return loader.market_index.indexMarket(marketId2, doc2)})
        .then( () => {return loader.market_index.indexMarket(marketId3, doc3)}) //inactive market
        .then( () => {return loader.market_index.elastic.indices.refresh()})  //have to call refresh to ensure no race conditions for when docs are queryable
        .then( () => {
            //default case (not set, returns everything)
            return loader.market_index.filterMarkets(options);
        }).then( (result) => {assert.equal(result.hits.total, 3)})
        .then( () => {
            //only return markets with tag "3"
            options.tag = "3";
            return loader.market_index.filterMarkets(options);
        }).then( (result) => {
            assert.equal(result.hits.total, 1);
            done();
        })
        .catch((err) => {
            console.log(err);
            assert.fail(err);
            done();
        });
    });

    it("tests branch filter", function (done) {
        this.timeout(TIMEOUT);

        var options = {};
        loader.market_index.indexMarket(marketId1, doc5)   //branch 1
        .then( () => {return loader.market_index.indexMarket(marketId2, doc2)}) //branch 1
        .then( () => {return loader.market_index.indexMarket(marketId3, doc6)}) //default branch '0xf69b5''
        .then( () => {return loader.market_index.elastic.indices.refresh()})  //have to call refresh to ensure no race conditions for when docs are queryable
        .then( () => {
            //default branch
            options.branchId = '0xf69b5';
            return loader.market_index.filterMarkets(options);
        }).then( (result) => {
            assert.equal(result.hits.total, 1);
            assert.equal(result.hits.hits[0]['_id'], marketId3);
        })
        .then( () => {
            options.branchId = '1';
            return loader.market_index.filterMarkets(options);
        }).then( (result) => {
            assert.equal(result.hits.total, 2);
            done();
        })
        .catch((err) => {
            console.log(err);
            assert.fail(err);
            done();
        });
    });

});


describe("searchMarkets", function () {
    beforeEach(makeIndex);
    afterEach(removeIndex);

    it("finds the best match", function (done) {
        this.timeout(TIMEOUT);

        var options = {branchId: "1", limit: 5, query: "ether"};

        loader.market_index.indexMarket(marketId1, doc1)  //ether in description, tags, extrainfo
        .then( () => {return loader.market_index.indexMarket(marketId2, doc2)}) //ether in description, tags
        .then( () => {return loader.market_index.indexMarket(marketId3, doc3)}) //ether in description, tags
        .then( () => {return loader.market_index.elastic.indices.refresh()})  //have to call refresh to ensure no race conditions for when docs are queryable
        .then( () => {
            return loader.market_index.searchMarkets(options);
        }).then( (result) => {
            assert.equal(result.hits.hits[0]['_id'], marketId1);
            assert.equal(result.hits.hits[1]['_id'], marketId2);
            assert.equal(result.hits.hits[2]['_id'], marketId3);
        }).then( () => {
            //Test fuzzy match
            options.query = "athr" //bad misspelling of ether.
            return loader.market_index.searchMarkets(options);
        }).then( (result) => {
            assert.equal(result.hits.hits[0]['_id'], marketId1);
            assert.equal(result.hits.hits[1]['_id'], marketId2);
            assert.equal(result.hits.hits[2]['_id'], marketId3);
            done();
        })
        .catch((err) => {
            console.log(err);
            assert.fail(err);
            done();
        });
    });

});


describe("markets scan", function () {
    beforeEach(makeIndex);
    afterEach(removeIndex);

    it("fetch market info from the blockchain and indexes it", function (done) {
        this.timeout(TIMEOUT*100);

        var options = {branchId: '0xf69b5', limit: 5000};

        var marketIds = [];
        var step = 2000;
        var branch = loader.augur.constants.DEFAULT_BRANCH_ID;
        var marketsInBranch = loader.augur.getNumMarketsBranch(branch);
        for (var i = 0; i < marketsInBranch; i += step) {
            var end = Math.min(i + step, marketsInBranch);
            marketIds = marketIds.concat(loader.augur.getSomeMarketsInBranch(branch, i, end));
        }
        var expectedMarkets = marketIds.length < config.limit ? marketIds.length : config.limit;

        loader.market_index.scan(loader.augur, config)
            .then(function (numMarkets){
                assert.equal(expectedMarkets, config.limit);
            })
            .then( () => {return loader.market_index.elastic.indices.refresh()})  //have to call refresh to ensure no race conditions for when docs are queryable
            .then( () => {
                return loader.market_index.filterMarkets(options);
            }).then( (result) => {
                assert.equal(result.hits.total, expectedMarkets);
                done();
            })
            .catch((err) => {
                console.log(err);
                assert.fail(err);
                done();
            });
        });
});
