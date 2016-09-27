# augur_node
An Augur Node is a public node that caches/serves market data to help with performance. It also provides a public geth node.

To setup a node:

1. Install Docker
2. Clone this repository
3. run `docker-compose up -d`

You can test that your augur_node is working by navigating to `http://your_server:8547/getMarketsInfo` in your browser. There will be a delay between when you spin up your node and when you actually see market data as geth must first sync.

An augur_node does not manage your networking for you, so please verify that ports 8545 (geth rpc), 8546 (geth websockets), 8547 (augur_node) are open on your machine.

# endpoints
Your cache node will have the following endpoints available:
## getMarketsInfo

### filtered mode
`http://your_server:8547/getMarketsInfo?branchId=branchId`

If branch isn't specified, the default branch will be used.

You can specify if you want only active or inactive markets:

`http://your_server:8547/getMarketsInfo?active=true|false`
If active flag isn't specified, you will get all markets.

By default, the getMarketsInfo info endpoint will return results sorted by volume. You can specify a different sort order if you'd like. For example,
`http://your_server:8547/getMarketsInfo?sort=newest_market`
Supported sort options are:
- newest_market
- oldest_market
- most_volume
- least_volume
- soonest_expiry
- furthest_expiry
- lowest_maker_fee
- lowest_taker_fee
- highest_maker_fee
- highest_taker_fee

You can also easily paginate results, and specify how big each page size is. For example, this will return 20 results per page, and give you the second page of results:

`http://your_server:8547/getMarketsInfo?sort=soonest_expiry&limit=20&page=2`

It also may useful to return sorted results, limited to a specific. This can be done useing the `tag` param, which will do an exact match on markets that contain the tag that you specify.

`http://your_server:8547/getMarketsInfo?limit=20&tag=sports`

All of these options mentioned above can be used together or individually to build whatever view into the market data that you desire.

### Query Mode

The `getMarketsInfo` endpoint also supports searching for markets when the `query` param is included. This paramter works with all of the others mentioned above with the exception of `sort`, since in query mode results should be ordered by closest match to the queried term. Results are ordered with a preference for matches to description, then tags, then extraInfo.

Examples:

```
//Returns top 5 results matching "Gary Johnson"
http://your_server:8547/getMarketsInfo?limit=5&query=Gary%20Johnson

//Searches for "2025", limited to markets tagged "climate change"
http://your_server:8547/getMarketsInfo?tag=climate%20change&query=2025

//Searches active markets only for "president", returns page 2 of results.
http://your_server:8547/getMarketsInfo?query=president&active=true&page=2
```

## getTags
If you are interestd in retrieving the top n most popular tags, you can do:
`http://your_server:8547/getTags?limit=1000`

This will return you the top 1000 tags. The `page` parameter is not supported here due to a limitation in how aggregrations work in elasticsearch.

You can also specify a `branchId` to return tags from. Default branch will be used if not specified.
