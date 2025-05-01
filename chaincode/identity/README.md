# Identity Management Chaincode

A simple Hyperledger Fabric chaincode for managing digital identities in a blockchain network.

## Features

- Create, read, update, and delete identity records
- Query all identities in the ledger
- Check if an identity exists

## Data Model

The chaincode uses the following data structure for identities:

```go
type Identity struct {
    ID        string    `json:"id"`
    Name      string    `json:"name"`
    Email     string    `json:"email"`
    Role      string    `json:"role"`
    CreatedAt time.Time `json:"createdAt"`
    UpdatedAt time.Time `json:"updatedAt"`
}
```

## Functions

The chaincode provides the following functions:

- `InitLedger`: Initializes the ledger with sample identities
- `CreateIdentity`: Creates a new identity
- `QueryIdentity`: Retrieves an identity by its ID
- `QueryAllIdentities`: Retrieves all identities from the ledger
- `UpdateIdentity`: Updates an existing identity
- `DeleteIdentity`: Deletes an identity from the ledger
- `IdentityExists`: Checks if an identity exists

## Installation

To install the chaincode:

```bash
# From the fabric directory
./network.sh deployCC -ccn identity -ccp ../chaincode/identity -ccl go
```

## Interacting with the Chaincode

### Creating an Identity

```bash
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA -C mychannel -n identity --peerAddresses localhost:7051 --tlsRootCertFiles $PEER0_ORG1_CA --peerAddresses localhost:9051 --tlsRootCertFiles $PEER0_ORG2_CA -c '{"function":"CreateIdentity","Args":["id3", "Bob Johnson", "bob@example.com", "developer"]}'
```

### Querying an Identity

```bash
peer chaincode query -C mychannel -n identity -c '{"function":"QueryIdentity","Args":["id3"]}'
```

### Querying All Identities

```bash
peer chaincode query -C mychannel -n identity -c '{"function":"QueryAllIdentities","Args":[]}'
```

### Updating an Identity

```bash
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA -C mychannel -n identity --peerAddresses localhost:7051 --tlsRootCertFiles $PEER0_ORG1_CA --peerAddresses localhost:9051 --tlsRootCertFiles $PEER0_ORG2_CA -c '{"function":"UpdateIdentity","Args":["id3", "Bob Smith", "bob.smith@example.com", "senior-developer"]}'
```

### Deleting an Identity

```bash
peer chaincode invoke -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $ORDERER_CA -C mychannel -n identity --peerAddresses localhost:7051 --tlsRootCertFiles $PEER0_ORG1_CA --peerAddresses localhost:9051 --tlsRootCertFiles $PEER0_ORG2_CA -c '{"function":"DeleteIdentity","Args":["id3"]}'
``` 