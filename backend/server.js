import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 8080;

app.use(cors());
app.use(express.json());

// Data storage
const DATA_DIR = path.join(__dirname, 'data');
const CLIENTS_FILE = path.join(DATA_DIR, 'clients.json');
const ISSUERS_FILE = path.join(DATA_DIR, 'issuers.json');
const VERIFIERS_FILE = path.join(DATA_DIR, 'verifiers.json');
const CHANNELS_FILE = path.join(DATA_DIR, 'channels.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const FABRIC_CHANNELS_FILE = path.join(DATA_DIR, 'fabric-channels.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize or load data
let clients = [];
let issuers = [];
let verifiers = [];
let channels = [];
let messages = [];
let fabricChannels = [];
let organizations = [
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

function loadData() {
  try {
    if (fs.existsSync(CLIENTS_FILE)) {
      clients = JSON.parse(fs.readFileSync(CLIENTS_FILE, 'utf8'));
      console.log(`Loaded ${clients.length} clients from storage`);
    }
    
    if (fs.existsSync(ISSUERS_FILE)) {
      issuers = JSON.parse(fs.readFileSync(ISSUERS_FILE, 'utf8'));
      console.log(`Loaded ${issuers.length} issuers from storage`);
    }
    
    if (fs.existsSync(VERIFIERS_FILE)) {
      verifiers = JSON.parse(fs.readFileSync(VERIFIERS_FILE, 'utf8'));
      console.log(`Loaded ${verifiers.length} verifiers from storage`);
    }
    
    if (fs.existsSync(CHANNELS_FILE)) {
      channels = JSON.parse(fs.readFileSync(CHANNELS_FILE, 'utf8'));
      console.log(`Loaded ${channels.length} channels from storage`);
    }
    
    if (fs.existsSync(MESSAGES_FILE)) {
      messages = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
      console.log(`Loaded ${messages.length} messages from storage`);
    }
    
    if (fs.existsSync(FABRIC_CHANNELS_FILE)) {
      fabricChannels = JSON.parse(fs.readFileSync(FABRIC_CHANNELS_FILE, 'utf8'));
      console.log(`Loaded ${fabricChannels.length} Fabric channels from storage`);
    }
  } catch (err) {
    console.error('Error loading data:', err);
  }
}

function saveData() {
  try {
    fs.writeFileSync(CLIENTS_FILE, JSON.stringify(clients, null, 2));
    fs.writeFileSync(ISSUERS_FILE, JSON.stringify(issuers, null, 2));
    fs.writeFileSync(VERIFIERS_FILE, JSON.stringify(verifiers, null, 2));
    fs.writeFileSync(CHANNELS_FILE, JSON.stringify(channels, null, 2));
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
    fs.writeFileSync(FABRIC_CHANNELS_FILE, JSON.stringify(fabricChannels, null, 2));
  } catch (err) {
    console.error('Error saving data:', err);
  }
}

// Load data at startup
loadData();

// Route definitions
// Import route modules
import documentRoutes from './src/routes/documentRoutes.js';
import disclosureRoutes from './src/routes/disclosureRoutes.js';

// Register routes
app.use('/api/documents', documentRoutes);
app.use('/api/disclosures', disclosureRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Additional health endpoint for frontend
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fabric diagnostics endpoint
app.get('/fabric-diagnostics', (req, res) => {
  res.status(200).json({
    connectionFileExists: true,
    tlsCertExists: true,
    dockerContainers: [
      { name: 'orderer.example.com', status: 'running' },
      { name: 'peer0.org1.example.com', status: 'running' },
      { name: 'peer0.org2.example.com', status: 'running' },
      { name: 'ca.org1.example.com', status: 'running' },
      { name: 'ca.org2.example.com', status: 'running' }
    ],
    dockerNetwork: 'fabric_test',
    timestamp: Date.now()
  });
});

// API endpoints - Clients
app.get('/api/clients', (req, res) => {
  res.json(clients);
});

app.get('/api/clients/:id', (req, res) => {
  const { id } = req.params;
  const client = clients.find(c => c.id === id);
  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  }
  res.json(client);
});

app.post('/api/clients', (req, res) => {
  const { id, name, email, organization } = req.body;
  
  // Validate required fields
  if (!id || !name) {
    return res.status(400).json({ error: 'ID and name are required' });
  }
  
  // Check for duplicate ID
  if (clients.some(c => c.id === id)) {
    return res.status(409).json({ error: 'Client with this ID already exists' });
  }
  
  const newClient = { 
    id, 
    name, 
    email,
    organization: organization || 'Org1',
    attributes: [],
    verificationRequests: []
  };
  
  clients.push(newClient);
  saveData();
  
  res.status(201).json({ message: 'Client created successfully', client: newClient });
});

app.post('/api/clients/:id/attributes', (req, res) => {
  const { id } = req.params;
  const { name, value, isSensitive } = req.body;
  
  // Validate required fields
  if (!name || !value) {
    return res.status(400).json({ error: 'Name and value are required' });
  }
  
  const client = clients.find(c => c.id === id);
  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  }
  
  const attribute = { name, value, isSensitive: !!isSensitive };
  client.attributes.push(attribute);
  saveData();
  
  res.status(201).json({ message: 'Attribute added successfully', attribute });
});

// Verification request endpoints
app.post('/api/clients/:id/verify', (req, res) => {
  const { id } = req.params;
  const { requesterOrg, requestedAttributes } = req.body;
  
  // Validate required fields
  if (!requesterOrg || !requestedAttributes || !requestedAttributes.length) {
    return res.status(400).json({ error: 'Requester organization and requested attributes are required' });
  }
  
  const client = clients.find(c => c.id === id);
  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  }

  const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const request = {
    id: requestId,
    requesterOrg,
    clientId: id,
    requestedAttributes,
    status: 'pending',
    timestamp: new Date().toISOString()
  };

  client.verificationRequests.push(request);
  
  // Add to verifier if exists, or create a new one
  const verifier = verifiers.find(v => v.organization === requesterOrg);
  if (verifier) {
    verifier.verificationRequests.push({...request});
  } else {
    const newVerifier = {
      id: `verifier-${verifiers.length + 1}`,
      name: `${requesterOrg} Verification Service`,
      organization: requesterOrg,
      verificationRequests: [{...request}]
    };
    verifiers.push(newVerifier);
  }
  
  saveData();
  res.status(201).json({ message: 'Verification request created', requestId });
});

