const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// Import routes
const identityRoutes = require('./routes/identityRoutes');
const documentRoutes = require('./routes/documentRoutes');
const disclosureRoutes = require('./routes/disclosureRoutes');

// Initialize the application
const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static file serving for uploads if needed
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Fabric network status endpoint
app.get('/fabric-status', async (req, res) => {
  try {
    // Check if we're in mock mode
    if (process.env.FABRIC_MOCK === 'true') {
      return res.status(200).json({
        status: 'success',
        connected: false,
        mode: 'mock',
        message: 'Running in mock mode'
      });
    }

    // Try to connect to Fabric - implement real connection check here
    const connected = false; // Replace with actual connection check
    
    res.status(200).json({
      status: 'success',
      connected,
      mode: connected ? 'fabric' : 'mock',
      message: connected ? 'Connected to Fabric network' : 'Not connected to Fabric network'
    });
  } catch (error) {
    console.error('Error checking Fabric status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check Fabric status',
      error: error.message
    });
  }
});

// Setup routes
app.use('/api', identityRoutes);
app.use('/api', documentRoutes);
app.use('/api', disclosureRoutes);

// Legacy endpoints from the TypeScript implementation
// These are kept for backward compatibility and will be deprecated
app.get('/api/fabric/status', (req, res) => {
  try {
    // This is a simple status check that doesn't require Fabric connection
    res.status(200).json({
      status: 'success',
      message: 'Fabric service is available',
      details: {
        mode: process.env.FABRIC_MOCK === 'true' ? 'mock' : 'blockchain',
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error checking Fabric status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check Fabric status',
      error: error.message
    });
  }
});

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'An unknown error occurred',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Mock mode: ${process.env.FABRIC_MOCK === 'true' ? 'Enabled' : 'Disabled'}`);
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Shutting down...');
  console.error(err);
  process.exit(1);
});

module.exports = app; 