package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// Identity represents a digital identity in the Fabric network
type Identity struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// FabricService provides functions to interact with the Fabric network
type FabricService struct {
	ConfigPath   string
	PeerAddress  string
	OrgName      string
	ChaincodeName string
	ChannelName  string
}

// NewFabricService creates a new instance of the Fabric service
func NewFabricService() *FabricService {
	return &FabricService{
		ConfigPath:    "connection.json",
		PeerAddress:   "peer0.org1.example.com:7051",
		OrgName:       "Org1",
		ChaincodeName: "identity",
		ChannelName:   "mychannel",
	}
}

// CheckConnection checks if the Fabric network is available
func (s *FabricService) CheckConnection() bool {
	// Check if configuration exists
	configExists, _ := fileExists(s.ConfigPath)
	if !configExists {
		return false
	}

	// Check if TLS certificates exist
	tlsPath := filepath.Join("..", "crypto-config", "peerOrganizations", "org1.example.com", "peers", "peer0.org1.example.com", "tls", "ca.crt")
	tlsExists, _ := fileExists(tlsPath)
	if !tlsExists {
		return false
	}

	// Check Docker containers
	cmd := exec.Command("docker", "ps", "--filter", "name=peer0.org1.example.com", "--format", "{{.Names}}")
	output, err := cmd.CombinedOutput()
	if err != nil || !strings.Contains(string(output), "peer0.org1.example.com") {
		return false
	}

	return true
}

// GetNetworkInfo returns detailed information about the Fabric network
func (s *FabricService) GetNetworkInfo() (map[string]interface{}, error) {
	info := make(map[string]interface{})

	// Check configuration
	configExists, _ := fileExists(s.ConfigPath)
	info["configExists"] = configExists

	if configExists {
		configData, err := ioutil.ReadFile(s.ConfigPath)
		if err == nil {
			var configJson map[string]interface{}
			json.Unmarshal(configData, &configJson)
			info["config"] = configJson
		}
	}

	// Check Docker containers
	cmd := exec.Command("docker", "ps", "--filter", "name=peer0", "--filter", "name=orderer", "--format", "{{.Names}}")
	output, err := cmd.CombinedOutput()
	if err == nil {
		containers := strings.Split(strings.TrimSpace(string(output)), "\n")
		info["containers"] = containers
	}

	// Check channel info if we can access it
	if s.CheckConnection() {
		// This is a placeholder for actual channel info
		// In a real implementation, you would use the Fabric SDK to query channel info
		info["channelInfo"] = map[string]interface{}{
			"name":      s.ChannelName,
			"chaincodes": []string{s.ChaincodeName},
		}
	}

	return info, nil
}

// CreateIdentity creates a new identity in the Fabric network
func (s *FabricService) CreateIdentity(id, name, email, role string) (map[string]interface{}, error) {
	if !s.CheckConnection() {
		return nil, fmt.Errorf("fabric network not available")
	}

	// This is a mock implementation
	// In production, you would use the Fabric SDK to invoke the chaincode
	identity := Identity{
		ID:        id,
		Name:      name,
		Email:     email,
		Role:      role,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	result := map[string]interface{}{
		"success": true,
		"identity": identity,
		"txId": fmt.Sprintf("tx_%d", time.Now().UnixNano()),
	}

	return result, nil
}

// GetIdentity retrieves an identity from the Fabric network
func (s *FabricService) GetIdentity(id string) (*Identity, error) {
	if !s.CheckConnection() {
		return nil, fmt.Errorf("fabric network not available")
	}

	// This is a mock implementation
	// In production, you would use the Fabric SDK to query the chaincode
	identity := &Identity{
		ID:        id,
		Name:      "Sample User",
		Email:     "sample@example.com",
		Role:      "user",
		CreatedAt: time.Now().Add(-24 * time.Hour),
		UpdatedAt: time.Now(),
	}

	return identity, nil
}

// GetAllIdentities retrieves all identities from the Fabric network
func (s *FabricService) GetAllIdentities() ([]Identity, error) {
	if !s.CheckConnection() {
		return nil, fmt.Errorf("fabric network not available")
	}

	// This is a mock implementation
	// In production, you would use the Fabric SDK to query the chaincode
	identities := []Identity{
		{
			ID:        "id1",
			Name:      "User 1",
			Email:     "user1@example.com",
			Role:      "admin",
			CreatedAt: time.Now().Add(-48 * time.Hour),
			UpdatedAt: time.Now().Add(-24 * time.Hour),
		},
		{
			ID:        "id2",
			Name:      "User 2",
			Email:     "user2@example.com",
			Role:      "user",
			CreatedAt: time.Now().Add(-24 * time.Hour),
			UpdatedAt: time.Now(),
		},
	}

	return identities, nil
}

// UpdateIdentity updates an existing identity in the Fabric network
func (s *FabricService) UpdateIdentity(id, name, email, role string) (map[string]interface{}, error) {
	if !s.CheckConnection() {
		return nil, fmt.Errorf("fabric network not available")
	}

	// Check if the identity exists first
	_, err := s.GetIdentity(id)
	if err != nil {
		return nil, fmt.Errorf("identity not found: %v", err)
	}

	// This is a mock implementation
	// In production, you would use the Fabric SDK to invoke the chaincode
	identity := Identity{
		ID:        id,
		Name:      name,
		Email:     email,
		Role:      role,
		CreatedAt: time.Now().Add(-24 * time.Hour),
		UpdatedAt: time.Now(),
	}

	result := map[string]interface{}{
		"success": true,
		"identity": identity,
		"txId": fmt.Sprintf("tx_%d", time.Now().UnixNano()),
	}

	return result, nil
}

// DeleteIdentity deletes an identity from the Fabric network
func (s *FabricService) DeleteIdentity(id string) (map[string]interface{}, error) {
	if !s.CheckConnection() {
		return nil, fmt.Errorf("fabric network not available")
	}

	// Check if the identity exists first
	_, err := s.GetIdentity(id)
	if err != nil {
		return nil, fmt.Errorf("identity not found: %v", err)
	}

	// This is a mock implementation
	// In production, you would use the Fabric SDK to invoke the chaincode
	result := map[string]interface{}{
		"success": true,
		"id": id,
		"txId": fmt.Sprintf("tx_%d", time.Now().UnixNano()),
	}

	return result, nil
}

// Helper function to check if a file exists
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