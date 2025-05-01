import express from 'express';
import cors from 'cors';
import { Gateway, Wallets, Wallet } from 'fabric-network';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
// @ts-ignore
import authRoutes from './routes/authRoutes.js';
// @ts-ignore
import organizationRoutes from './routes/organizationRoutes.js';
// @ts-ignore
import identityRoutesESM from './routes/identityRoutesESM.js';
// @ts-ignore
import disclosureRoutesESM from './routes/disclosureRoutesESM.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 8080;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Define client interface
interface Client {
  id: string;
  name: string;
  email: string;
  attributes: Array<{name: string, value: string, type: string}>;
}

// Initialize connection variables
let ccp: Record<string, any> | null = null;
let wallet: Wallet | null = null;

// Try to load network configuration
try {
  // Try different possible paths for the connection profile
  const possiblePaths = [
    path.resolve(__dirname, '..', '..', '..', 'crypto-config', 'connection-org1.json'),
    path.resolve(__dirname, '..', '..', 'crypto-config', 'connection-org1.json'),
    path.resolve(__dirname, '..', '..', '..', '..', 'crypto-config', 'connection-org1.json')
  ];
  
  let foundPath: string | null = null;
  for (const ccpPath of possiblePaths) {
    if (fs.existsSync(ccpPath)) {
      foundPath = ccpPath;
      break;
    }
  }
  
  if (foundPath) {
    ccp = JSON.parse(fs.readFileSync(foundPath, 'utf8'));
    console.log('Successfully loaded connection profile from:', foundPath);
  } else {
    console.warn('Connection profile not found. Please ensure Fabric network is properly configured.');
  }
  
  // Create wallet
  const walletPath = path.join(process.cwd(), 'wallet');
  if (!fs.existsSync(walletPath)) {
    fs.mkdirSync(walletPath, { recursive: true });
  }
  wallet = await Wallets.newFileSystemWallet(walletPath);
  console.log('Wallet path:', walletPath);
  
} catch (error) {
  console.error('Failed to set up network configuration:', error);
}

// Function to check if Fabric is available
const fabricAvailable = async (): Promise<boolean> => {
  if (!ccp || !wallet) return false;
  
  try {
    const identity = await wallet.get('admin');
    return !!identity;
  } catch (error) {
    console.error('Fabric identity check failed:', error);
    return false;
  }
};

// Mount routes
app.use('/api/auth', authRoutes);
// Use dynamic import for organizationRoutes
let organizationRoutes;
try {
  organizationRoutes = require('./routes/organizationRoutes');
  app.use('/api/organizations', organizationRoutes);
} catch (error) {
  console.error('Error loading organization routes:', error);
}

// Add routes for documents, identities, etc.
try {
  // Dynamically import routes
  const documentRoutes = require('./routes/documentRoutes');
  // Use our new ESM version of identityRoutes
  const disclosureRoutes = require('./routes/disclosureRoutes');
  
  // Mount routes
  app.use('/api/documents', documentRoutes);
  app.use('/api/identity', identityRoutesESM);
  app.use('/api/disclosures', disclosureRoutes);
  
  console.log('Routes successfully mounted');
} catch (error) {
  console.error('Error mounting routes:', error);
}

