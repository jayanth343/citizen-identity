#!/bin/bash

# Configuration
API_URL="http://localhost:8080/api"
CLIENT_ID="client1"

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

# Get all clients
get_all_clients() {
    print_header "Getting All Clients"
    curl -s "${API_URL}/clients" | jq
}

# Get a specific client
get_client() {
    local id=${1:-$CLIENT_ID}
    print_header "Getting Client with ID: $id"
    curl -s "${API_URL}/clients/$id" | jq
}

# Create a new client
create_client() {
    local id=${1:-$(uuidgen)}
    local name=${2:-"Test Client"}
    local email=${3:-"test@example.com"}
    
    print_header "Creating New Client"
    echo "ID: $id, Name: $name, Email: $email"
    
    curl -s -X POST "${API_URL}/clients" \
        -H "Content-Type: application/json" \
        -d "{\"id\":\"$id\",\"name\":\"$name\",\"email\":\"$email\"}" | jq
    
    echo -e "\n${GREEN}Remember this ID for future operations: $id${NC}"
    echo $id > /tmp/last_client_id.txt
}

# Add an attribute to a client
add_attribute() {
    local client_id=${1:-$CLIENT_ID}
    local name=${2:-"attribute_name"}
    local value=${3:-"attribute_value"}
    local type=${4:-"string"}
    
    print_header "Adding Attribute to Client $client_id"
    echo "Name: $name, Value: $value, Type: $type"
    
    curl -s -X POST "${API_URL}/clients/$client_id/attributes" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"$name\",\"value\":\"$value\",\"type\":\"$type\"}" | jq
}

# Request verification for attributes
request_verification() {
    local client_id=${1:-$CLIENT_ID}
    local requester_org=${2:-"Org2"}
    local attributes=${3:-"[\"name\", \"dateOfBirth\"]"}
    
    print_header "Requesting Verification for Client $client_id"
    echo "Requester Org: $requester_org, Attributes: $attributes"
    
    curl -s -X POST "${API_URL}/clients/$client_id/verify" \
        -H "Content-Type: application/json" \
        -d "{\"requesterOrg\":\"$requester_org\",\"requestedAttributes\":$attributes}" | jq
}

# Add identity for a citizen
create_identity() {
    local citizen_id=${1:-$(uuidgen)}
    local name=${2:-"John Doe"}
    local dob=${3:-"1990-01-01"}
    local nationality=${4:-"US"}
    local address=${5:-"123 Main St, City, Country"}
    
    print_header "Creating Identity for Citizen"
    echo "ID: $citizen_id, Name: $name, DOB: $dob"
    
    curl -s -X POST "${API_URL}/identities" \
        -H "Content-Type: application/json" \
        -d "{
            \"citizenId\":\"$citizen_id\",
            \"name\":\"$name\",
            \"dateOfBirth\":\"$dob\",
            \"nationality\":\"$nationality\",
            \"address\":\"$address\"
        }" | jq
    
    echo -e "\n${GREEN}Remember this Citizen ID for future operations: $citizen_id${NC}"
    echo $citizen_id > /tmp/last_citizen_id.txt
}

# Get identity for a citizen
get_identity() {
    local citizen_id=${1:-$(cat /tmp/last_citizen_id.txt 2>/dev/null || echo "citizen1")}
    
    print_header "Getting Identity for Citizen $citizen_id"
    
    # Use -w to get HTTP status code and -s for silent mode
    local response=$(curl -s -w "\n%{http_code}" "${API_URL}/identities/$citizen_id")
    
    # Extract status code from last line
    local status_code=$(echo "$response" | tail -n1)
    # Extract body (all lines except the last one)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$status_code" -eq 200 ]; then
        # Success - parse JSON response
        echo "$body" | jq '.'
    else
        # Error - show meaningful message
        echo -e "${RED}Error: Failed to get identity (HTTP $status_code)${NC}"
        if [ -n "$body" ]; then
            echo "Response: $body"
        else
            echo "No response received. Please check if the server is running and the citizen ID is correct."
        fi
        return 1
    fi
}

# Upload a document for a citizen
upload_document() {
    local citizen_id=${1:-$(cat /tmp/last_citizen_id.txt 2>/dev/null || echo "citizen1")}
    local doc_path=${2:-"./sample-document.pdf"}
    local doc_type=${3:-"ID"}
    
    if [ ! -f "$doc_path" ]; then
        echo -e "${RED}Error: Document file not found at $doc_path${NC}"
        return 1
    fi
    
    print_header "Uploading Document for Citizen $citizen_id"
    echo "Document: $doc_path, Type: $doc_type"
    
    curl -s -X POST "${API_URL}/documents" \
        -F "citizenId=$citizen_id" \
        -F "documentType=$doc_type" \
        -F "document=@$doc_path" | jq
}

# Request disclosure
request_disclosure() {
    local requester_id=${1:-"verifier1"}
    local citizen_id=${2:-$(cat /tmp/last_citizen_id.txt 2>/dev/null || echo "citizen1")}
    local attributes=${3:-"[\"name\", \"dateOfBirth\"]"}
    local purpose=${4:-"Verification"}
    
    print_header "Requesting Disclosure"
    echo "Requester: $requester_id, Citizen: $citizen_id"
    echo "Attributes: $attributes, Purpose: $purpose"
    
    curl -s -X POST "${API_URL}/disclosure-requests" \
        -H "Content-Type: application/json" \
        -d "{
            \"requesterId\":\"$requester_id\",
            \"citizenId\":\"$citizen_id\",
            \"attributes\":$attributes,
            \"purpose\":\"$purpose\"
        }" | jq
}

# Display help menu
show_help() {
    echo -e "${GREEN}Hyperledger Fabric Identity CLI${NC}"
    echo -e "Usage: $0 [command] [arguments...]"
    echo -e "\nAvailable commands:"
    echo -e "  ${BLUE}health${NC}                        Check server health"
    echo -e "  ${BLUE}clients${NC}                       List all clients"
    echo -e "  ${BLUE}client [id]${NC}                   Get client by ID"
    echo -e "  ${BLUE}create-client [id] [name] [email]${NC}  Create a new client"
    echo -e "  ${BLUE}add-attribute [clientId] [name] [value] [type]${NC}  Add attribute to client"
    echo -e "  ${BLUE}request-verification [clientId] [org] [attributes]${NC}  Request verification"
    echo -e "  ${BLUE}create-identity [id] [name] [dob] [nationality] [address]${NC}  Create identity"
    echo -e "  ${BLUE}get-identity [id]${NC}             Get identity by ID"
    echo -e "  ${BLUE}upload-document [citizenId] [filePath] [docType]${NC}  Upload document"
    echo -e "  ${BLUE}request-disclosure [requesterId] [citizenId] [attributes] [purpose]${NC}  Request disclosure"
}

# Main execution
case "$1" in
    health)
        check_server
        ;;
    clients)
        get_all_clients
        ;;
    client)
        get_client "$2"
        ;;
    create-client)
        create_client "$2" "$3" "$4"
        ;;
    add-attribute)
        add_attribute "$2" "$3" "$4" "$5"
        ;;
    request-verification)
        request_verification "$2" "$3" "$4"
        ;;
    create-identity)
        create_identity "$2" "$3" "$4" "$5" "$6"
        ;;
    get-identity)
        get_identity "$2"
        ;;
    upload-document)
        upload_document "$2" "$3" "$4"
        ;;
    request-disclosure)
        request_disclosure "$2" "$3" "$4" "$5"
        ;;
    *)
        show_help
        ;;
esac 