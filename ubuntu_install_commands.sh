sudo apt-get update
sudo apt-get install -y git python-pip linux-image-generic-lts-trusty

curl -sSL https://get.docker.com/ | sh

#Elasticseearch 5.0 requires at least 262144 for production use
# sudo sysctl -w vm.max_map_count=262144

#If you would like to use Docker as a non-root user, you should now consider
#adding your user to the "docker" group with something like:

#  sudo usermod -aG docker auguruser

#Remember that you will have to log out and back in for this to take effect!

git clone https://github.com/AugurProject/augur_node
cd augur_node

sudo pip install --upgrade pip
sudo pip install docker-compose

sudo docker-compose up -d
