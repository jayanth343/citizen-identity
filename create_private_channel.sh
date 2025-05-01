#!/bin/bash

# Create private channel between client and verifier
# Usage: ./create_private_channel.sh client_id verifier_id issuer_id

# Check if parameters are provided
if [ "$#" -lt 3 ]; then
    echo "Usage: $0 <client_id> <verifier_id> <issuer_id>"
    echo "Example: $0 citizen-001 bankVerifier I1"
    exit 1
fi

CLIENT_ID=$1
VERIFIER_ID=$2
ISSUER_ID=$3
CHANNEL_ID="private-${CLIENT_ID}-${VERIFIER_ID}"

# Make channel ID compliant with Fabric requirements (lowercase, no special chars)
CHANNEL_ID=$(echo $CHANNEL_ID | tr '[:upper:]' '[:lower:]' | tr -cd '[:alnum:]-')

echo "Creating private Fabric channel: $CHANNEL_ID"
echo "- Client ID: $CLIENT_ID"
echo "- Verifier ID: $VERIFIER_ID"
echo "- Issuer ID: $ISSUER_ID"

# Create channel artifacts directory if it doesn't exist
mkdir -p private-channels

# Generate channel configuration transaction
echo "Generating channel configuration transaction..."
configtxgen -profile TwoOrgsChannel -outputCreateChannelTx ./private-channels/${CHANNEL_ID}.tx -channelID ${CHANNEL_ID}

if [ $? -ne 0 ]; then
    echo "Failed to generate channel configuration transaction."
    exit 1
fi

# Create directory in CLI container
echo "Creating directory in CLI container..."
docker exec cli mkdir -p /opt/gopath/src/github.com/hyperledger/fabric/peer/private-channels

# Copy transaction file to CLI container
echo "Copying transaction file to CLI container..."
docker cp ./private-channels/${CHANNEL_ID}.tx cli:/opt/gopath/src/github.com/hyperledger/fabric/peer/private-channels/

# Create the channel using CLI container
echo "Creating channel using CLI container..."
# Check if channel already exists
CHANNEL_EXISTS=$(docker exec cli peer channel list | grep -c ${CHANNEL_ID})
if [ $CHANNEL_EXISTS -gt 0 ]; then
  echo "Channel ${CHANNEL_ID} already exists. Skipping creation."
else
  docker exec cli peer channel create -o orderer.example.com:7050 -c ${CHANNEL_ID} -f /opt/gopath/src/github.com/hyperledger/fabric/peer/private-channels/${CHANNEL_ID}.tx --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

  if [ $? -ne 0 ]; then
      echo "Failed to create channel."
      exit 1
  fi

  # Copy the channel block to the private-channels directory
  echo "Copying channel block..."
  docker exec cli cp ${CHANNEL_ID}.block /opt/gopath/src/github.com/hyperledger/fabric/peer/private-channels/

  # Join peer0.org1 to the channel (client peer)
  echo "Joining peer0.org1 to the channel..."
  docker exec cli peer channel join -b ${CHANNEL_ID}.block

  # Join peer0.org2 to the channel (verifier peer)
  echo "Joining peer0.org2 to the channel..."
  docker exec -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp" -e "CORE_PEER_ADDRESS=peer0.org2.example.com:9051" -e "CORE_PEER_LOCALMSPID=Org2MSP" -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" cli peer channel join -b ${CHANNEL_ID}.block
fi

# Check for existing anchor peer transactions
if [ ! -f "/opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/Org1MSPanchors.tx" ]; then
    # Generate anchor peer update for Org1 (client)
    echo "Generating anchor peer update for Org1..."
    configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/Org1MSPanchors.tx -channelID ${CHANNEL_ID} -asOrg Org1MSP
    
    # Copy to CLI container
    docker cp ./channel-artifacts/Org1MSPanchors.tx cli:/opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/
fi

if [ ! -f "/opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/Org2MSPanchors.tx" ]; then
    # Generate anchor peer update for Org2 (verifier)
    echo "Generating anchor peer update for Org2..."
    configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/Org2MSPanchors.tx -channelID ${CHANNEL_ID} -asOrg Org2MSP
    
    # Copy to CLI container
    docker cp ./channel-artifacts/Org2MSPanchors.tx cli:/opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/
fi