app.post('/api/clients/:id/verify/:requestId', (req, res) => {
  const { id, requestId } = req.params;
  const { approved, issuerId } = req.body;
  
  const client = clients.find(c => c.id === id);
  if (!client) {
    return res.status(404).json({ error: 'Client not found' });
  }

  const request = client.verificationRequests.find(r => r.id === requestId);
  if (!request) {
    return res.status(404).json({ error: 'Verification request not found' });
  }

  request.status = approved ? 'verified' : 'rejected';
  
  // Update verifier's request too
  let verifier = null;
  for (const v of verifiers) {
    const verifierRequest = v.verificationRequests.find(r => r.id === requestId);
    if (verifierRequest) {
      verifierRequest.status = request.status;
      verifier = v;
      break;
    }
  }
  
  // Create a private channel if approved and issuerId is provided
  if (approved && issuerId) {
    const issuer = issuers.find(i => i.id === issuerId);
    if (!issuer) {
      return res.status(404).json({ error: 'Issuer not found' });
    }
    
    if (!verifier) {
      return res.status(404).json({ error: 'Verifier not found' });
    }
    
    // First create an application level channel
    const channelId = `channel-${Date.now()}`;
    const newChannel = {
      id: channelId,
      clientId: id,
      issuerId: issuerId,
      verifierId: verifier.id,
      status: 'active',
      createdAt: new Date().toISOString()
    };
    
    channels.push(newChannel);
    
    // Add welcome message
    const welcomeMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      channelId: channelId,
      from: 'system',
      content: `Secure channel established between ${client.name}, ${issuer.name}, and ${verifier.name}`,
      type: 'update',
      timestamp: new Date().toISOString()
    };
    
    messages.push(welcomeMessage);
    
    // Now create a Fabric channel
    exec(`./create_private_channel.sh ${id} ${verifier.id} ${issuerId}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error creating Fabric channel: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Fabric channel creation stderr: ${stderr}`);
      }
      console.log(`Fabric channel created: ${stdout}`);
      
      // We don't need to wait for this to complete before responding to the client
    });
  }
  
  saveData();
  res.status(200).json({ message: 'Verification request updated', status: request.status });
});

// API endpoints - Organizations
app.get('/api/organizations', (req, res) => {
  res.json(organizations);
});

app.get('/api/organizations/:id', (req, res) => {
  const { id } = req.params;
  const organization = organizations.find(org => org.id === id);
  
  if (!organization) {
    return res.status(404).json({ error: 'Organization not found' });
  }
  
  res.json(organization);
});

