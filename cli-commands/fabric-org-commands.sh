#!/bin/bash

# Configuration
API_URL="http://localhost:8080/api"

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print section headers
print_header() {
    echo -e "\n${BLUE}==== $1 ====${NC}\n"
}

# Check if server is running
check_server() {
    print_header "Checking Server Health"
    curl -s "${API_URL}/health" | jq
}

# Get all organizations
get_all_organizations() {
    print_header "Getting All Organizations"
    curl -v "${API_URL}/organizations"
}

# Get a specific organization
get_organization() {
    local id=${1:-"org1"}
    print_header "Getting Organization with ID: $id"
    curl -s "${API_URL}/organizations/$id" | jq
}

# Create a new organization
create_organization() {
    local id=${1:-$(uuidgen)}
    local name=${2:-"Test Organization"}
    local type=${3:-"issuer"} # Can be 'issuer', 'verifier', etc.
    
    print_header "Creating New Organization"
    echo "ID: $id, Name: $name, Type: $type"
    
    curl -s -X POST "${API_URL}/organizations" \
        -H "Content-Type: application/json" \
        -d "{\"id\":\"$id\",\"name\":\"$name\",\"type\":\"$type\"}" | jq
    
    echo -e "\n${GREEN}Remember this Organization ID for future operations: $id${NC}"
    echo $id > /tmp/last_org_id.txt
}

# Create an issuing authority
create_issuer() {
    local id=${1:-$(uuidgen)}
    local name=${2:-"Test Issuer"}
    local organization=${3:-"Org1"}
    
    print_header "Creating New Issuer"
    echo "ID: $id, Name: $name, Organization: $organization"
    
    curl -s -X POST "${API_URL}/issuers" \
        -H "Content-Type: application/json" \
        -d "{\"id\":\"$id\",\"name\":\"$name\",\"organization\":\"$organization\"}" | jq
    
    echo -e "\n${GREEN}Remember this Issuer ID for future operations: $id${NC}"
    echo $id > /tmp/last_issuer_id.txt
}

# Get all issuers
get_all_issuers() {
    print_header "Getting All Issuers"
    curl -s "${API_URL}/issuers" | jq
}

# Get a specific issuer
get_issuer() {
    local id=${1:-$(cat /tmp/last_issuer_id.txt 2>/dev/null || echo "issuer1")}
    print_header "Getting Issuer with ID: $id"
    curl -s "${API_URL}/issuers/$id" | jq
}

# Create a verification organization
create_verifier() {
    local id=${1:-$(uuidgen)}
    local name=${2:-"Test Verifier"}
    local organization=${3:-"Org2"}
    
    print_header "Creating New Verifier"
    echo "ID: $id, Name: $name, Organization: $organization"
    
    curl -s -X POST "${API_URL}/verifiers" \
        -H "Content-Type: application/json" \
        -d "{\"id\":\"$id\",\"name\":\"$name\",\"organization\":\"$organization\"}" | jq
    
    echo -e "\n${GREEN}Remember this Verifier ID for future operations: $id${NC}"
    echo $id > /tmp/last_verifier_id.txt
}

# Get all verifiers
get_all_verifiers() {
    print_header "Getting All Verifiers"
    curl -s "${API_URL}/verifiers" | jq
}

# Get a specific verifier
get_verifier() {
    local id=${1:-$(cat /tmp/last_verifier_id.txt 2>/dev/null || echo "verifier1")}
    print_header "Getting Verifier with ID: $id"
    curl -s "${API_URL}/verifiers/$id" | jq
}

# Display help menu
show_help() {
    echo -e "${GREEN}Hyperledger Fabric Organization CLI${NC}"
    echo -e "Usage: $0 [command] [arguments...]"
    echo -e "\nAvailable commands:"
    echo -e "  ${BLUE}health${NC}                        Check server health"
    echo -e "  ${BLUE}organizations${NC}                 List all organizations"
    echo -e "  ${BLUE}organization [id]${NC}             Get organization by ID"
    echo -e "  ${BLUE}create-organization [id] [name] [type]${NC}  Create a new organization"
    echo -e "  ${BLUE}issuers${NC}                       List all issuers"
    echo -e "  ${BLUE}issuer [id]${NC}                   Get issuer by ID" 
    echo -e "  ${BLUE}create-issuer [id] [name] [organization]${NC}  Create a new issuer"
    echo -e "  ${BLUE}verifiers${NC}                     List all verifiers"
    echo -e "  ${BLUE}verifier [id]${NC}                 Get verifier by ID"
    echo -e "  ${BLUE}create-verifier [id] [name] [organization]${NC}  Create a new verifier"
}

# Main execution
case "$1" in
    health)
        check_server
        ;;
    organizations)
        get_all_organizations
        ;;
    organization)
        get_organization "$2"
        ;;
    create-organization)
        create_organization "$2" "$3" "$4"
        ;;
    issuers)
        get_all_issuers
        ;;
    issuer)
        get_issuer "$2"
        ;;
    create-issuer)
        create_issuer "$2" "$3" "$4"
        ;;
    verifiers)
        get_all_verifiers
        ;;
    verifier)
        get_verifier "$2"
        ;;
    create-verifier)
        create_verifier "$2" "$3" "$4"
        ;;
    *)
        show_help
        ;;
esac 