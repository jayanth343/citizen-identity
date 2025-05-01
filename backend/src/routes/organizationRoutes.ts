import express from 'express';

const router = express.Router();

// Define organizations
const organizations = [
  {
    id: "org1",
    name: "Organization 1",
    domain: "org1.example.com",
    type: "issuer",
    peers: 2,
    users: 1
  },
  {
    id: "org2", 
    name: "Organization 2",
    domain: "org2.example.com", 
    type: "verifier",
    peers: 2,
    users: 1
  }
];

// Define issuers (Org1 has an issuer)
const issuers = [
  {
    id: "issuer1",
    name: "Issuer 1",
    organization: "org1",
    domain: "org1.example.com"
  }
];

// Get all organizations
router.get('/', (req, res) => {
  res.status(200).json(organizations);
});

// Get a specific organization
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const organization = organizations.find(org => org.id === id);
  
  if (!organization) {
    return res.status(404).json({ error: 'Organization not found' });
  }
  
  res.status(200).json(organization);
});

// Get all issuers
router.get('/issuers', (req, res) => {
  res.status(200).json(issuers);
});

// Get a specific issuer
router.get('/issuers/:id', (req, res) => {
  const { id } = req.params;
  const issuer = issuers.find(i => i.id === id);
  
  if (!issuer) {
    return res.status(404).json({ error: 'Issuer not found' });
  }
  
  res.status(200).json(issuer);
});

export default router; 