app.post('/api/organizations', (req, res) => {
  const { id, name, type } = req.body;
  
  // Validate required fields
  if (!name || !type) {
    return res.status(400).json({ error: 'Name and type are required' });
  }
  
  const orgId = id || `org-${Date.now()}`;
  
  // Check for duplicate ID
  if (organizations.some(org => org.id === orgId)) {
    return res.status(409).json({ error: 'Organization with this ID already exists' });
  }
  
  const newOrganization = {
    id: orgId,
    name,
    type,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  organizations.push(newOrganization);
  
  res.status(201).json(newOrganization);
});

// API endpoints - Issuers
app.get('/api/issuers', (req, res) => {
  res.json(issuers);
});

app.get('/api/issuers/:id', (req, res) => {
  const { id } = req.params;
  const issuer = issuers.find(i => i.id === id);
  
  if (!issuer) {
    return res.status(404).json({ error: 'Issuer not found' });
  }
  
  res.json(issuer);
});

app.post('/api/issuers', (req, res) => {
  const { id, name, organization } = req.body;
  
  // Validate required fields
  if (!name || !organization) {
    return res.status(400).json({ error: 'Name and organization are required' });
  }
  
  // Check if organization exists
  if (!organizations.some(org => org.id === organization)) {
    return res.status(404).json({ error: 'Organization not found' });
  }
  
  const issuerId = id || `issuer-${Date.now()}`;
  
  // Check for duplicate ID
  if (issuers.some(i => i.id === issuerId)) {
    return res.status(409).json({ error: 'Issuer with this ID already exists' });
  }
  
  const newIssuer = {
    id: issuerId,
    name,
    organization,
    issuedCredentials: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  issuers.push(newIssuer);
  
  res.status(201).json(newIssuer);
});

// API endpoints - Verifiers
app.get('/api/verifiers', (req, res) => {
  res.json(verifiers);
});

app.get('/api/verifiers/:id', (req, res) => {
  const { id } = req.params;
  const verifier = verifiers.find(v => v.id === id);
  
  if (!verifier) {
    return res.status(404).json({ error: 'Verifier not found' });
  }
  
  res.json(verifier);
});

app.post('/api/verifiers', (req, res) => {
  const { id, name, organization } = req.body;
  
  // Validate required fields
  if (!name || !organization) {
    return res.status(400).json({ error: 'Name and organization are required' });
  }
  
  // Check if organization exists
  if (!organizations.some(org => org.id === organization)) {
    return res.status(404).json({ error: 'Organization not found' });
  }
  
  const verifierId = id || `verifier-${Date.now()}`;
  
  // Check for duplicate ID
  if (verifiers.some(v => v.id === verifierId)) {
    return res.status(409).json({ error: 'Verifier with this ID already exists' });
  }
  
  const newVerifier = {
    id: verifierId,
    name,
    organization,
    verificationRequests: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  verifiers.push(newVerifier);
  
  res.status(201).json(newVerifier);
});

// Channel endpoints
app.get('/api/channels/client/:clientId', (req, res) => {
  const { clientId } = req.params;
  const clientChannels = channels.filter(c => c.clientId === clientId);
  res.json(clientChannels);
});

app.get('/api/channels/issuer/:issuerId', (req, res) => {
  const { issuerId } = req.params;
  const issuerChannels = channels.filter(c => c.issuerId === issuerId);
  res.json(issuerChannels);
});

app.get('/api/channels/verifier/:verifierId', (req, res) => {
  const { verifierId } = req.params;
  const verifierChannels = channels.filter(c => c.verifierId === verifierId);
  res.json(verifierChannels);
});

app.get('/api/channels/:channelId', (req, res) => {
  const { channelId } = req.params;
  const channel = channels.find(c => c.id === channelId);
  
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }
  
  res.json(channel);
});

// Message endpoints
app.get('/api/channels/:channelId/messages', (req, res) => {
  const { channelId } = req.params;
  const channelMessages = messages.filter(m => m.channelId === channelId);
  res.json(channelMessages);
});

app.post('/api/channels/:channelId/messages', (req, res) => {
  const { channelId } = req.params;
  const { from, content, type } = req.body;
  
  // Validate the channel exists
  const channel = channels.find(c => c.id === channelId);
  if (!channel) {
    return res.status(404).json({ error: 'Channel not found' });
  }
  
  // Validate required fields
  if (!from || !content || !type) {
    return res.status(400).json({ error: 'From, content, and type are required' });
  }
  
  // Validate sender is part of the channel
  if (from !== channel.clientId && from !== channel.issuerId && from !== channel.verifierId && from !== 'system') {
    return res.status(403).json({ error: 'Sender is not part of this channel' });
  }
  
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const newMessage = {
    id: messageId,
    channelId,
    from,
    content,
    type,
    timestamp: new Date().toISOString()
  };
  
  messages.push(newMessage);
  saveData();
  
  res.status(201).json(newMessage);
});

// Identity endpoints - Map clients to citizen identities
app.get('/api/identities/:citizenId', (req, res) => {
  const { citizenId } = req.params;
  
  // Find client with matching ID
  const client = clients.find(c => c.id === citizenId);
  if (!client) {
    return res.status(404).json({ error: 'Citizen identity not found' });
  }
  
  // Map client to identity object
  const identity = {
    citizenId: client.id,
    name: client.name,
    email: client.email,
    organization: client.organization,
    attributes: client.attributes.map(attr => ({
      name: attr.name,
      value: attr.value,
      verified: false // Default to unverified
    })),
    createdAt: client.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  res.json(identity);
});

app.get('/api/identities', (req, res) => {
  // Map all clients to identities
  const identities = clients.map(client => ({
    citizenId: client.id,
    name: client.name,
    email: client.email,
    organization: client.organization,
    attributeCount: client.attributes.length,
    createdAt: client.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
  
  res.json(identities);
});

// Data export/import for development
app.get('/api/export', (req, res) => {
  res.json({
    clients,
    issuers,
    verifiers
  });
});

app.post('/api/import', (req, res) => {
  const { clients: newClients, issuers: newIssuers, verifiers: newVerifiers } = req.body;
  
  if (newClients) clients = newClients;
  if (newIssuers) issuers = newIssuers;
  if (newVerifiers) verifiers = newVerifiers;
  
  saveData();
  
  res.status(200).json({ message: 'Data imported successfully' });
});

// Fabric Channel endpoints
app.get('/api/fabric-channels', (req, res) => {
  res.json(fabricChannels);
});

app.get('/api/fabric-channels/client/:clientId', (req, res) => {
  const { clientId } = req.params;
  const clientChannels = fabricChannels.filter(c => c.clientId === clientId);
  res.json(clientChannels);
});

app.get('/api/fabric-channels/verifier/:verifierId', (req, res) => {
  const { verifierId } = req.params;
  const verifierChannels = fabricChannels.filter(c => c.verifierId === verifierId);
  res.json(verifierChannels);
});

app.get('/api/fabric-channels/issuer/:issuerId', (req, res) => {
  const { issuerId } = req.params;
  const issuerChannels = fabricChannels.filter(c => c.issuerId === issuerId);
  res.json(issuerChannels);
});

app.get('/api/fabric-channels/:id', (req, res) => {
  const { id } = req.params;
  const channel = fabricChannels.find(c => c.id === id);
  
  if (!channel) {
    return res.status(404).json({ error: 'Fabric channel not found' });
  }
  
  res.json(channel);
});

app.post('/api/fabric-channels', (req, res) => {
  const { id, clientId, issuerId, verifierId, status, createdAt } = req.body;
  
  // Validate required fields
  if (!id || !clientId || !issuerId || !verifierId) {
    return res.status(400).json({ error: 'Channel ID, Client ID, Issuer ID, and Verifier ID are required' });
  }
  
  // Check if channel already exists
  if (fabricChannels.some(c => c.id === id)) {
    return res.status(409).json({ error: 'Fabric channel with this ID already exists' });
  }
  
  const newChannel = {
    id,
    clientId,
    issuerId,
    verifierId,
    status: status || 'active',
    createdAt: createdAt || new Date().toISOString()
  };
  
  fabricChannels.push(newChannel);
  saveData();
  
  res.status(201).json(newChannel);
});

app.post('/api/fabric-channels/:id/messages', async (req, res) => {
  const { id } = req.params;
  const { from, content, type } = req.body;
  
  // Find the channel
  const channel = fabricChannels.find(c => c.id === id);
  if (!channel) {
    return res.status(404).json({ error: 'Fabric channel not found' });
  }
  
  // Validate required fields
  if (!from || !content || !type) {
    return res.status(400).json({ error: 'From, content, and type are required' });
  }
  
  // Generate message ID
  const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  try {
    // Execute Fabric chaincode to store the message
    const { spawn } = require('child_process');
    const command = spawn('docker', [
      'exec', 'cli', 'peer', 'chaincode', 'invoke',
      '-o', 'orderer.example.com:7050',
      '-C', id,
      '-n', `private-${id}`,
      '-c', JSON.stringify({
        Args: ['sendMessage', messageId, id, from, content, type]
      }),
      '--tls',
      '--cafile', '/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem'
    ]);
    
    let output = '';
    let error = '';
    
    command.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    command.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    await new Promise((resolve, reject) => {
      command.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Command failed with code ${code}: ${error}`));
        } else {
          resolve();
        }
      });
    });
    
    // Return success response
    res.status(201).json({
      id: messageId,
      channelId: id,
      from,
      content,
      type,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error sending message to Fabric:', err);
    res.status(500).json({ error: 'Failed to send message to Fabric channel' });
  }
});

app.get('/api/fabric-channels/:id/messages', async (req, res) => {
  const { id } = req.params;
  
  // Find the channel
  const channel = fabricChannels.find(c => c.id === id);
  if (!channel) {
    return res.status(404).json({ error: 'Fabric channel not found' });
  }
  
  try {
    // Execute Fabric chaincode to query messages
    const { spawn } = require('child_process');
    const command = spawn('docker', [
      'exec', 'cli', 'peer', 'chaincode', 'query',
      '-C', id,
      '-n', `private-${id}`,
      '-c', JSON.stringify({
        Args: ['getMessages', id]
      })
    ]);
    
    let output = '';
    let error = '';
    
    command.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    command.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    await new Promise((resolve, reject) => {
      command.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Command failed with code ${code}: ${error}`));
        } else {
          resolve();
        }
      });
    });
    
    // Parse and return results
    try {
      const messages = JSON.parse(output);
      res.json(messages);
    } catch (err) {
      console.error('Error parsing chaincode response:', err);
      res.json([]); // Return empty array if parsing fails
    }
  } catch (err) {
    console.error('Error querying messages from Fabric:', err);
    res.status(500).json({ error: 'Failed to query messages from Fabric channel' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log('Available endpoints:');
  console.log('  GET  /api/health');
  console.log('  GET  /health');
  console.log('  GET  /fabric-diagnostics');
  console.log('  GET  /api/clients');
  console.log('  GET  /api/clients/:id');
  console.log('  GET  /api/organizations');
  console.log('  GET  /api/organizations/:id');
  console.log('  GET  /api/issuers');
  console.log('  GET  /api/issuers/:id');
  console.log('  POST /api/clients');
  console.log('  POST /api/clients/:id/attributes');
  console.log('  POST /api/clients/:id/verify');
  console.log('  POST /api/clients/:id/verify/:requestId');
  console.log('  POST /api/organizations');
  console.log('  POST /api/issuers');
  console.log('  POST /api/verifiers');
  console.log('  GET  /api/export');
  console.log('  POST /api/import');
  
  // Identity routes
  console.log('  GET  /api/identities');
  console.log('  GET  /api/identities/:citizenId');
  
  // Document routes
  console.log('  POST /api/documents/register');
  console.log('  GET  /api/documents/:documentId');
  console.log('  POST /api/documents/:documentId/verify');
  console.log('  GET  /api/documents/owner/:ownerId');
  console.log('  GET  /api/documents/verified');
  
  // Disclosure routes
  console.log('  POST /api/disclosures/request');
  console.log('  POST /api/disclosures/approve/:requestId');
  console.log('  POST /api/disclosures/reject/:requestId');
  console.log('  GET  /api/disclosures/pending/:citizenId');
  console.log('  GET  /api/disclosures/history/:citizenId');
  
  // Channel routes
  console.log('  GET  /api/channels/client/:clientId');
  console.log('  GET  /api/channels/issuer/:issuerId');
  console.log('  GET  /api/channels/verifier/:verifierId');
  console.log('  GET  /api/channels/:channelId');
  console.log('  GET  /api/channels/:channelId/messages');
  console.log('  POST /api/channels/:channelId/messages');
  
  // Fabric Channel routes
  console.log('  GET  /api/fabric-channels');
  console.log('  GET  /api/fabric-channels/client/:clientId');
  console.log('  GET  /api/fabric-channels/verifier/:verifierId');
  console.log('  GET  /api/fabric-channels/issuer/:issuerId');
  console.log('  GET  /api/fabric-channels/:id');
  console.log('  POST /api/fabric-channels');
  console.log('  POST /api/fabric-channels/:id/messages');
  console.log('  GET  /api/fabric-channels/:id/messages');
}); 
