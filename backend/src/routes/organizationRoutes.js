const express = require('express');
const router = express.Router();
const fabricService = require('../services/fabricService');
const { v4: uuidv4 } = require('uuid');

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

// Get all organizations
router.get('/', async (req, res) => {
  try {
    const result = await fabricService.getAllOrganizations();
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Error getting organizations:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to get organizations'
    });
  } finally {
    await fabricService.disconnect();
  }
});

// Get organization by ID
router.get('/:orgId', async (req, res) => {
  try {
    const { orgId } = req.params;
    
    const result = await fabricService.getOrganization(orgId);
    
    if (!result) {
      return res.status(404).json({
        status: 'error',
        message: `Organization with ID ${orgId} not found`
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Error getting organization:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to get organization'
    });
  } finally {
    await fabricService.disconnect();
  }
});

// Create a new organization
router.post('/', async (req, res) => {
  try {
    const { id, name, type } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({
        status: 'error',
        message: 'Name and type are required'
      });
    }
    
    const orgId = id || uuidv4();
    
    const result = await fabricService.createOrganization(orgId, name, type);
    
    res.status(201).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to create organization'
    });
  } finally {
    await fabricService.disconnect();
  }
});

// Get all issuers
router.get('/issuers', async (req, res) => {
  try {
    const result = await fabricService.getAllIssuers();
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Error getting issuers:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to get issuers'
    });
  } finally {
    await fabricService.disconnect();
  }
});

// Get issuer by ID
router.get('/issuers/:issuerId', async (req, res) => {
  try {
    const { issuerId } = req.params;
    
    const result = await fabricService.getIssuer(issuerId);
    
    if (!result) {
      return res.status(404).json({
        status: 'error',
        message: `Issuer with ID ${issuerId} not found`
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Error getting issuer:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to get issuer'
    });
  } finally {
    await fabricService.disconnect();
  }
});

// Create a new issuer
router.post('/issuers', async (req, res) => {
  try {
    const { id, name, organization } = req.body;
    
    if (!name || !organization) {
      return res.status(400).json({
        status: 'error',
        message: 'Name and organization are required'
      });
    }
    
    const issuerId = id || uuidv4();
    
    const result = await fabricService.createIssuer(issuerId, name, organization);
    
    res.status(201).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Error creating issuer:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to create issuer'
    });
  } finally {
    await fabricService.disconnect();
  }
});

// Get all verifiers
router.get('/verifiers', async (req, res) => {
  try {
    const result = await fabricService.getAllVerifiers();
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Error getting verifiers:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to get verifiers'
    });
  } finally {
    await fabricService.disconnect();
  }
});

// Get verifier by ID
router.get('/verifiers/:verifierId', async (req, res) => {
  try {
    const { verifierId } = req.params;
    
    const result = await fabricService.getVerifier(verifierId);
    
    if (!result) {
      return res.status(404).json({
        status: 'error',
        message: `Verifier with ID ${verifierId} not found`
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Error getting verifier:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to get verifier'
    });
  } finally {
    await fabricService.disconnect();
  }
});

// Create a new verifier
router.post('/verifiers', async (req, res) => {
  try {
    const { id, name, organization } = req.body;
    
    if (!name || !organization) {
      return res.status(400).json({
        status: 'error',
        message: 'Name and organization are required'
      });
    }
    
    const verifierId = id || uuidv4();
    
    const result = await fabricService.createVerifier(verifierId, name, organization);
    
    res.status(201).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Error creating verifier:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to create verifier'
    });
  } finally {
    await fabricService.disconnect();
  }
});

module.exports = router; 