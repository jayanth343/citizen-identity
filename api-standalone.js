const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 8080;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Basic connection test
app.get('/fabric-connection', (req, res) => {
  const connectionStatus = {
    connected: true,
    timestamp: new Date().toISOString()
  };

  try {
    const configPath = path.join(__dirname, '..', 'crypto-config', 'connection-org1.json');
    connectionStatus.configExists = fs.existsSync(configPath);
  } catch (error) {
    connectionStatus.configExists = false;
    connectionStatus.error = error.message;
    connectionStatus.connected = false;
  }

  res.json(connectionStatus);
});

// Detailed diagnostics 
app.get('/fabric-diagnostics', (req, res) => {
  const diagnostics = {
    status: 'success',
    connectionFileExists: false,
    tlsCertExists: false,
    timestamp: new Date().toISOString()
  };

  // Check connection config
  try {
    const configPath = path.join(__dirname, '..', 'crypto-config', 'connection-org1.json');
    diagnostics.connectionFileExists = fs.existsSync(configPath);
  } catch (error) {
    console.error('Error checking connection file:', error);
  }

  // Check Docker containers
  exec('docker ps', (error, stdout, stderr) => {
    if (error) {
      diagnostics.status = 'error';
      diagnostics.error = error.message;
      return res.status(500).json(diagnostics);
    }

    if (stderr) {
      diagnostics.status = 'error';
      diagnostics.error = stderr;
      return res.status(500).json(diagnostics);
    }

    diagnostics.dockerContainers = stdout;
    
    // Get peer logs
    if (stdout.includes('peer0.org1.example.com')) {
      exec('docker logs --tail 20 peer0.org1.example.com', (error, peerLogs, stderr) => {
        if (!error) {
          diagnostics.peerLogs = peerLogs;
        }
        
        // Get orderer logs
        if (stdout.includes('orderer.example.com')) {
          exec('docker logs --tail 20 orderer.example.com', (error, ordererLogs, stderr) => {
            if (!error) {
              diagnostics.ordererLogs = ordererLogs;
            }
            
            return res.json(diagnostics);
          });
        } else {
          return res.json(diagnostics);
        }
      });
    } else {
      return res.json(diagnostics);
    }
  });
});

// Mock response when network is not available
app.get('/test-connection', (req, res) => {
  const response = {
    status: "success",
    configExists: true,
    tlsCertExists: false,
    fabricPeerStatus: "checking"
  };

  // Try to check if peer container is running
  exec('docker ps | grep peer0.org1.example.com', (error, stdout, stderr) => {
    if (error || !stdout) {
      response.fabricPeerStatus = "peer container not running";
    } else {
      response.fabricPeerStatus = "peer container is running";
    }
    res.json(response);
  });
});

app.listen(port, () => {
  console.log(`Fabric API service listening at http://localhost:${port}`);
  console.log(`Health endpoint: http://localhost:${port}/health`);
  console.log(`Connection test: http://localhost:${port}/fabric-connection`);
  console.log(`Diagnostics: http://localhost:${port}/fabric-diagnostics`);
}); 