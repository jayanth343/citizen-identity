import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Store addresses and their assigned organizations/roles
// In a production app this would be in a database
const addressMappings = new Map<string, any>();

// Define predefined organizations
const organizations = [
  {
    id: "org1",
    name: "Organization 1",
    domain: "org1.example.com",
    type: "issuer",
  },
  {
    id: "org2", 
    name: "Organization 2",
    domain: "org2.example.com", 
    type: "verifier",
  }
];

// Verify an ethereum address and link it to an organization and role
router.get('/verify', (req, res) => {
  const { address } = req.query;
  
  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Address is required' });
  }
  
  // Check if address already has a mapping
  if (addressMappings.has(address)) {
    return res.status(200).json(addressMappings.get(address));
  }
  
  // For now, assign random organization and role (for demo)
  // In production, you would have a proper registration and verification system
  
  // Choose random organization
  const organization = organizations[Math.floor(Math.random() * organizations.length)];
  const roles = ['client', 'issuer', 'verifier'];
  const role = roles[Math.floor(Math.random() * roles.length)] as 'client' | 'issuer' | 'verifier';
  
  const userInfo = {
    address,
    organization: organization.id,
    organizationName: organization.name,
    role,
    timestamp: Date.now()
  };
  
  // Store mapping for future reference
  addressMappings.set(address, userInfo);
  
  res.status(200).json(userInfo);
});

// Register an address to a specific organization and role
router.post('/register', (req, res) => {
  const { address, organization, role } = req.body;
  
  if (!address || !organization || !role) {
    return res.status(400).json({ error: 'Address, organization, and role are required' });
  }
  
  // Validate organization exists
  const existingOrg = organizations.find(org => org.id === organization);
  if (!existingOrg) {
    return res.status(404).json({ error: 'Organization not found' });
  }
  
  // Validate role
  const validRoles = ['client', 'issuer', 'verifier'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  
  const userInfo = {
    address,
    organization,
    organizationName: existingOrg.name,
    role,
    timestamp: Date.now()
  };
  
  // Store mapping
  addressMappings.set(address, userInfo);
  
  res.status(201).json(userInfo);
});

export default router; 