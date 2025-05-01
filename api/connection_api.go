package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/gorilla/mux"
)

var fabricService *FabricService

func main() {
	// Initialize the Fabric service
	fabricService = NewFabricService()

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

	// Network information endpoint
	router.HandleFunc("/network-info", getNetworkInfo).Methods("GET")

	// Identity management endpoints
	router.HandleFunc("/api/identities", getAllIdentities).Methods("GET")
	router.HandleFunc("/api/identities/{id}", getIdentity).Methods("GET")
	router.HandleFunc("/api/identities", createIdentity).Methods("POST")
	router.HandleFunc("/api/identities/{id}", updateIdentity).Methods("PUT")
	router.HandleFunc("/api/identities/{id}", deleteIdentity).Methods("DELETE")

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
	w.Write([]byte(fmt.Sprintf(`{
		"status": "%s",
		"configExists": %t,
		"tlsCertExists": %t,
		"fabricPeerStatus": "%s"
	}`, response["status"], response["configExists"], response["tlsCertExists"], response["fabricPeerStatus"])))
}

func fabricDiagnostics(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Check Docker containers
	dockerOutput, err := runCommand("docker ps")
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "Failed to run docker ps: %v"}`, err), http.StatusInternalServerError)
		return
	}

	// Parse docker ps output to get container IDs
	var containers []string
	for _, line := range strings.Split(dockerOutput, "\n") {
		if strings.Contains(line, "peer0.org1") || strings.Contains(line, "orderer") {
			containers = append(containers, strings.Fields(line)[0])
		}
	}

	// Get peer logs
	peerLogs := "No peer container found"
	for _, containerID := range containers {
		if strings.Contains(dockerOutput, "peer0.org1") && strings.Contains(containerID, "") {
			logs, err := runCommand(fmt.Sprintf("docker logs --tail 20 %s", containerID))
			if err == nil {
				peerLogs = logs
				break
			}
		}
	}

	// Get orderer logs
	ordererLogs := "No orderer container found"
	for _, containerID := range containers {
		if strings.Contains(dockerOutput, "orderer") && strings.Contains(containerID, "") {
			logs, err := runCommand(fmt.Sprintf("docker logs --tail 20 %s", containerID))
			if err == nil {
				ordererLogs = logs
				break
			}
		}
	}

	// Check Docker network
	networkOutput, err := runCommand("docker network inspect fabric_default")
	networkStatus := "Network check failed"
	if err == nil {
		networkStatus = "Network exists"
	}

	// Return diagnostics information
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(fmt.Sprintf(`{
		"status": "success",
		"dockerContainers": %q,
		"networkStatus": %q,
		"peerLogs": %q,
		"ordererLogs": %q
	}`, dockerOutput, networkStatus, peerLogs, ordererLogs)))
}

func getNetworkInfo(w http.ResponseWriter, r *http.Request) {
	info, err := fabricService.GetNetworkInfo()
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "Failed to get network info: %v"}`, err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(info)
}

func getAllIdentities(w http.ResponseWriter, r *http.Request) {
	identities, err := fabricService.GetAllIdentities()
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "Failed to get identities: %v"}`, err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
		"data": identities,
	})
}

func getIdentity(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	identity, err := fabricService.GetIdentity(id)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "Failed to get identity: %v"}`, err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
		"data": identity,
	})
}

func createIdentity(w http.ResponseWriter, r *http.Request) {
	var requestData struct {
		ID    string `json:"id"`
		Name  string `json:"name"`
		Email string `json:"email"`
		Role  string `json:"role"`
	}

	err := json.NewDecoder(r.Body).Decode(&requestData)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "Invalid request body: %v"}`, err), http.StatusBadRequest)
		return
	}

	result, err := fabricService.CreateIdentity(requestData.ID, requestData.Name, requestData.Email, requestData.Role)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "Failed to create identity: %v"}`, err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(result)
}

func updateIdentity(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var requestData struct {
		Name  string `json:"name"`
		Email string `json:"email"`
		Role  string `json:"role"`
	}

	err := json.NewDecoder(r.Body).Decode(&requestData)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "Invalid request body: %v"}`, err), http.StatusBadRequest)
		return
	}

	result, err := fabricService.UpdateIdentity(id, requestData.Name, requestData.Email, requestData.Role)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "Failed to update identity: %v"}`, err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(result)
}

func deleteIdentity(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	result, err := fabricService.DeleteIdentity(id)
	if err != nil {
		http.Error(w, fmt.Sprintf(`{"error": "Failed to delete identity: %v"}`, err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
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
	_, err := ioutil.ReadFile(path)
	if err != nil {
		if err.Error() == fmt.Sprintf("open %s: no such file or directory", path) {
			return false, nil
		}
		return false, err
	}
	return true, nil
} 