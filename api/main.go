package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/hyperledger/fabric-gateway/pkg/client"
	"github.com/hyperledger/fabric-gateway/pkg/identity"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type IdentityAttribute struct {
	Name        string `json:"name"`
	Value       string `json:"value"`
	IsSensitive bool   `json:"isSensitive"`
}

type Client struct {
	ID                   string             `json:"id"`
	Name                 string             `json:"name"`
	Organization         string             `json:"organization"`
	Attributes          []IdentityAttribute `json:"attributes"`
	VerificationRequests []VerificationRequest `json:"verificationRequests"`
}

type VerificationRequest struct {
	ID                 string   `json:"id"`
	RequesterOrg       string   `json:"requesterOrg"`
	ClientID           string   `json:"clientId"`
	RequestedAttributes []string `json:"requestedAttributes"`
	Status             string   `json:"status"`
	Timestamp          string   `json:"timestamp"`
}

var (
	gateway *client.Gateway
)

func main() {
	// Connect to Fabric network
	conn, err := grpc.Dial("localhost:7051", grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("Failed to connect to gateway: %v", err)
	}
	defer conn.Close()

	id, err := identity.NewX509Identity("Org1MSP", "cert.pem", "key.pem")
	if err != nil {
		log.Fatalf("Failed to create identity: %v", err)
	}

	sign, err := identity.NewPrivateKeySign("key.pem")
	if err != nil {
		log.Fatalf("Failed to create signer: %v", err)
	}

	gateway, err = client.Connect(id, client.WithSign(sign), client.WithClientConnection(conn))
	if err != nil {
		log.Fatalf("Failed to connect to gateway: %v", err)
	}
	defer gateway.Close()

	// Create router
	router := mux.NewRouter()

	// Client endpoints
	router.HandleFunc("/api/clients", createClient).Methods("POST")
	router.HandleFunc("/api/clients/{id}", getClient).Methods("GET")
	router.HandleFunc("/api/clients", getAllClients).Methods("GET")
	router.HandleFunc("/api/clients/{id}/attributes", addAttribute).Methods("POST")
	router.HandleFunc("/api/clients/{id}/verify", requestVerification).Methods("POST")
	router.HandleFunc("/api/clients/{id}/verify/{requestId}", respondToVerification).Methods("POST")

	// Start server
	log.Println("Starting API server on :8080")
	log.Fatal(http.ListenAndServe(":8080", router))
}

func createClient(w http.ResponseWriter, r *http.Request) {
	var client Client
	if err := json.NewDecoder(r.Body).Decode(&client); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	network := gateway.GetNetwork("mychannel")
	contract := network.GetContract("identity")

	_, err := contract.SubmitTransaction(
		"CreateClient",
		client.ID,
		client.Name,
		client.Organization,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func getClient(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	clientID := vars["id"]

	network := gateway.GetNetwork("mychannel")
	contract := network.GetContract("identity")

	result, err := contract.EvaluateTransaction("GetClient", clientID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var client Client
	if err := json.Unmarshal(result, &client); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(client)
}

func getAllClients(w http.ResponseWriter, r *http.Request) {
	network := gateway.GetNetwork("mychannel")
	contract := network.GetContract("identity")

	result, err := contract.EvaluateTransaction("GetAllClients")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var clients []Client
	if err := json.Unmarshal(result, &clients); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(clients)
}

func addAttribute(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	clientID := vars["id"]

	var attribute IdentityAttribute
	if err := json.NewDecoder(r.Body).Decode(&attribute); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	network := gateway.GetNetwork("mychannel")
	contract := network.GetContract("identity")

	_, err := contract.SubmitTransaction(
		"AddAttribute",
		clientID,
		attribute.Name,
		attribute.Value,
		fmt.Sprintf("%v", attribute.IsSensitive),
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func requestVerification(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	clientID := vars["id"]

	var request struct {
		RequesterOrg       string   `json:"requesterOrg"`
		RequestedAttributes []string `json:"requestedAttributes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	network := gateway.GetNetwork("mychannel")
	contract := network.GetContract("identity")

	_, err := contract.SubmitTransaction(
		"RequestVerification",
		clientID,
		request.RequesterOrg,
		request.RequestedAttributes...,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func respondToVerification(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	clientID := vars["id"]
	requestID := vars["requestId"]

	var request struct {
		Approved bool `json:"approved"`
	}
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	network := gateway.GetNetwork("mychannel")
	contract := network.GetContract("identity")

	_, err := contract.SubmitTransaction(
		"RespondToVerification",
		clientID,
		requestID,
		fmt.Sprintf("%v", request.Approved),
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
} 