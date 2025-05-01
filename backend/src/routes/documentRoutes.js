import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import fabricService from '../services/fabricService.js';

const router = express.Router();

// Configure storage for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF and images are allowed.'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter
});

// Middleware to check Fabric connection
const checkFabricConnection = (req, res, next) => {
  // In a real implementation, this would check if the Fabric network is connected
  try {
    // Use the fabricService to check the connection
    // This should be implemented based on your specific Fabric setup
    if (!req.fabricService && !fabricService) {
      return res.status(503).json({
        status: 'error',
        message: 'Fabric network not available or not configured'
      });
    }
    
    // Attach fabricService to request if not already there
    if (!req.fabricService) {
      req.fabricService = fabricService;
    }
    
    next();
  } catch (error) {
    console.error('Error checking Fabric connection:', error);
    return res.status(503).json({
      status: 'error',
      message: 'Error connecting to Fabric network',
      error: error.message
    });
  }
};

// Apply middleware to all routes
router.use(checkFabricConnection);

// Get all documents
router.get('/', (req, res) => {
  try {
    const { clientId } = req.query;
    
    // Use Fabric to get documents
    req.fabricService.getDocuments(clientId)
      .then(result => {
    res.status(200).json({
      status: 'success',
      count: result.length,
      data: result
        });
      })
      .catch(error => {
        console.error('Error getting documents from Fabric:', error);
        res.status(500).json({
          status: 'error',
          message: 'Failed to get documents from blockchain',
          error: error.message
        });
    });
  } catch (error) {
    console.error('Error getting documents:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get documents',
      error: error.message
    });
  }
});

// Get document by id
router.get('/:id', (req, res) => {
  try {
    // Use Fabric to get document by id
    req.fabricService.getDocument(req.params.id)
      .then(document => {
    if (!document) {
      return res.status(404).json({
        status: 'error',
        message: `Document with ID ${req.params.id} not found`
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: document
        });
      })
      .catch(error => {
        console.error('Error getting document from Fabric:', error);
        res.status(500).json({
          status: 'error',
          message: 'Failed to get document from blockchain',
          error: error.message
        });
    });
  } catch (error) {
    console.error('Error getting document:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get document',
      error: error.message
    });
  }
});

// Upload a document
router.post('/', upload.single('document'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded'
      });
    }
    
    const { clientId, description, documentType } = req.body;
    
    if (!clientId) {
      return res.status(400).json({
        status: 'error',
        message: 'Client ID is required'
      });
    }
    
    // Calculate a hash of the file
    const fileBuffer = fs.readFileSync(req.file.path);
    const documentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const documentId = uuidv4();
    
    const documentData = {
      id: documentId,
      clientId,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      filePath: `/uploads/${req.file.filename}`,
      uploadDate: new Date().toISOString(),
      hash: documentHash,
      verified: false,
      metadata: {
        description: description || 'No description provided',
        documentType: documentType || 'Unknown'
      }
    };
    
    // Use Fabric to store document
    req.fabricService.createDocument(documentData)
      .then(result => {
    res.status(201).json({
      status: 'success',
          data: result
        });
      })
      .catch(error => {
        console.error('Error storing document in Fabric:', error);
        res.status(500).json({
          status: 'error',
          message: 'Failed to store document in blockchain',
          error: error.message
        });
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload document',
      error: error.message
    });
  }
});

// Verify a document
router.put('/:id/verify', (req, res) => {
  try {
    const { verifierId, status, comments } = req.body;
    
    if (!verifierId) {
      return res.status(400).json({
        status: 'error',
        message: 'Verifier ID is required'
      });
    }
    
    if (status === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Verification status is required'
      });
    }
    
    // Use Fabric to verify document
    req.fabricService.verifyDocument(req.params.id, verifierId, status, comments || '')
      .then(document => {
    if (!document) {
      return res.status(404).json({
        status: 'error',
        message: `Document with ID ${req.params.id} not found`
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: document
        });
      })
      .catch(error => {
        console.error('Error verifying document in Fabric:', error);
        res.status(500).json({
          status: 'error',
          message: 'Failed to verify document in blockchain',
          error: error.message
        });
    });
  } catch (error) {
    console.error('Error verifying document:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to verify document',
      error: error.message
    });
  }
});

