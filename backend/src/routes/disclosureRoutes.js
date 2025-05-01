import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import fabricService from '../services/fabricService.js';

const router = express.Router();

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

// Request disclosure
router.post('/disclosure-requests', async (req, res) => {
  try {
    const { requesterId, citizenId, attributes, purpose } = req.body;
    const requestId = uuidv4();
    
    const result = await fabricService.requestDisclosure(requestId, requesterId, citizenId, attributes, purpose);
    res.status(201).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Error requesting disclosure:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to request disclosure'
    });
  } finally {
    await fabricService.disconnect();
  }
});

// Approve disclosure request
router.put('/disclosure-requests/:requestId/approve', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { citizenId } = req.body;
    
    const result = await fabricService.approveDisclosure(requestId, citizenId);
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Error approving disclosure:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to approve disclosure'
    });
  } finally {
    await fabricService.disconnect();
  }
});

// Reject disclosure request
router.put('/disclosure-requests/:requestId/reject', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { citizenId } = req.body;
    
    const result = await fabricService.rejectDisclosure(requestId, citizenId);
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Error rejecting disclosure:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to reject disclosure'
    });
  } finally {
    await fabricService.disconnect();
  }
});

// Get disclosure request
router.get('/disclosure-requests/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const result = await fabricService.getDisclosureRequest(requestId);
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Error getting disclosure request:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to get disclosure request'
    });
  } finally {
    await fabricService.disconnect();
  }
});

// Get pending requests for a citizen
router.get('/citizens/:citizenId/pending-requests', async (req, res) => {
  try {
    const { citizenId } = req.params;
    
    const result = await fabricService.getPendingRequests(citizenId);
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Error getting pending requests:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to get pending requests'
    });
  } finally {
    await fabricService.disconnect();
  }
});

// Get request history for a citizen
router.get('/citizens/:citizenId/request-history', async (req, res) => {
  try {
    const { citizenId } = req.params;
    
    const result = await fabricService.getRequestHistory(citizenId);
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Error getting request history:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to get request history'
    });
  } finally {
    await fabricService.disconnect();
  }
});

// Request disclosure of citizen data
router.post('/request', async (req, res) => {
  try {
    const { requesterId, citizenId, attributes, purpose } = req.body;
    
    if (!requesterId || !citizenId || !attributes || !purpose) {
      return res.status(400).json({ error: 'Missing required fields: requesterId, citizenId, attributes, purpose' });
    }
    
    // Generate a unique request ID
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    // Try to connect to Fabric network
    const isConnected = await fabricService.connect('admin');
    
    if (isConnected) {
      // Submit transaction to the blockchain
      const result = await fabricService.submitTransaction(
        'disclosure', 
        'RequestDisclosure', 
        requestId, 
        requesterId, 
        citizenId, 
        JSON.stringify(attributes), 
        purpose
      );
      
      await fabricService.disconnect();
      res.status(201).json(result);
    } else {
      // Use mock implementation if Fabric network is not available
      console.log('Using mock implementation for RequestDisclosure');
      
      const request = {
        requestId,
        requesterId,
        citizenId,
        attributes,
        purpose,
        status: 'pending',
        created: Date.now(),
        updated: Date.now()
      };
      
      // Mock response
      res.status(201).json(request);
    }
  } catch (error) {
    console.error('Error requesting disclosure:', error);
    res.status(500).json({ error: error.message || 'Failed to request disclosure' });
  }
});

// Approve a disclosure request
router.post('/approve/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { citizenId } = req.body;
    
    if (!citizenId) {
      return res.status(400).json({ error: 'Missing required field: citizenId' });
    }
    
    // Try to connect to Fabric network
    const isConnected = await fabricService.connect('admin');
    
    if (isConnected) {
      // Submit transaction to the blockchain
      const result = await fabricService.submitTransaction(
        'disclosure', 
        'ApproveDisclosure', 
        requestId, 
        citizenId
      );
      
      await fabricService.disconnect();
      res.status(200).json(result);
    } else {
      // Use mock implementation if Fabric network is not available
      console.log('Using mock implementation for ApproveDisclosure');
      
      // Get existing clients to find the request (simplified)
      const clients = fabricService.mockClients || [];
      const client = clients.find(c => c.id === citizenId);
      
      if (client && client.verificationRequests) {
        const request = client.verificationRequests.find(r => r.id === requestId);
        if (request) {
          request.status = 'approved';
          request.updated = Date.now();
          res.status(200).json(request);
        } else {
          res.status(404).json({ error: 'Request not found' });
        }
      } else {
        res.status(404).json({ error: 'Citizen not found' });
      }
    }
  } catch (error) {
    console.error('Error approving disclosure:', error);
    res.status(500).json({ error: error.message || 'Failed to approve disclosure' });
  }
});

