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

`http://your_server:8547/getMarketsInfo?branchId=eq,branch`
