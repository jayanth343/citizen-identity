'use strict';

const OrganizationManager = require('./organizationManager');

// Simulating other chaincode contracts
class CitizenIdentity extends OrganizationManager {
    constructor() {
        super('CitizenIdentity');
    }
}

class AccessControl extends OrganizationManager {
    constructor() {
        super('AccessControl');
    }
}

class DisclosureManager extends OrganizationManager {
    constructor() {
        super('DisclosureManager');
    }
}

class DocumentRegistry extends OrganizationManager {
    constructor() {
        super('DocumentRegistry');
    }
}

module.exports.OrganizationManager = OrganizationManager;
module.exports.CitizenIdentity = CitizenIdentity;
module.exports.AccessControl = AccessControl;
module.exports.DisclosureManager = DisclosureManager;
module.exports.DocumentRegistry = DocumentRegistry; 