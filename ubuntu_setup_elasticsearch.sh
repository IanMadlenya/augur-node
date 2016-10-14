sudo apt-get update
#install java
sudo apt-get install -y openjdk-7-jre
wget https://download.elastic.co/elasticsearch/elasticsearch/elasticsearch-1.7.2.deb
sudo dpkg -i elasticsearch-1.7.2.deb
#Make sure Elasticsearch starts and stops automatically with the Droplet
sudo update-rc.d elasticsearch defaults
#start elasticsearch
sudo service elasticsearch start
#Test that it's running (may take ~10 seconds to start)
curl -X GET 'http://localhost:9200'
