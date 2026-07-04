#!/bin/bash
set -e

echo "Updating system..."
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

echo "Installing prerequisites..."
sudo apt-get install -y ca-certificates curl gnupg lsb-release

echo "Adding Docker GPG key..."
sudo rm -f /usr/share/keyrings/docker-archive-keyring.gpg
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo "Adding Docker repository..."
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

echo "Installing Docker and Compose..."
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

echo "Enabling and starting Docker..."
sudo systemctl enable docker
sudo systemctl start docker

echo "Configuring user permissions..."
sudo usermod -aG docker ubuntu

echo "Server Preparation Complete!"
