import express from 'express';
import cors from 'cors';
import fabricService from './src/services/fabricService.js';

const app = express();
const PORT = process.env.PORT || 8083;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all transactions
app.get('/api/transactions', async (req, res) => {
  try {
    const connected = await fabricService.connect('admin');
    if (!connected) {
      return res.status(503).json({ 
        status: 'error', 
        message: 'Failed to connect to Fabric network' 
      });
    }

    // Use the network object to query the ledger
    const network = fabricService.network;
    if (!network) {
      return res.status(503).json({ 
        status: 'error', 
        message: 'Not connected to Fabric network' 
      });
    }

    // Get transaction history for a key
    const result = await fabricService.evaluateTransaction('identity', 'GetHistoryForKey', 'clients');
    
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Error getting transactions:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message || 'Failed to retrieve transactions' 
    });
  } finally {
    await fabricService.disconnect();
  }
});

// Get transaction by ID
app.get('/api/transactions/:txId', async (req, res) => {
  try {
    const { txId } = req.params;
    const connected = await fabricService.connect('admin');
    if (!connected) {
      return res.status(503).json({ 
        status: 'error', 
        message: 'Failed to connect to Fabric network' 
      });
    }

    // Use mock implementation for transaction query
    if (!fabricService.isConnected) {
      return res.status(200).json({
        status: 'success',
        data: {
          txId,
          timestamp: new Date().toISOString(),
          channelId: 'mychannel',
          type: 'TRANSACTION',
          status: 'VALID',
          creator: 'admin',
          endorsers: ['peer0.org1.example.com', 'peer0.org2.example.com'],
          payload: 'Mock transaction data'
        }
      });
    }

    // In a real implementation, you would query the transaction from the ledger
    // This would require additional Fabric SDK functionality
    res.status(501).json({ 
      status: 'error', 
      message: 'Transaction query by ID not implemented in this version' 
    });
  } catch (error) {
    console.error('Error getting transaction:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message || 'Failed to retrieve transaction'
    });
  } finally {
    await fabricService.disconnect();
  }
});

// Get channel blocks
app.get('/api/blocks', async (req, res) => {
  try {
    const connected = await fabricService.connect('admin');
    if (!connected) {
      return res.status(503).json({ 
        status: 'error', 
        message: 'Failed to connect to Fabric network' 
      });
    }

    // Use mock implementation
    if (!fabricService.isConnected) {
      return res.status(200).json({
        status: 'success',
        data: [
          {
            blockNum: 1,
            dataHash: '4abc123...',
            previousHash: '1234abc...',
            timestamp: new Date().toISOString(),
            txCount: 1
          },
          {
            blockNum: 2,
            dataHash: '5def456...',
            previousHash: '4abc123...',
            timestamp: new Date().toISOString(),
            txCount: 2
          }
        ]
      });
    }

    res.status(501).json({ 
      status: 'error', 
      message: 'Block query not implemented in this version' 
    });
  } catch (error) {
    console.error('Error getting blocks:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message || 'Failed to retrieve blocks' 
    });
  } finally {
    await fabricService.disconnect();
  }
});

// Get specific block
app.get('/api/blocks/:blockNum', async (req, res) => {
  try {
    const { blockNum } = req.params;
    const connected = await fabricService.connect('admin');
    if (!connected) {
      return res.status(503).json({ 
        status: 'error', 
        message: 'Failed to connect to Fabric network' 
      });
    }

    // Use mock implementation
    if (!fabricService.isConnected) {
      return res.status(200).json({
        status: 'success',
        data: {
          blockNum: parseInt(blockNum),
          dataHash: '4abc123...',
          previousHash: '1234abc...',
          timestamp: new Date().toISOString(),
          txCount: 1,
          transactions: [
            {
              txId: 'tx123',
              type: 'ENDORSER_TRANSACTION',
              status: 'VALID'
            }
          ]
        }
      });
    }

    res.status(501).json({ 
      status: 'error', 
      message: 'Block query not implemented in this version' 
    });
  } catch (error) {
    console.error('Error getting block:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message || 'Failed to retrieve block' 
    });
  } finally {
    await fabricService.disconnect();
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Transaction Explorer running at http://localhost:${PORT}`);
}); 