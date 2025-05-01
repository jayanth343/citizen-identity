#!/bin/bash

# Make sure the network is running
if [ $(docker ps -q -f "name=peer0.org1.example.com" | wc -l) -eq 0 ]; then
  echo "Fabric network is not running. Please start it first with ./fixed_start.sh"
  exit 1
fi

# Wait for the network to be ready
echo "Waiting for the network to be ready..."
sleep 5

# Create the channel using CLI container
echo "Creating channel using CLI container..."
docker exec -it cli peer channel create -o orderer.example.com:7050 -c mychannel -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/channel.tx --outputBlock /opt/gopath/src/github.com/hyperledger/fabric/peer/mychannel.block --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

# Check if channel creation was successful
if [ $? -ne 0 ]; then
  echo "Channel creation failed. Trying with additional DNS configuration..."
  
  # Add hosts entries to CLI container
  docker exec -it cli bash -c "echo '127.0.0.1 orderer.example.com' >> /etc/hosts"
  docker exec -it cli bash -c "echo '127.0.0.1 peer0.org1.example.com' >> /etc/hosts"
  docker exec -it cli bash -c "echo '127.0.0.1 peer0.org2.example.com' >> /etc/hosts"
  
  # Try creating channel again
  docker exec -it cli peer channel create -o orderer.example.com:7050 -c mychannel -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/channel.tx --outputBlock /opt/gopath/src/github.com/hyperledger/fabric/peer/mychannel.block --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
  
  if [ $? -ne 0 ]; then
    echo "Channel creation failed again. Please check the network configuration."
    exit 1
  fi
fi

echo "Channel created successfully. Joining peers to channel..."

# Join peer0.org1 to the channel
docker exec -it cli peer channel join -b mychannel.block
if [ $? -ne 0 ]; then
  echo "Failed to join peer0.org1 to channel."
  exit 1
fi

# Join peer0.org2 to the channel
docker exec -it -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp" -e "CORE_PEER_ADDRESS=peer0.org2.example.com:9051" -e "CORE_PEER_LOCALMSPID=Org2MSP" -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" cli peer channel join -b mychannel.block
if [ $? -ne 0 ]; then
  echo "Failed to join peer0.org2 to channel."
  exit 1
fi

# Join peer1.org1 to the channel
docker exec -it -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp" -e "CORE_PEER_ADDRESS=peer1.org1.example.com:8051" -e "CORE_PEER_LOCALMSPID=Org1MSP" -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer1.org1.example.com/tls/ca.crt" cli peer channel join -b mychannel.block
if [ $? -ne 0 ]; then
  echo "Failed to join peer1.org1 to channel."
  exit 1
fi

# Join peer1.org2 to the channel
docker exec -it -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp" -e "CORE_PEER_ADDRESS=peer1.org2.example.com:10051" -e "CORE_PEER_LOCALMSPID=Org2MSP" -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer1.org2.example.com/tls/ca.crt" cli peer channel join -b mychannel.block
if [ $? -ne 0 ]; then
  echo "Failed to join peer1.org2 to channel."
  exit 1
fi

echo "All peers joined the channel. Updating anchor peers..."

# Update anchor peer for org1
docker exec -it cli peer channel update -o orderer.example.com:7050 -c mychannel -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/Org1MSPanchors.tx --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

# Update anchor peer for org2
docker exec -it -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp" -e "CORE_PEER_ADDRESS=peer0.org2.example.com:9051" -e "CORE_PEER_LOCALMSPID=Org2MSP" -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" cli peer channel update -o orderer.example.com:7050 -c mychannel -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/Org2MSPanchors.tx --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

echo "Anchor peers updated. Installing chaincode..."

# Check if chaincode directory exists
if [ ! -d "./chaincode/identity" ]; then
  echo "Chaincode directory not found. Skipping chaincode installation."
  exit 1
fi

# Copy chaincode to CLI container
docker cp ./chaincode/identity cli:/opt/gopath/src/github.com/chaincode/identity

# Install chaincode on peer0.org1
docker exec -it cli peer chaincode install -n identity -v 1.0 -p github.com/chaincode/identity
if [ $? -ne 0 ]; then
  echo "Failed to install chaincode on peer0.org1."
  exit 1
fi

# Install chaincode on peer0.org2
docker exec -it -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp" -e "CORE_PEER_ADDRESS=peer0.org2.example.com:9051" -e "CORE_PEER_LOCALMSPID=Org2MSP" -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" cli peer chaincode install -n identity -v 1.0 -p github.com/chaincode/identity
if [ $? -ne 0 ]; then
  echo "Failed to install chaincode on peer0.org2."
  exit 1
fi

# Instantiate chaincode on the channel
echo "Instantiating chaincode..."
docker exec -it cli peer chaincode instantiate -o orderer.example.com:7050 -C mychannel -n identity -v 1.0 -c '{"Args":[]}' -P "AND('Org1MSP.member','Org2MSP.member')" --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

echo "Waiting for chaincode instantiation (30 seconds)..."
sleep 30

# Test chaincode invocation
echo "Testing chaincode invocation..."
docker exec -it cli peer chaincode invoke -o orderer.example.com:7050 -C mychannel -n identity -c '{"function":"initLedger","Args":[]}' --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

echo "Fabric network, channels, and chaincode setup complete!" 