sudo apt-get update
sudo apt-get install -y git
sudo apt-get install linux-image-generic-lts-trusty

sudo reboot
curl -sSL https://get.docker.com/ | sh

git clone https://github.com/AugurProject/augur_node.
cd augur_node

sudo apt-get -y install python-pip
sudo pip install docker-compose

sudo docker-compose up -d