// Delete a document
router.delete('/:id', (req, res) => {
  try {
    // First get the document to check if it exists and to get the file path
    req.fabricService.getDocument(req.params.id)
      .then(document => {
        if (!document) {
      return res.status(404).json({
        status: 'error',
        message: `Document with ID ${req.params.id} not found`
      });
    }
    
        // Remove file from filesystem if it exists
    const filePath = path.join(process.cwd(), document.filePath);
    if (fs.existsSync(filePath)) {
          try {
      fs.unlinkSync(filePath);
          } catch (error) {
            console.error('Error removing file from filesystem:', error);
            // Continue even if file removal fails
          }
        }
        
        // Delete document from Fabric
        return req.fabricService.deleteDocument(req.params.id);
      })
      .then(() => {
    res.status(200).json({
      status: 'success',
      message: 'Document deleted successfully'
        });
      })
      .catch(error => {
        console.error('Error with Fabric document operation:', error);
        res.status(500).json({
          status: 'error',
          message: 'Failed to delete document in blockchain',
          error: error.message
        });
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete document',
      error: error.message
    });
  }
});

// Register a new document
router.post('/register', async (req, res) => {
  try {
    const { documentId, documentType, documentHash, ownerId, metadata } = req.body;
    
    if (!documentId || !documentType || !documentHash || !ownerId) {
      return res.status(400).json({ error: 'Missing required fields: documentId, documentType, documentHash, ownerId' });
    }
    
    // Try to connect to Fabric network
    const isConnected = await fabricService.connect('admin');
    
    if (isConnected) {
      // Submit transaction to the blockchain
      const result = await fabricService.submitTransaction(
        'document', 
        'RegisterDocument', 
        documentId, 
        documentType, 
        documentHash, 
        ownerId, 
        JSON.stringify(metadata || {})
      );
      
      await fabricService.disconnect();
      res.status(201).json(result);
    } else {
      // Use mock implementation if Fabric network is not available
      console.log('Using mock implementation for RegisterDocument');
      
      const document = {
        documentId,
        documentType,
        documentHash,
        ownerId,
        metadata: metadata || {},
        verified: false,
        verificationDate: null,
        created: Date.now(),
        updated: Date.now()
      };
      
      // Find the client to add document reference
      const clients = fabricService.mockClients || [];
      const client = clients.find(c => c.id === ownerId);
      
      if (client) {
        if (!client.documents) client.documents = [];
        client.documents.push(document);
      }
      
      // Mock response
      res.status(201).json(document);
    }
  } catch (error) {
    console.error('Error registering document:', error);
    res.status(500).json({ error: error.message || 'Failed to register document' });
  }
});

// Get a document by ID
router.get('/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    
    // Try to connect to Fabric network
    const isConnected = await fabricService.connect('admin');
    
    if (isConnected) {
      // Evaluate transaction on the blockchain
      const result = await fabricService.evaluateTransaction(
        'document', 
        'GetDocument', 
        documentId
      );
      
      await fabricService.disconnect();
      res.status(200).json(result);
    } else {
      // Use mock implementation if Fabric network is not available
      console.log('Using mock implementation for GetDocument');
      
      // Find document in clients (simplified)
      const clients = fabricService.mockClients || [];
      let foundDocument = null;
      
      for (const client of clients) {
        if (client.documents) {
          const document = client.documents.find(d => d.documentId === documentId);
          if (document) {
            foundDocument = document;
            break;
          }
        }
      }
      
      if (foundDocument) {
        res.status(200).json(foundDocument);
      } else {
        res.status(404).json({ error: 'Document not found' });
      }
    }
  } catch (error) {
    console.error('Error getting document:', error);
    res.status(500).json({ error: error.message || 'Failed to get document' });
  }
});

