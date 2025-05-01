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
