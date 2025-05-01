import express from 'express';
import fabricService from '../services/fabricService.js';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage: storage });

// Middleware to connect to the fabric network
const connectFabric = async (req, res, next) => {
  try {
    // Use the user ID from authenticated session or default to 'admin'
    const userId = req.user?.id || 'admin';
    const connected = await fabricService.connect(userId);
    if (!connected) {
      return res.status(503).json({
        status: 'error',
        message: 'Failed to connect to Fabric network. Service unavailable.'
      });
    }
    next();
  } catch (error) {
    console.error('Error connecting to Fabric:', error);
    return res.status(503).json({
      status: 'error',
      message: 'Error connecting to Fabric network',
      error: error.message
    });
  }
};

// Use the middleware for all routes
router.use(connectFabric);

// Create a new identity
router.post('/identities', async (req, res) => {
  try {
    const { citizenId, name, dateOfBirth, nationality, address } = req.body;
    
    const result = await fabricService.createIdentity(citizenId, name, dateOfBirth, nationality, address);
    res.status(201).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Error creating identity:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to create identity'
    });
  } finally {
    await fabricService.disconnect();
  }
});

// Get an identity
router.get('/identities/:citizenId', async (req, res) => {
  try {
    const { citizenId } = req.params;
    
    const result = await fabricService.getIdentity(citizenId);
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Error getting identity:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to get identity'
    });
  } finally {
    await fabricService.disconnect();
  }
});

// Update an identity
router.put('/identities/:citizenId', async (req, res) => {
  try {
    const { citizenId } = req.params;
    const { name, dateOfBirth, nationality, address } = req.body;
    
    const result = await fabricService.updateIdentity(citizenId, name, dateOfBirth, nationality, address);
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Error updating identity:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to update identity'
    });
  } finally {
    await fabricService.disconnect();
  }
});

// Add a document to an identity
router.post('/identities/:citizenId/documents', upload.single('document'), async (req, res) => {
  try {
    const { citizenId } = req.params;
    const { documentType } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No document file uploaded'
      });
    }
    
    // Generate document hash
    const fileBuffer = fs.readFileSync(req.file.path);
    const documentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const documentId = uuidv4();
    
    const result = await fabricService.addDocument(citizenId, documentId, documentType, documentHash);
    
    // Save metadata about file location
    const metadata = {
      filePath: req.file.path,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    };
    
    // Register in document registry for more detailed tracking
    await fabricService.registerDocument(
      documentId, 
      documentType, 
      documentHash, 
      citizenId, 
      JSON.stringify(metadata)
    );
    
    res.status(201).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Error adding document:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to add document'
    });
  } finally {
    await fabricService.disconnect();
  }
});

// Get documents for an identity
router.get('/identities/:citizenId/documents', async (req, res) => {
  try {
    const { citizenId } = req.params;
    
    const result = await fabricService.getDocuments(citizenId);
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Error getting documents:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to get documents'
    });
  } finally {
    await fabricService.disconnect();
  }
});

// Middleware to check if Fabric is connected
const fabricMiddleware = async (req, res, next) => {
  try {
    // Try to connect to Fabric
    // If not already connected, connect using the existing middleware
    if (!req.fabricClient) {
      const userId = req.user?.id || 'admin';
      const connected = await fabricService.connect(userId);
      if (!connected) {
        return res.status(503).json({
          status: 'error',
          message: 'Failed to connect to Fabric network. Service unavailable.'
        });
      }
      req.fabricClient = fabricService;
    }
    next();
  } catch (error) {
    console.error('Error connecting to Fabric network:', error);
    return res.status(503).json({
      status: 'error',
      message: 'Error connecting to Fabric network',
      error: error.message
    });
  }
};

// Create a new client
router.post('/clients', fabricMiddleware, async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({
        status: 'error',
        message: 'Name and email are required'
      });
    }

    const clientData = {
      id: uuidv4(),
      name,
      email,
      phone: phone || ''
    };

    // Register the client with Fabric
    const result = await req.fabricClient.createClient(clientData);

    res.status(201).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create client',
      error: error.message
    });
  } finally {
    await fabricService.disconnect();
  }
});

// Get a specific client
router.get('/clients/:clientId', fabricMiddleware, async (req, res) => {
  try {
    const { clientId } = req.params;

    // Get client from Fabric
    const client = await req.fabricClient.getClient(clientId);

    if (!client) {
      return res.status(404).json({
        status: 'error',
        message: 'Client not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: client
    });
  } catch (error) {
    console.error('Error retrieving client:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve client',
      error: error.message
    });
  } finally {
    await fabricService.disconnect();
  }
});

// Get all clients
router.get('/clients', fabricMiddleware, async (req, res) => {
  try {
    // Get all clients from Fabric
    const clientList = await req.fabricClient.getAllClients();

    res.status(200).json({
      status: 'success',
      data: clientList
    });
  } catch (error) {
    console.error('Error retrieving clients:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve clients',
      error: error.message
    });
  } finally {
    await fabricService.disconnect();
  }
});

// Add an attribute to a client
router.post('/clients/:clientId/attributes', fabricMiddleware, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { name, value, issuer } = req.body;
    
    if (!name || !value) {
      return res.status(400).json({
        status: 'error',
        message: 'Attribute name and value are required'
      });
    }

    // Add attribute through Fabric
    const client = await req.fabricClient.addAttribute(
      clientId, 
      name, 
      value, 
      issuer || 'self'
    );

    res.status(200).json({
      status: 'success',
      data: client
    });
  } catch (error) {
    console.error('Error adding attribute:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add attribute',
      error: error.message
    });
  } finally {
    await fabricService.disconnect();
  }
});

// Request verification for a client's attributes
router.post('/verifications/request', fabricMiddleware, async (req, res) => {
  try {
    const { clientId, attributeIds, verifierId } = req.body;
    
    if (!clientId || !attributeIds || !verifierId) {
      return res.status(400).json({
        status: 'error',
        message: 'Client ID, attribute IDs, and verifier ID are required'
      });
    }

    // Create verification request in Fabric
    const request = await req.fabricClient.requestVerification(
      clientId, 
      attributeIds, 
      verifierId
    );

    res.status(201).json({
      status: 'success',
      data: request
    });
  } catch (error) {
    console.error('Error requesting verification:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to request verification',
      error: error.message
    });
  } finally {
    await fabricService.disconnect();
  }
});

// Respond to a verification request
router.post('/verifications/:requestId/respond', fabricMiddleware, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { approved, notes, issuerId } = req.body;
    
    if (approved === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Approval status is required'
      });
    }

    // Update verification request in Fabric
    const request = await req.fabricClient.respondToVerification(
      requestId, 
      approved, 
      notes || ''
    );

    // If approved and issuerId is provided, we should create a private channel
    if (approved && issuerId) {
      // In a real implementation, logic would be added here to establish a private channel
      console.log(`Creating private channel between client, issuer ${issuerId}, and verifier`);
    }

    res.status(200).json({
      status: 'success',
      data: request
    });
  } catch (error) {
    console.error('Error responding to verification:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to respond to verification',
      error: error.message
    });
  } finally {
    await fabricService.disconnect();
  }
});

export default router; 