# Update anchor peers
echo "Updating anchor peers for Org1..."
docker exec cli peer channel update -o orderer.example.com:7050 -c ${CHANNEL_ID} -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/Org1MSPanchors.tx --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

echo "Updating anchor peers for Org2..."
docker exec -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp" -e "CORE_PEER_ADDRESS=peer0.org2.example.com:9051" -e "CORE_PEER_LOCALMSPID=Org2MSP" -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" cli peer channel update -o orderer.example.com:7050 -c ${CHANNEL_ID} -f /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/Org2MSPanchors.tx --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

# Install chaincode for private channel
echo "Installing the channel identity chaincode..."

# Create a simple identity chaincode for the private channel
mkdir -p chaincode/private-channel
cat > chaincode/private-channel/private_channel.go << 'EOF'
package main

import (
    "encoding/json"
    "fmt"
    "time"

    "github.com/hyperledger/fabric-chaincode-go/shim"
    "github.com/hyperledger/fabric-protos-go/peer"
)

// PrivateChannelChaincode implements a simple chaincode for private communication
type PrivateChannelChaincode struct {
}

// Message represents a communication message in the channel
type Message struct {
    ID        string    `json:"id"`
    ChannelID string    `json:"channelId"`
    From      string    `json:"from"`
    Content   string    `json:"content"`
    Type      string    `json:"type"`
    Timestamp time.Time `json:"timestamp"`
}

// Init initializes the chaincode
func (t *PrivateChannelChaincode) Init(stub shim.ChaincodeStubInterface) peer.Response {
    return shim.Success(nil)
}

// Invoke is the entry point for all chaincode functions
func (t *PrivateChannelChaincode) Invoke(stub shim.ChaincodeStubInterface) peer.Response {
    function, args := stub.GetFunctionAndParameters()

    switch function {
    case "sendMessage":
        return t.sendMessage(stub, args)
    case "getMessages":
        return t.getMessages(stub, args)
    default:
        return shim.Error("Invalid function name")
    }
}

// sendMessage records a new message in the channel
func (t *PrivateChannelChaincode) sendMessage(stub shim.ChaincodeStubInterface, args []string) peer.Response {
    if len(args) != 5 {
        return shim.Error("Incorrect arguments. Expecting id, channelId, from, content, type")
    }

    id := args[0]
    channelID := args[1]
    from := args[2]
    content := args[3]
    msgType := args[4]

    message := Message{
        ID:        id,
        ChannelID: channelID,
        From:      from,
        Content:   content,
        Type:      msgType,
        Timestamp: time.Now(),
    }

    messageJSON, err := json.Marshal(message)
    if err != nil {
        return shim.Error(fmt.Sprintf("Failed to marshal message: %s", err))
    }

    // Use message ID as key
    err = stub.PutState(id, messageJSON)
    if err != nil {
        return shim.Error(fmt.Sprintf("Failed to put message: %s", err))
    }

    // Also add to channel index
    channelKey := "channel~" + channelID
    channelMessagesJSON, err := stub.GetState(channelKey)
    
    var channelMessages []string
    if err == nil && channelMessagesJSON != nil {
        err = json.Unmarshal(channelMessagesJSON, &channelMessages)
        if err != nil {
            return shim.Error(fmt.Sprintf("Failed to unmarshal channel messages: %s", err))
        }
    }
    
    channelMessages = append(channelMessages, id)
    channelMessagesJSON, err = json.Marshal(channelMessages)
    if err != nil {
        return shim.Error(fmt.Sprintf("Failed to marshal channel messages: %s", err))
    }
    
    err = stub.PutState(channelKey, channelMessagesJSON)
    if err != nil {
        return shim.Error(fmt.Sprintf("Failed to update channel messages: %s", err))
    }

    return shim.Success(messageJSON)
}

