import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fabricService from './src/services/fabricService.js';

const app = express();
const PORT = 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Test server is running' });
});

// Test fabric connection
app.get('/fabric/test', async (req, res) => {
  try {
    await fabricService.connect('admin');
    res.json({ success: true, message: 'Successfully connected to Fabric network' });
  } catch (error) {
    console.error('Error connecting to Fabric:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to connect to Fabric network' 
    });
  } finally {
    // Always disconnect after testing
    try {
      await fabricService.disconnect();
    } catch (disconnectError) {
      console.error('Error disconnecting from Fabric:', disconnectError);
    }
  }
});

// Request verification endpoint
app.post('/verification/request', async (req, res) => {
  const { requesterId, verifierId, attributes } = req.body;
  
  if (!requesterId || !verifierId || !attributes || !Array.isArray(attributes)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields: requesterId, verifierId, or attributes' 
    });
  }

  try {
    await fabricService.connect('admin');
    
    const requestId = uuidv4();
    await fabricService.requestVerification(requestId, requesterId, verifierId, attributes);
    
    res.json({ 
      success: true, 
      message: 'Verification request submitted successfully',
      requestId 
    });
  } catch (error) {
    console.error('Error requesting verification:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to submit verification request' 
    });
  } finally {
    try {
      await fabricService.disconnect();
    } catch (disconnectError) {
      console.error('Error disconnecting from Fabric:', disconnectError);
    }
  }
});

// Respond to verification endpoint
app.post('/verification/respond', async (req, res) => {
  const { requestId, approved } = req.body;
  
  if (!requestId || approved === undefined) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields: requestId or approved status' 
    });
  }

  try {
    await fabricService.connect('admin');
    
    await fabricService.respondToVerification(requestId, approved);
    
    res.json({ 
      success: true, 
      message: `Verification request ${approved ? 'approved' : 'rejected'} successfully` 
    });
  } catch (error) {
    console.error('Error responding to verification:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to respond to verification request' 
    });
  } finally {
    try {
      await fabricService.disconnect();
    } catch (disconnectError) {
      console.error('Error disconnecting from Fabric:', disconnectError);
    }
  }
});

app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
}); 