// API endpoints
app.post('/api/clients', async (req, res) => {
  try {
    const { id, name, email } = req.body;
    
    // Check if Fabric is available
    if (!await fabricAvailable()) {
      return res.status(503).json({ error: 'Fabric network not available' });
    }

    // Connect to the gateway
    const gateway = new Gateway();
    if (ccp && wallet) {
      await gateway.connect(ccp, {
        wallet,
        identity: 'admin',
        discovery: { enabled: true, asLocalhost: true }
      });

      // Get the network and contract
      const network = await gateway.getNetwork('mychannel');
      const contract = network.getContract('identity');

      // Submit the transaction
      await contract.submitTransaction('CreateClient', id, name, email);

      // Disconnect from the gateway
      await gateway.disconnect();

      res.status(201).json({ message: 'Client created successfully' });
    } else {
      throw new Error('Connection profile or wallet not available');
    }
  } catch (error) {
    console.error(`Failed to create client: ${error}`);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

app.get('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if Fabric is available
    if (!await fabricAvailable()) {
      return res.status(503).json({ error: 'Fabric network not available' });
    }
    
    // Connect to the gateway
    const gateway = new Gateway();
    if (ccp && wallet) {
      await gateway.connect(ccp, {
        wallet,
        identity: 'admin',
        discovery: { enabled: true, asLocalhost: true }
      });

      // Get the network and contract
      const network = await gateway.getNetwork('mychannel');
      const contract = network.getContract('identity');

      // Evaluate the transaction
      const result = await contract.evaluateTransaction('GetClient', id);

      // Disconnect from the gateway
      await gateway.disconnect();

      res.json(JSON.parse(result.toString()));
    } else {
      throw new Error('Connection profile or wallet not available');
    }
  } catch (error) {
    console.error(`Failed to get client: ${error}`);
    res.status(500).json({ error: 'Failed to get client' });
  }
});

app.get('/api/clients', async (req, res) => {
  try {
    // Check if Fabric is available
    if (!await fabricAvailable()) {
      return res.status(503).json({ error: 'Fabric network not available' });
    }
    
    // Connect to the gateway
    const gateway = new Gateway();
    if (ccp && wallet) {
      await gateway.connect(ccp, {
        wallet,
        identity: 'admin',
        discovery: { enabled: true, asLocalhost: true }
      });

      // Get the network and contract
      const network = await gateway.getNetwork('mychannel');
      const contract = network.getContract('identity');

      // Evaluate the transaction
      const result = await contract.evaluateTransaction('GetAllClients');

      // Disconnect from the gateway
      await gateway.disconnect();

      res.json(JSON.parse(result.toString()));
    } else {
      throw new Error('Connection profile or wallet not available');
    }
  } catch (error) {
    console.error(`Failed to get clients: ${error}`);
    res.status(500).json({ error: 'Failed to get clients' });
  }
});

app.post('/api/clients/:id/attributes', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, value, type } = req.body;

    // Check if Fabric is available
    if (!await fabricAvailable()) {
      return res.status(503).json({ error: 'Fabric network not available' });
    }

    // Connect to the gateway
    const gateway = new Gateway();
    if (ccp && wallet) {
      await gateway.connect(ccp, {
        wallet,
        identity: 'admin',
        discovery: { enabled: true, asLocalhost: true }
      });

      // Get the network and contract
      const network = await gateway.getNetwork('mychannel');
      const contract = network.getContract('identity');

      // Submit the transaction
      await contract.submitTransaction('AddAttribute', id, name, value, type);

      // Disconnect from the gateway
      await gateway.disconnect();

      res.status(201).json({ message: 'Attribute added successfully' });
    } else {
      throw new Error('Connection profile or wallet not available');
    }
  } catch (error) {
    console.error(`Failed to add attribute: ${error}`);
    res.status(500).json({ error: 'Failed to add attribute' });
  }
});

app.post('/api/clients/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { requesterOrg, requestedAttributes } = req.body;

    // Connect to the gateway
    const gateway = new Gateway();
    
    if (!ccp || !wallet) {
      throw new Error('Connection profile or wallet not available');
    }
    
    await gateway.connect(ccp as Record<string, unknown>, {
      wallet,
      identity: 'admin',
      discovery: { enabled: true, asLocalhost: true }
    });

    // Get the network and contract
    const network = await gateway.getNetwork('mychannel');
    const contract = network.getContract('identity');

    // Submit the transaction
    await contract.submitTransaction('RequestVerification', id, requesterOrg, JSON.stringify(requestedAttributes));

    // Disconnect from the gateway
    await gateway.disconnect();

    res.status(201).json({ message: 'Verification requested successfully' });
  } catch (error) {
    console.error(`Failed to request verification: ${error}`);
    res.status(500).json({ error: 'Failed to request verification' });
  }
});

app.post('/api/clients/:id/verify/:requestId', async (req, res) => {
  try {
    const { id, requestId } = req.params;
    const { approved } = req.body;

    // Connect to the gateway
    const gateway = new Gateway();
    
    if (!ccp || !wallet) {
      throw new Error('Connection profile or wallet not available');
    }
    
    await gateway.connect(ccp as Record<string, unknown>, {
      wallet,
      identity: 'admin',
      discovery: { enabled: true, asLocalhost: true }
    });

    // Get the network and contract
    const network = await gateway.getNetwork('mychannel');
    const contract = network.getContract('identity');

    // Submit the transaction
    await contract.submitTransaction('RespondToVerification', id, requestId, approved.toString());

    // Disconnect from the gateway
    await gateway.disconnect();

    res.json({ message: 'Verification response submitted successfully' });
  } catch (error) {
    console.error(`Failed to respond to verification: ${error}`);
    res.status(500).json({ error: 'Failed to respond to verification' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
}); 