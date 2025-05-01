import { Gateway, Wallets } from 'fabric-network';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the connection profile
const connectionProfilePath = path.resolve(__dirname, '../../..', 'crypto-config', 'connection-org1.json');

class FabricService {
  constructor() {
    this.gateway = null;
    this.network = null;
    this.isConnected = false;
    this.chaincodeMap = {
      'identity': 'CitizenIdentity',
      'access': 'AccessControl',
      'disclosure': 'DisclosureManager',
      'document': 'DocumentRegistry',
      'organization': 'OrganizationManager'
    };

    // Organization Management
    // Mock data for organizations until chaincode is installed
    this.mockOrganizations = [
      {
        id: 'org1',
        name: 'Organization 1',
        type: 'issuer',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'org2',
        name: 'Organization 2',
        type: 'verifier',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    this.mockIssuers = [
      {
        id: 'issuer1',
        name: 'Issuer 1',
        organization: 'org1',
        issuedCredentials: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    this.mockVerifiers = [
      {
        id: 'verifier1',
        name: 'Verifier 1',
        organization: 'org2',
        verificationRequests: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    this.mockClients = [
      {
        id: 'client1',
        name: 'Test Client',
        email: 'client@example.com',
        organization: 'org1',
        attributes: [
          {
            name: 'name',
            value: 'Test Client',
            isSensitive: false
          },
          {
            name: 'dateOfBirth',
            value: '1990-01-01',
            isSensitive: true
          }
        ],
        verificationRequests: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }

  async connect(userId) {
    try {
      // Load the connection profile
      const connectionProfile = JSON.parse(fs.readFileSync(connectionProfilePath, 'utf8'));
      const walletPath = path.join(process.cwd(), 'wallet');
      const wallet = await Wallets.newFileSystemWallet(walletPath);
      
      // Check if user exists in wallet
      const identity = await wallet.get(userId);
      if (!identity) {
        throw new Error(`Identity for user ${userId} not found in the wallet`);
      }

      // Create a new gateway for connecting to the peer
      this.gateway = new Gateway();
      await this.gateway.connect(connectionProfile, {
        wallet,
        identity: userId,
        discovery: { enabled: true, asLocalhost: true }
      });

      // Get the network
      this.network = await this.gateway.getNetwork('mychannel');
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error(`Failed to connect to the Fabric network: ${error}`);
      this.isConnected = false;
      return false;
    }
  }

  async disconnect() {
    if (this.gateway) {
      await this.gateway.disconnect();
      this.gateway = null;
      this.network = null;
      this.isConnected = false;
    }
  }

  async submitTransaction(contractType, functionName, ...args) {
    try {
      if (!this.isConnected) {
        throw new Error('Not connected to the Fabric network');
      }

      const contractName = this.chaincodeMap[contractType];
      if (!contractName) {
        throw new Error(`Invalid contract type: ${contractType}`);
      }

      const contract = this.network.getContract('citizen-identity', contractName);
      const result = await contract.submitTransaction(functionName, ...args);
      return JSON.parse(result.toString());
    } catch (error) {
      console.error(`Failed to submit transaction: ${error}`);
      throw error;
    }
  }

  async evaluateTransaction(contractType, functionName, ...args) {
    try {
      if (!this.isConnected) {
        throw new Error('Not connected to the Fabric network');
      }

      const contractName = this.chaincodeMap[contractType];
      if (!contractName) {
        throw new Error(`Invalid contract type: ${contractType}`);
      }

      const contract = this.network.getContract('citizen-identity', contractName);
      const result = await contract.evaluateTransaction(functionName, ...args);
      return JSON.parse(result.toString());
    } catch (error) {
      console.error(`Failed to evaluate transaction: ${error}`);
      throw error;
    }
  }

  // Identity Management
  async createIdentity(citizenId, name, dateOfBirth, nationality, address) {
    return this.submitTransaction('identity', 'CreateIdentity', citizenId, name, dateOfBirth, nationality, address);
  }

  async getIdentity(citizenId) {
    return this.evaluateTransaction('identity', 'GetIdentity', citizenId);
  }

  async updateIdentity(citizenId, name, dateOfBirth, nationality, address) {
    return this.submitTransaction('identity', 'UpdateIdentity', citizenId, name, dateOfBirth, nationality, address);
  }

  async addDocument(citizenId, documentId, documentType, documentHash) {
    return this.submitTransaction('identity', 'AddDocument', citizenId, documentId, documentType, documentHash);
  }

  async getDocuments(citizenId) {
    return this.evaluateTransaction('identity', 'GetDocuments', citizenId);
  }

  // Client Management
  async createClient(clientData) {
    try {
      if (this.isConnected) {
        return this.submitTransaction('identity', 'CreateClient', 
          clientData.id,
          clientData.name,
          clientData.email,
          clientData.organization || '',
          clientData.phone || ''
        );
      } else {
        console.log(`Mock: Creating client ${clientData.id}`);
        
        // Check if client already exists
        if (this.mockClients.some(c => c.id === clientData.id)) {
          throw new Error(`Client with ID ${clientData.id} already exists`);
        }
        
        const newClient = {
          ...clientData,
          attributes: [],
          verificationRequests: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        this.mockClients.push(newClient);
        return newClient;
      }
    } catch (error) {
      console.error('Error in createClient:', error);
      throw new Error('Failed to create client');
    }
  }

  async getClient(clientId) {
    try {
      if (this.isConnected) {
        return this.evaluateTransaction('identity', 'GetClient', clientId);
      } else {
        console.log(`Mock: Getting client ${clientId}`);
        
        const client = this.mockClients.find(c => c.id === clientId);
        if (!client) {
          throw new Error(`Client ${clientId} not found`);
        }
        
        return client;
      }
    } catch (error) {
      console.error('Error in getClient:', error);
      throw new Error('Failed to get client');
    }
  }

  async getAllClients() {
    try {
      if (this.isConnected) {
        return this.evaluateTransaction('identity', 'GetAllClients');
      } else {
        console.log('Mock: Getting all clients');
        return this.mockClients;
      }
    } catch (error) {
      console.error('Error in getAllClients:', error);
      throw new Error('Failed to get all clients');
    }
  }

  async addAttribute(clientId, name, value, issuer) {
    try {
      if (this.isConnected) {
        return this.submitTransaction('identity', 'AddAttribute', clientId, name, value, issuer);
      } else {
        console.log(`Mock: Adding attribute ${name} to client ${clientId}`);
        
        const client = this.mockClients.find(c => c.id === clientId);
        if (!client) {
          throw new Error(`Client ${clientId} not found`);
        }
        
        const attribute = {
          name,
          value,
          issuer: issuer || 'self',
          isSensitive: false,
          createdAt: new Date().toISOString()
        };
        
        if (!client.attributes) {
          client.attributes = [];
        }
        
        client.attributes.push(attribute);
        client.updatedAt = new Date().toISOString();
        
        return client;
      }
    } catch (error) {
      console.error('Error in addAttribute:', error);
      throw new Error('Failed to add attribute');
    }
  }

  // Access Control
  async createRole(roleId, roleName, permissions) {
    return this.submitTransaction('access', 'CreateRole', roleId, roleName, JSON.stringify(permissions));
  }

  async assignRole(userId, roleId) {
    return this.submitTransaction('access', 'AssignRole', userId, roleId);
  }

  async revokeRole(userId, roleId) {
    return this.submitTransaction('access', 'RevokeRole', userId, roleId);
  }

  async checkPermission(userId, permission) {
    const result = await this.evaluateTransaction('access', 'CheckPermission', userId, permission);
    return result === 'true';
  }

  async getUserRoles(userId) {
    return this.evaluateTransaction('access', 'GetUserRoles', userId);
  }

  // Disclosure Management
  async requestDisclosure(requestId, requesterId, citizenId, attributes, purpose) {
    return this.submitTransaction('disclosure', 'RequestDisclosure', requestId, requesterId, citizenId, JSON.stringify(attributes), purpose);
  }

  async approveDisclosure(requestId, citizenId) {
    return this.submitTransaction('disclosure', 'ApproveDisclosure', requestId, citizenId);
  }

  async rejectDisclosure(requestId, citizenId) {
    return this.submitTransaction('disclosure', 'RejectDisclosure', requestId, citizenId);
  }

  async getDisclosureRequest(requestId) {
    return this.evaluateTransaction('disclosure', 'GetDisclosureRequest', requestId);
  }

  async getPendingRequests(citizenId) {
    return this.evaluateTransaction('disclosure', 'GetPendingRequests', citizenId);
  }

  async getRequestHistory(citizenId) {
    return this.evaluateTransaction('disclosure', 'GetRequestHistory', citizenId);
  }

  // Verification Methods
  async requestVerification(clientId, attributeIds, verifierId) {
    try {
      if (this.isConnected) {
        return this.submitTransaction('identity', 'RequestVerification', clientId, JSON.stringify(attributeIds), verifierId);
      } else {
        console.log(`Mock: Creating verification request for client ${clientId}`);
        
        // Generate a unique ID for the request
        const requestId = `req_${Date.now()}`;
        
        // Find the client and verifier in mock data
        const mockClients = this.mockClients || [];
        const client = mockClients.find(c => c.id === clientId);
        const verifier = this.mockVerifiers.find(v => v.id === verifierId);
        
        if (!client) {
          throw new Error(`Client ${clientId} not found`);
        }
        
        if (!verifier) {
          throw new Error(`Verifier ${verifierId} not found`);
        }
        
        // Create the request
        const request = {
          id: requestId,
          clientId,
          requesterOrg: verifier.name,
          requestedAttributes: attributeIds,
          status: 'pending',
          timestamp: new Date().toISOString()
        };
        
        // Add to client's verification requests
        if (!client.verificationRequests) {
          client.verificationRequests = [];
        }
        client.verificationRequests.push(request);
        
        // Add to verifier's verification requests
        if (!verifier.verificationRequests) {
          verifier.verificationRequests = [];
        }
        verifier.verificationRequests.push({...request});
        
        return request;
      }
    } catch (error) {
      console.error('Error in requestVerification:', error);
      throw new Error('Failed to request verification');
    }
  }

  async respondToVerification(requestId, approved, notes) {
    try {
      if (this.isConnected) {
        return this.submitTransaction('identity', 'RespondToVerification', requestId, approved.toString(), notes || '');
      } else {
        console.log(`Mock: Responding to verification request ${requestId}`);
        
        // Find the request in mock clients
        const mockClients = this.mockClients || [];
        let foundRequest = null;
        let foundClient = null;
        
        for (const client of mockClients) {
          if (client.verificationRequests) {
            const request = client.verificationRequests.find(r => r.id === requestId);
            if (request) {
              foundRequest = request;
              foundClient = client;
              
              // Update the request status
              request.status = approved ? 'verified' : 'rejected';
              request.notes = notes;
              request.updatedAt = new Date().toISOString();
              break;
            }
          }
        }
        
        if (!foundRequest) {
          throw new Error(`Verification request ${requestId} not found`);
        }
        
        // Update the request in the verifier's list
        const verifier = this.mockVerifiers.find(v => v.name === foundRequest.requesterOrg);
        if (verifier && verifier.verificationRequests) {
          const verifierRequest = verifier.verificationRequests.find(r => r.id === requestId);
          if (verifierRequest) {
            verifierRequest.status = approved ? 'verified' : 'rejected';
            verifierRequest.notes = notes;
            verifierRequest.updatedAt = new Date().toISOString();
          }
        }
        
        return foundRequest;
      }
    } catch (error) {
      console.error('Error in respondToVerification:', error);
      throw new Error('Failed to respond to verification');
    }
  }

  // Document Registry
  async registerDocument(documentId, documentType, documentHash, ownerId, metadata) {
    return this.submitTransaction('document', 'RegisterDocument', documentId, documentType, documentHash, ownerId, JSON.stringify(metadata));
  }

  async getDocument(documentId) {
    return this.evaluateTransaction('document', 'GetDocument', documentId);
  }

  async verifyDocument(documentId, verifierId, verificationResult) {
    return this.submitTransaction('document', 'VerifyDocument', documentId, verifierId, verificationResult);
  }

  async getDocumentsByOwner(ownerId) {
    return this.evaluateTransaction('document', 'GetDocumentsByOwner', ownerId);
  }

  async getVerifiedDocuments() {
    return this.evaluateTransaction('document', 'GetVerifiedDocuments');
  }

  // Organization Management
  async createOrganization(orgId, name, type) {
    try {
      console.log(`Mock: Creating organization ${orgId}`);
      const newOrg = {
        id: orgId,
        name,
        type,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.mockOrganizations.push(newOrg);
      return newOrg;
    } catch (error) {
      console.error('Error in createOrganization:', error);
      throw new Error('Failed to create organization');
    }
  }

  async getOrganization(orgId) {
    try {
      console.log(`Mock: Getting organization ${orgId}`);
      return this.mockOrganizations.find(org => org.id === orgId);
    } catch (error) {
      console.error('Error in getOrganization:', error);
      throw new Error('Failed to get organization');
    }
  }

  async getAllOrganizations() {
    try {
      console.log('Mock: Getting all organizations');
      return this.mockOrganizations;
    } catch (error) {
      console.error('Error in getAllOrganizations:', error);
      throw new Error('Failed to get all organizations');
    }
  }

  async createIssuer(issuerId, name, organization) {
    try {
      console.log(`Mock: Creating issuer ${issuerId}`);
      const newIssuer = {
        id: issuerId,
        name,
        organization,
        issuedCredentials: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.mockIssuers.push(newIssuer);
      return newIssuer;
    } catch (error) {
      console.error('Error in createIssuer:', error);
      throw new Error('Failed to create issuer');
    }
  }

  async getIssuer(issuerId) {
    try {
      console.log(`Mock: Getting issuer ${issuerId}`);
      return this.mockIssuers.find(issuer => issuer.id === issuerId);
    } catch (error) {
      console.error('Error in getIssuer:', error);
      throw new Error('Failed to get issuer');
    }
  }

  async getAllIssuers() {
    try {
      console.log('Mock: Getting all issuers');
      return this.mockIssuers;
    } catch (error) {
      console.error('Error in getAllIssuers:', error);
      throw new Error('Failed to get all issuers');
    }
  }

  async createVerifier(verifierId, name, organization) {
    try {
      console.log(`Mock: Creating verifier ${verifierId}`);
      const newVerifier = {
        id: verifierId,
        name,
        organization,
        verificationRequests: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.mockVerifiers.push(newVerifier);
      return newVerifier;
    } catch (error) {
      console.error('Error in createVerifier:', error);
      throw new Error('Failed to create verifier');
    }
  }

  async getVerifier(verifierId) {
    try {
      console.log(`Mock: Getting verifier ${verifierId}`);
      return this.mockVerifiers.find(verifier => verifier.id === verifierId);
    } catch (error) {
      console.error('Error in getVerifier:', error);
      throw new Error('Failed to get verifier');
    }
  }

  async getAllVerifiers() {
    try {
      console.log('Mock: Getting all verifiers');
      return this.mockVerifiers;
    } catch (error) {
      console.error('Error in getAllVerifiers:', error);
      throw new Error('Failed to get all verifiers');
    }
  }
}

// Create a singleton instance
const fabricService = new FabricService();
export default fabricService; 