#!/bin/bash

cd /home/augur

elasticroot="http://localhost:"
if  [ ! -z  "$ELASTIC_HOST" ]; then
	elasticroot="http://${ELASTIC_HOST}:"
fi

elasticport="9200"
if  [ ! -z  "$ELASTIC_PORT" ]; then
	elasticport="${ELASTIC_PORT}"
fi
elastichost="${elasticroot}${elasticport}"
echo $elastichost

gethhost="http://localhost:8545"
if  [ ! -z  "$GETH_HOST" ]; then
	gethhost="http://${GETH_HOST}:8545"
fi

while ! curl $elastichost; do sleep 1; done;
while ! curl $gethhost; do sleep 1; done;

node index.js