// Verify a document
router.post('/:documentId/verify', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { verifierId, verificationResult } = req.body;
    
    if (!verifierId || verificationResult === undefined) {
      return res.status(400).json({ error: 'Missing required fields: verifierId, verificationResult' });
    }
    
    // Try to connect to Fabric network
    const isConnected = await fabricService.connect('admin');
    
    if (isConnected) {
      // Submit transaction to the blockchain
      const result = await fabricService.submitTransaction(
        'document', 
        'VerifyDocument', 
        documentId, 
        verifierId, 
        verificationResult.toString()
      );
      
      await fabricService.disconnect();
      res.status(200).json(result);
    } else {
      // Use mock implementation if Fabric network is not available
      console.log('Using mock implementation for VerifyDocument');
      
      // Find document in clients (simplified)
      const clients = fabricService.mockClients || [];
      let foundDocument = null;
      let ownerClient = null;
      
      for (const client of clients) {
        if (client.documents) {
          const documentIndex = client.documents.findIndex(d => d.documentId === documentId);
          if (documentIndex >= 0) {
            foundDocument = client.documents[documentIndex];
            ownerClient = client;
            
            // Update document verification status
            client.documents[documentIndex].verified = verificationResult === true || verificationResult === 'true';
            client.documents[documentIndex].verificationDate = Date.now();
            client.documents[documentIndex].verifierId = verifierId;
            client.documents[documentIndex].updated = Date.now();
            
            break;
          }
        }
      }
      
      if (foundDocument) {
        res.status(200).json(foundDocument);
      } else {
        res.status(404).json({ error: 'Document not found' });
      }
    }
  } catch (error) {
    console.error('Error verifying document:', error);
    res.status(500).json({ error: error.message || 'Failed to verify document' });
  }
});

// Get documents by owner
router.get('/owner/:ownerId', async (req, res) => {
  try {
    const { ownerId } = req.params;
    
    // Try to connect to Fabric network
    const isConnected = await fabricService.connect('admin');
    
    if (isConnected) {
      // Evaluate transaction on the blockchain
      const result = await fabricService.evaluateTransaction(
        'document', 
        'GetDocumentsByOwner', 
        ownerId
      );
      
      await fabricService.disconnect();
      res.status(200).json(result);
    } else {
      // Use mock implementation if Fabric network is not available
      console.log('Using mock implementation for GetDocumentsByOwner');
      
      // Find documents by owner
      const clients = fabricService.mockClients || [];
      const client = clients.find(c => c.id === ownerId);
      
      if (client && client.documents) {
        res.status(200).json(client.documents);
      } else {
        res.status(200).json([]); // Return empty array if no client or no documents
      }
    }
  } catch (error) {
    console.error('Error getting documents by owner:', error);
    res.status(500).json({ error: error.message || 'Failed to get documents by owner' });
  }
});

// Get all verified documents
router.get('/verified', async (req, res) => {
  try {
    // Try to connect to Fabric network
    const isConnected = await fabricService.connect('admin');
    
    if (isConnected) {
      // Evaluate transaction on the blockchain
      const result = await fabricService.evaluateTransaction(
        'document', 
        'GetVerifiedDocuments'
      );
      
      await fabricService.disconnect();
      res.status(200).json(result);
    } else {
      // Use mock implementation if Fabric network is not available
      console.log('Using mock implementation for GetVerifiedDocuments');
      
      // Find all verified documents
      const clients = fabricService.mockClients || [];
      const verifiedDocuments = [];
      
      for (const client of clients) {
        if (client.documents) {
          const docs = client.documents.filter(d => d.verified);
          verifiedDocuments.push(...docs);
        }
      }
      
      res.status(200).json(verifiedDocuments);
    }
  } catch (error) {
    console.error('Error getting verified documents:', error);
    res.status(500).json({ error: error.message || 'Failed to get verified documents' });
  }
});

export default router; 