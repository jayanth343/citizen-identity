package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/gorilla/mux"
)

func main() {
	// Create router
	router := mux.NewRouter()

	// Health check endpoint
	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	}).Methods("GET")

	// Basic Fabric connection test endpoint
	router.HandleFunc("/test-connection", testFabricConnection).Methods("GET")

	// Detailed Docker diagnostics endpoint
	router.HandleFunc("/fabric-diagnostics", fabricDiagnostics).Methods("GET")

	// Start server
	log.Println("Starting API server on :8080")
	log.Fatal(http.ListenAndServe(":8080", router))
}

func testFabricConnection(w http.ResponseWriter, r *http.Request) {
	// Try to read connection config
	configPath := "connection.json"
	exists, err := fileExists(configPath)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error checking config file: %v", err), http.StatusInternalServerError)
		return
	}

	if !exists {
		http.Error(w, "Connection configuration file not found", http.StatusNotFound)
		return
	}

	// Try to read crypto material
	tlsCertPath := filepath.Join("..", "crypto-config", "peerOrganizations", "org1.example.com", "peers", "peer0.org1.example.com", "tls", "ca.crt")
	tlsCertExists, err := fileExists(tlsCertPath)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error checking TLS cert: %v", err), http.StatusInternalServerError)
		return
	}

	// Report status
	response := map[string]interface{}{
		"status":           "success",
		"configExists":     exists,
		"tlsCertExists":    tlsCertExists,
		"fabricPeerStatus": "available",
	}

	// Try to connect to the peer using the Docker host name
	peerURL := "http://peer0.org1.example.com:7051"
	resp, err := http.Get(peerURL)
	if err != nil {
		response["fabricPeerStatus"] = fmt.Sprintf("unreachable: %v", err)
	} else {
		defer resp.Body.Close()
		response["fabricPeerStatus"] = fmt.Sprintf("reachable, status: %d", resp.StatusCode)
	}

	// Return response as JSON
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func fabricDiagnostics(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Check if configuration exists
	configPath := "connection.json"
	configExists, _ := fileExists(configPath)

	// Check if TLS certificates exist
	tlsPath := filepath.Join("..", "crypto-config", "peerOrganizations", "org1.example.com", "peers", "peer0.org1.example.com", "tls", "ca.crt")
	tlsCertExists, _ := fileExists(tlsPath)

	// Check Docker containers
	dockerOutput, err := runCommand("docker ps")
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "Failed to run docker ps: %v"}`, err), http.StatusInternalServerError)
		return
	}

	// Get peer logs
	peerLogs := "No peer container found"
	if strings.Contains(dockerOutput, "peer0.org1") {
		logs, err := runCommand("docker logs --tail 20 $(docker ps -q --filter name=peer0.org1)")
		if err == nil {
			peerLogs = logs
		}
	}

	// Get orderer logs
	ordererLogs := "No orderer container found"
	if strings.Contains(dockerOutput, "orderer") {
		logs, err := runCommand("docker logs --tail 20 $(docker ps -q --filter name=orderer)")
		if err == nil {
			ordererLogs = logs
		}
	}

	// Check Docker network
	networkOutput, err := runCommand("docker network inspect fabric_default")
	networkStatus := "Network check failed"
	if err == nil {
		networkStatus = networkOutput
	}

	// Return diagnostics information
	result := map[string]interface{}{
		"status":        "success",
		"configExists":  configExists,
		"tlsCertExists": tlsCertExists,
		"dockerContainers": dockerOutput,
		"peerLogs":      peerLogs,
		"ordererLogs":   ordererLogs,
		"dockerNetwork": networkStatus,
		"timestamp":     fmt.Sprintf("%d", 32472834),
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(result)
}

func runCommand(command string) (string, error) {
	parts := strings.Fields(command)
	cmd := exec.Command(parts[0], parts[1:]...)
	output, err := cmd.CombinedOutput()
	return string(output), err
}

func fileExists(path string) (bool, error) {
	_, err := os.Stat(path)
	if err != nil {
		if os.IsNotExist(err) {
			return false, nil
		}
		return false, err
	}
	return true, nil
} 