// Reject a disclosure request
router.post('/reject/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const { citizenId } = req.body;
    
    if (!citizenId) {
      return res.status(400).json({ error: 'Missing required field: citizenId' });
    }
    
    // Try to connect to Fabric network
    const isConnected = await fabricService.connect('admin');
    
    if (isConnected) {
      // Submit transaction to the blockchain
      const result = await fabricService.submitTransaction(
        'disclosure', 
        'RejectDisclosure', 
        requestId, 
        citizenId
      );
      
      await fabricService.disconnect();
      res.status(200).json(result);
    } else {
      // Use mock implementation if Fabric network is not available
      console.log('Using mock implementation for RejectDisclosure');
      
      // Get existing clients to find the request (simplified)
      const clients = fabricService.mockClients || [];
      const client = clients.find(c => c.id === citizenId);
      
      if (client && client.verificationRequests) {
        const request = client.verificationRequests.find(r => r.id === requestId);
        if (request) {
          request.status = 'rejected';
          request.updated = Date.now();
          res.status(200).json(request);
        } else {
          res.status(404).json({ error: 'Request not found' });
        }
      } else {
        res.status(404).json({ error: 'Citizen not found' });
      }
    }
  } catch (error) {
    console.error('Error rejecting disclosure:', error);
    res.status(500).json({ error: error.message || 'Failed to reject disclosure' });
  }
});

// Get pending disclosure requests for a citizen
router.get('/pending/:citizenId', async (req, res) => {
  try {
    const { citizenId } = req.params;
    
    // Try to connect to Fabric network
    const isConnected = await fabricService.connect('admin');
    
    if (isConnected) {
      // Evaluate transaction on the blockchain
      const result = await fabricService.evaluateTransaction(
        'disclosure', 
        'GetPendingRequests', 
        citizenId
      );
      
      await fabricService.disconnect();
      res.status(200).json(result);
    } else {
      // Use mock implementation if Fabric network is not available
      console.log('Using mock implementation for GetPendingRequests');
      
      // Get existing clients to find the requests (simplified)
      const clients = fabricService.mockClients || [];
      const client = clients.find(c => c.id === citizenId);
      
      if (client && client.verificationRequests) {
        const pendingRequests = client.verificationRequests.filter(r => r.status === 'pending');
        res.status(200).json(pendingRequests);
      } else {
        res.status(200).json([]); // Return empty array if no client or no requests
      }
    }
  } catch (error) {
    console.error('Error getting pending requests:', error);
    res.status(500).json({ error: error.message || 'Failed to get pending requests' });
  }
});

// Get all disclosure requests for a citizen
router.get('/history/:citizenId', async (req, res) => {
  try {
    const { citizenId } = req.params;
    
    // Try to connect to Fabric network
    const isConnected = await fabricService.connect('admin');
    
    if (isConnected) {
      // Evaluate transaction on the blockchain
      const result = await fabricService.evaluateTransaction(
        'disclosure', 
        'GetRequestHistory', 
        citizenId
      );
      
      await fabricService.disconnect();
      res.status(200).json(result);
    } else {
      // Use mock implementation if Fabric network is not available
      console.log('Using mock implementation for GetRequestHistory');
      
      // Get existing clients to find the requests (simplified)
      const clients = fabricService.mockClients || [];
      const client = clients.find(c => c.id === citizenId);
      
      if (client && client.verificationRequests) {
        res.status(200).json(client.verificationRequests);
      } else {
        res.status(200).json([]); // Return empty array if no client or no requests
      }
    }
  } catch (error) {
    console.error('Error getting request history:', error);
    res.status(500).json({ error: error.message || 'Failed to get request history' });
  }
});

export default router; 