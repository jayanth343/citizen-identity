package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SmartContract provides functions for managing identities
type SmartContract struct {
	contractapi.Contract
}

// Identity describes basic details of an identity
type Identity struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// InitLedger adds a base set of identities to the ledger
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	identities := []Identity{
		{
			ID:        "identity1",
			Name:      "John Doe",
			Email:     "john@example.com",
			Role:      "admin",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			ID:        "identity2",
			Name:      "Jane Smith",
			Email:     "jane@example.com",
			Role:      "user",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
	}

	for _, identity := range identities {
		identityJSON, err := json.Marshal(identity)
		if err != nil {
			return fmt.Errorf("failed to marshal identity: %v", err)
		}

		err = ctx.GetStub().PutState(identity.ID, identityJSON)
		if err != nil {
			return fmt.Errorf("failed to put identity to world state: %v", err)
		}
	}

	return nil
}

// CreateIdentity adds a new identity to the world state with given details
func (s *SmartContract) CreateIdentity(ctx contractapi.TransactionContextInterface, id, name, email, role string) error {
	exists, err := s.IdentityExists(ctx, id)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("the identity %s already exists", id)
	}

	identity := Identity{
		ID:        id,
		Name:      name,
		Email:     email,
		Role:      role,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	identityJSON, err := json.Marshal(identity)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, identityJSON)
}

// QueryIdentity returns the identity stored in the world state with given id
func (s *SmartContract) QueryIdentity(ctx contractapi.TransactionContextInterface, id string) (*Identity, error) {
	identityJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if identityJSON == nil {
		return nil, fmt.Errorf("the identity %s does not exist", id)
	}

	var identity Identity
	err = json.Unmarshal(identityJSON, &identity)
	if err != nil {
		return nil, err
	}

	return &identity, nil
}

// QueryAllIdentities returns all identities found in world state
func (s *SmartContract) QueryAllIdentities(ctx contractapi.TransactionContextInterface) ([]*Identity, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var identities []*Identity
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var identity Identity
		err = json.Unmarshal(queryResponse.Value, &identity)
		if err != nil {
			return nil, err
		}
		identities = append(identities, &identity)
	}

	return identities, nil
}

// UpdateIdentity updates an existing identity in the world state with provided parameters
func (s *SmartContract) UpdateIdentity(ctx contractapi.TransactionContextInterface, id, name, email, role string) error {
	exists, err := s.IdentityExists(ctx, id)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("the identity %s does not exist", id)
	}

	// Get the current identity to preserve creation time
	identityJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return fmt.Errorf("failed to read from world state: %v", err)
	}

	var identity Identity
	err = json.Unmarshal(identityJSON, &identity)
	if err != nil {
		return err
	}

	// Update the identity with new values
	identity.Name = name
	identity.Email = email
	identity.Role = role
	identity.UpdatedAt = time.Now()

	updatedIdentityJSON, err := json.Marshal(identity)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, updatedIdentityJSON)
}

// DeleteIdentity deletes a given identity from the world state
func (s *SmartContract) DeleteIdentity(ctx contractapi.TransactionContextInterface, id string) error {
	exists, err := s.IdentityExists(ctx, id)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("the identity %s does not exist", id)
	}

	return ctx.GetStub().DelState(id)
}

// IdentityExists returns true when identity with given ID exists in world state
func (s *SmartContract) IdentityExists(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
	identityJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}

	return identityJSON != nil, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&SmartContract{})
	if err != nil {
		fmt.Printf("Error creating identity chaincode: %v\n", err)
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting identity chaincode: %v\n", err)
	}
} 