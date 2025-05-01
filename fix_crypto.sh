#!/bin/bash

# Stop any running containers
echo "Stopping any running containers..."
docker-compose down

# Clean up existing crypto material and artifacts
echo "Cleaning up existing crypto material..."
rm -rf crypto-config
rm -rf channel-artifacts

# Create necessary directories
mkdir -p channel-artifacts
mkdir -p crypto-config

# Regenerate crypto material with proper configuration
echo "Regenerating crypto material..."
cryptogen generate --config=./crypto-config.yaml --output="crypto-config"

# Make sure it's readable
chmod -R 755 crypto-config

# Generate genesis block and channel artifacts
echo "Generating genesis block and channel artifacts..."
configtxgen -profile TwoOrgsOrdererGenesis -channelID system-channel -outputBlock ./channel-artifacts/genesis.block
configtxgen -profile TwoOrgsChannel -outputCreateChannelTx ./channel-artifacts/channel.tx -channelID mychannel
configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/Org1MSPanchors.tx -channelID mychannel -asOrg Org1MSP
configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/Org2MSPanchors.tx -channelID mychannel -asOrg Org2MSP

echo "Crypto material and artifacts regenerated successfully."
echo "You can now start the network with: ./fixed_start.sh" 