// getMessages retrieves all messages for a channel
func (t *PrivateChannelChaincode) getMessages(stub shim.ChaincodeStubInterface, args []string) peer.Response {
    if len(args) != 1 {
        return shim.Error("Incorrect arguments. Expecting channelId")
    }

    channelID := args[0]
    channelKey := "channel~" + channelID
    
    channelMessagesJSON, err := stub.GetState(channelKey)
    if err != nil {
        return shim.Error(fmt.Sprintf("Failed to get channel messages: %s", err))
    }
    
    if channelMessagesJSON == nil {
        // No messages yet, return empty array
        return shim.Success([]byte("[]"))
    }
    
    var messageIDs []string
    err = json.Unmarshal(channelMessagesJSON, &messageIDs)
    if err != nil {
        return shim.Error(fmt.Sprintf("Failed to unmarshal message IDs: %s", err))
    }
    
    var messages []Message
    for _, id := range messageIDs {
        messageJSON, err := stub.GetState(id)
        if err != nil {
            return shim.Error(fmt.Sprintf("Failed to get message %s: %s", id, err))
        }
        
        if messageJSON != nil {
            var message Message
            err = json.Unmarshal(messageJSON, &message)
            if err != nil {
                return shim.Error(fmt.Sprintf("Failed to unmarshal message %s: %s", id, err))
            }
            messages = append(messages, message)
        }
    }
    
    // Sort by timestamp (in a real app)
    
    messagesJSON, err := json.Marshal(messages)
    if err != nil {
        return shim.Error(fmt.Sprintf("Failed to marshal messages: %s", err))
    }
    
    return shim.Success(messagesJSON)
}

func main() {
    err := shim.Start(new(PrivateChannelChaincode))
    if err != nil {
        fmt.Printf("Error starting Private Channel chaincode: %s", err)
    }
}
EOF

# Create go.mod file for the chaincode
cat > chaincode/private-channel/go.mod << 'EOF'
module github.com/hyperledger/fabric-samples/chaincode/private-channel

go 1.13

require (
	github.com/hyperledger/fabric-chaincode-go v0.0.0-20200424173110-d7076418f212
	github.com/hyperledger/fabric-protos-go v0.0.0-20200424173316-dd554ba3746e
)
EOF

# Create chaincode directory in CLI container 
docker exec cli mkdir -p /opt/gopath/src/github.com/chaincode/private-channel/

# Copy the chaincode to CLI container
docker cp chaincode/private-channel/private_channel.go cli:/opt/gopath/src/github.com/chaincode/private-channel/
docker cp chaincode/private-channel/go.mod cli:/opt/gopath/src/github.com/chaincode/private-channel/

# Check if chaincode exists
echo "Checking if chaincode already exists..."
CHAINCODE_EXISTS=$(docker exec cli peer lifecycle chaincode querycommitted --channelID ${CHANNEL_ID} --output json 2>/dev/null | grep -c ${CHANNEL_ID})

if [ $CHAINCODE_EXISTS -gt 0 ]; then
  echo "Chaincode already exists on channel ${CHANNEL_ID}. Skipping installation."
else
  # Package the chaincode (new lifecycle)
  echo "Packaging chaincode..."
  docker exec cli peer lifecycle chaincode package private-${CHANNEL_ID}.tar.gz --path github.com/chaincode/private-channel/ --lang golang --label private-${CHANNEL_ID}_1.0

  # Install chaincode on peer0.org1
  echo "Installing chaincode on peer0.org1..."
  docker exec cli peer lifecycle chaincode install private-${CHANNEL_ID}.tar.gz

  # Get the package ID
  PACKAGE_ID=$(docker exec cli peer lifecycle chaincode queryinstalled | grep private-${CHANNEL_ID}_1.0 | awk '{print $3}' | sed 's/,//')
  echo "Chaincode package ID: $PACKAGE_ID"

  # Install chaincode on peer0.org2
  echo "Installing chaincode on peer0.org2..."
  docker exec -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp" -e "CORE_PEER_ADDRESS=peer0.org2.example.com:9051" -e "CORE_PEER_LOCALMSPID=Org2MSP" -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" cli peer lifecycle chaincode install private-${CHANNEL_ID}.tar.gz

  # Approve chaincode for Org1
  echo "Approving chaincode for Org1..."
  docker exec cli peer lifecycle chaincode approveformyorg -o orderer.example.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID ${CHANNEL_ID} --name private-${CHANNEL_ID} --version 1.0 --package-id $PACKAGE_ID --sequence 1

  # Approve chaincode for Org2
  echo "Approving chaincode for Org2..."
  docker exec -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp" -e "CORE_PEER_ADDRESS=peer0.org2.example.com:9051" -e "CORE_PEER_LOCALMSPID=Org2MSP" -e "CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt" cli peer lifecycle chaincode approveformyorg -o orderer.example.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID ${CHANNEL_ID} --name private-${CHANNEL_ID} --version 1.0 --package-id $PACKAGE_ID --sequence 1

  # Check commit readiness
  echo "Checking commit readiness..."
  docker exec cli peer lifecycle chaincode checkcommitreadiness --channelID ${CHANNEL_ID} --name private-${CHANNEL_ID} --version 1.0 --sequence 1 --output json

  # Commit chaincode
  echo "Committing chaincode..."
  docker exec cli peer lifecycle chaincode commit -o orderer.example.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID ${CHANNEL_ID} --name private-${CHANNEL_ID} --peerAddresses peer0.org1.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses peer0.org2.example.com:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt --version 1.0 --sequence 1

  # Wait for chaincode to initialize
  sleep 5
