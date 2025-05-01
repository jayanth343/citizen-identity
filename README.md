# Hyperledger Fabric Identity Management Network

This project implements a blockchain-based identity management system using Hyperledger Fabric. It allows clients, issuers, and verifiers to interact in a secure and trusted environment for identity verification and document management.

## Project Structure

- `chaincode/` - Smart contract code
  - `identity/` - Main identity management chaincode
  - `citizen-identity/` - Citizen identity management chaincode
  - `private-channel/` - Private channel chaincode

- `channel-artifacts/` - Channel configuration files
- `crypto-config/` - Cryptographic materials 
- `backend/` - Backend server implementation
- `frontend/` - Frontend application
- `api/` - API endpoints

## Network Components

The Fabric network consists of:
- 2 organizations (Org1 and Org2)
- 4 peers (2 peers per organization)
- 1 orderer
- Multiple channels (primary and private channels)

## Available Chaincodes

- `citizen-identity`: Node.js-based chaincode package for identity management

## Commands

### Network Management

```bash
# Start the network
./start.sh

# Start with fixed configuration (recommended)
./fixed_start.sh

# Create a private channel
./create_private_channel.sh [CLIENT_ID] [VERIFIER_ID] [ISSUER_ID]

# Stop the network
docker-compose down

# View running containers
docker ps
```

### Network Verification

```bash
# Check channel list
docker exec cli peer channel list

# Check installed chaincodes
docker exec cli peer lifecycle chaincode queryinstalled

# Check committed chaincodes on a channel
docker exec cli peer lifecycle chaincode querycommitted -C mychannel

# Check older-style instantiated chaincodes
docker exec cli peer chaincode list --instantiated -C mychannel
```

### Chaincode Deployment

```bash
# Package chaincode
docker exec cli peer lifecycle chaincode package citizen-identity.tar.gz --path /opt/gopath/src/github.com/chaincode/citizen-identity --lang node --label citizen-identity_1.0

# Install chaincode
docker exec cli peer lifecycle chaincode install citizen-identity.tar.gz

# Approve chaincode for Org1
docker exec cli peer lifecycle chaincode approveformyorg -o orderer.example.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID mychannel --name citizen-identity --version 1.0 --package-id [PACKAGE_ID] --sequence 1

# Approve for Org2
docker exec -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp" -e "CORE_PEER_ADDRESS=peer0.org2.example.com:9051" -e "CORE_PEER_LOCALMSPID=Org2MSP" -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" cli peer lifecycle chaincode approveformyorg -o orderer.example.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID mychannel --name citizen-identity --version 1.0 --package-id [PACKAGE_ID] --sequence 1

# Commit chaincode
docker exec cli peer lifecycle chaincode commit -o orderer.example.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID mychannel --name citizen-identity --version 1.0 --sequence 1 --peerAddresses peer0.org1.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses peer0.org2.example.com:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
```

### Chaincode Invocation and Queries

```bash
# Initialize the ledger
docker exec cli peer chaincode invoke -o orderer.example.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C mychannel -n citizen-identity --peerAddresses peer0.org1.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses peer0.org2.example.com:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt -c '{"function":"InitLedger","Args":[]}'

# Query organizations
docker exec cli peer chaincode query -C mychannel -n citizen-identity -c '{"function":"getAllOrganizations","Args":[]}'

# Query identities
docker exec cli peer chaincode query -C mychannel -n citizen-identity -c '{"function":"GetIdentity","Args":["CITIZEN_ID"]}'

# Get all issuers
docker exec cli peer chaincode query -C mychannel -n citizen-identity -c '{"function":"getAllIssuers","Args":[]}'

# Get all verifiers
docker exec cli peer chaincode query -C mychannel -n citizen-identity -c '{"function":"getAllVerifiers","Args":[]}'
```

### Private Channel Operations

```bash
# Query messages in a private channel
docker exec cli peer chaincode query -C [PRIVATE_CHANNEL_ID] -n private-[PRIVATE_CHANNEL_ID] -c '{"Args":["getMessages","[PRIVATE_CHANNEL_ID]"]}'

# Send a message to a private channel
docker exec cli peer chaincode invoke -o orderer.example.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C [PRIVATE_CHANNEL_ID] -n private-[PRIVATE_CHANNEL_ID] --peerAddresses peer0.org1.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses peer0.org2.example.com:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt -c '{"Args":["sendMessage","MESSAGE_ID","CHANNEL_ID","FROM","CONTENT","TYPE"]}'
```

### Maintenance Commands

```bash
# Remove temporary files
rm -f *.block *.json *.pb

# Clean up chaincode packages
find . -name "*.tar.gz" -delete

# Remove node_modules in chaincode directories
find ./chaincode -name "node_modules" -type d | xargs -r rm -rf

# Remove package-lock.json files
find ./chaincode -name "package-lock.json" -delete

# Clean up log files
find . -name "*.log" -delete

# Clean up Docker images
docker image prune -f
```

## Backend Server

The backend server provides REST APIs to interact with the Fabric network. Start the server with:

```bash
cd backend
npm install
npm start
```

Server runs on port 8080 by default. See `backend/server.js` for all available API endpoints.

## Current Status

- Network is running with multiple containers
- Three channels exist: `mychannel`, `private-citizen-001-bankverifier`, and `private-citizen-002-bankverifier`
- `citizen-identity` chaincode package is installed on the peer but not committed to any channel

## Troubleshooting

If you encounter issues with chaincode deployment, check:
1. Channel configuration
2. Endorsement policies
3. Organization MSP configuration
4. Chaincode package path and language settings 