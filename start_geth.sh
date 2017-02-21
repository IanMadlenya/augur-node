#!/bin/bash
apk update
apk add pwgen
pw=`pwgen -s 20 -y`

accounts=`./geth --testnet account list`

#geth requires an account to operate. create one if one doesn't exist
if [ -z "$accounts" ]; then
 	echo "Creating new geth account"
 	pw=`pwgen -s 20 -y`
	echo $pw > pw.txt
	./geth --testnet --password pw.txt account new
fi

#echo "starting geth"
./geth --testnet --fast --cache=1024 --rpcaddr "0.0.0.0" --rpc --rpccorsdomain "*" --rpcapi "eth,net,web3,txpool" --ws --wsapi "eth,net,web3,txpool" --wsport 8546 --wsorigins "*"