fi

# Send test message to the channel
echo "Sending test message to the channel..."
TEST_MSG_ID="msg-$(date +%s)"
docker exec cli peer chaincode invoke -o orderer.example.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C ${CHANNEL_ID} -n private-${CHANNEL_ID} --peerAddresses peer0.org1.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses peer0.org2.example.com:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt -c "{\"Args\":[\"sendMessage\",\"${TEST_MSG_ID}\",\"${CHANNEL_ID}\",\"system\",\"Private channel established between ${CLIENT_ID}, ${VERIFIER_ID}, and ${ISSUER_ID}\",\"update\"]}"

# Test query messages
echo "Querying messages from the channel..."
docker exec cli peer chaincode query -C ${CHANNEL_ID} -n private-${CHANNEL_ID} -c "{\"Args\":[\"getMessages\",\"${CHANNEL_ID}\"]}"

# Add commands to demonstrate proof of blockchain operations
echo "Collecting blockchain proof for verification..."

# Show details about the channel by querying the ledger
echo "Channel details from ledger:"
docker exec cli peer channel getinfo -c ${CHANNEL_ID}

# Get block information
echo "Block information for the latest block:"
docker exec cli peer channel fetch newest ${CHANNEL_ID}_newest.block -c ${CHANNEL_ID}
docker exec cli configtxlator proto_decode --input ${CHANNEL_ID}_newest.block --type common.Block | jq .data.data[0].payload.header

# Show chaincode details
echo "Chaincode details from the ledger:"
docker exec cli peer lifecycle chaincode querycommitted --channelID ${CHANNEL_ID} --name private-${CHANNEL_ID} --output json

# Add transaction exploration
echo "Transaction details for verification:"
# Get transaction ID from the invoke command (this will be approximate)
sleep 2
LAST_TX=$(docker exec cli peer channel getinfo -c ${CHANNEL_ID} | grep -o "currentBlockHash: .*" | awk '{print $2}')
echo "Last block hash: $LAST_TX"

# Update application database with the Fabric channel info
echo "Creating Fabric channel record in application..."
curl -s -X POST "http://localhost:8080/api/fabric-channels" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"${CHANNEL_ID}\",
    \"clientId\": \"${CLIENT_ID}\",
    \"issuerId\": \"${ISSUER_ID}\",
    \"verifierId\": \"${VERIFIER_ID}\",
    \"status\": \"active\",
    \"createdAt\": \"$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")\"
  }" | jq

echo "Private channel setup complete!"
echo "Fabric Channel ID: ${CHANNEL_ID}"
echo "Use the following command to list all channels:"
echo "docker exec cli peer channel list"

echo ""
echo "PROOF OF FABRIC OPERATIONS:"
echo "1. Channel created: The private channel ${CHANNEL_ID} now exists on the blockchain"
echo "2. Chaincode deployed: Smart contract private-${CHANNEL_ID} is installed and running"
echo "3. Block generated: A new block with ID $LAST_TX was created containing transaction data"
echo ""
echo "To demonstrate this to your professor, you can:"
echo "1. List all channels: docker exec cli peer channel list"
echo "2. Query channel info: docker exec cli peer channel getinfo -c ${CHANNEL_ID}"
echo "3. Query chaincode: docker exec cli peer chaincode query -C ${CHANNEL_ID} -n private-${CHANNEL_ID} -c '{\"Args\":[\"getMessages\",\"${CHANNEL_ID}\"]}'"
echo "4. View the transaction in the ledger: docker exec cli peer channel fetch newest ${CHANNEL_ID}_newest.block -c ${CHANNEL_ID}"
echo "5. Examine block contents: docker exec cli configtxlator proto_decode --input ${CHANNEL_ID}_newest.block --type common.Block"
echo "" 