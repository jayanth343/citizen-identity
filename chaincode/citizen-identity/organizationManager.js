'use strict';

const { Contract } = require('fabric-contract-api');

class OrganizationManager extends Contract {
    
    async initLedger(ctx) {
        console.info('============= Initializing Organization Ledger ===========');
        const organizations = [
            {
                id: 'org1',
                name: 'Organization 1',
                type: 'issuer',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: 'org2',
                name: 'Organization 2',
                type: 'verifier',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];
        
        for (let i = 0; i < organizations.length; i++) {
            const org = organizations[i];
            await ctx.stub.putState(org.id, Buffer.from(JSON.stringify(org)));
            console.info(`Added organization ${org.id}: ${org.name}`);
        }
        
        // Initialize issuers
        const issuers = [
            {
                id: 'issuer1',
                name: 'Issuer 1',
                organization: 'org1',
                issuedCredentials: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];
        
        for (let i = 0; i < issuers.length; i++) {
            const issuer = issuers[i];
            await ctx.stub.putState(`issuer_${issuer.id}`, Buffer.from(JSON.stringify(issuer)));
            console.info(`Added issuer ${issuer.id}: ${issuer.name}`);
        }
        
        // Initialize verifiers
        const verifiers = [
            {
                id: 'verifier1',
                name: 'Verifier 1',
                organization: 'org2',
                verificationRequests: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ];
        
        for (let i = 0; i < verifiers.length; i++) {
            const verifier = verifiers[i];
            await ctx.stub.putState(`verifier_${verifier.id}`, Buffer.from(JSON.stringify(verifier)));
            console.info(`Added verifier ${verifier.id}: ${verifier.name}`);
        }
        
        console.info('============= Organization Ledger Initialized ===========');
    }
    
    // Organization CRUD operations
    async createOrganization(ctx, id, name, type) {
        console.info('============= Creating Organization ===========');
        
        const exists = await this.organizationExists(ctx, id);
        if (exists) {
            throw new Error(`Organization with ID ${id} already exists`);
        }
        
        const organization = {
            id,
            name,
            type,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        await ctx.stub.putState(id, Buffer.from(JSON.stringify(organization)));
        return organization;
    }
    
    async getOrganization(ctx, id) {
        console.info('============= Getting Organization ===========');
        
        const organizationJSON = await ctx.stub.getState(id);
        if (!organizationJSON || organizationJSON.length === 0) {
            return null;
        }
        
        return JSON.parse(organizationJSON.toString());
    }
    
    async organizationExists(ctx, id) {
        const organizationJSON = await ctx.stub.getState(id);
        return organizationJSON && organizationJSON.length > 0;
    }
    
    async updateOrganization(ctx, id, name, type) {
        console.info('============= Updating Organization ===========');
        
        const exists = await this.organizationExists(ctx, id);
        if (!exists) {
            throw new Error(`Organization with ID ${id} does not exist`);
        }
        
        const organization = await this.getOrganization(ctx, id);
        organization.name = name;
        organization.type = type;
        organization.updatedAt = new Date().toISOString();
        
        await ctx.stub.putState(id, Buffer.from(JSON.stringify(organization)));
        return organization;
    }
    
    async deleteOrganization(ctx, id) {
        console.info('============= Deleting Organization ===========');
        
        const exists = await this.organizationExists(ctx, id);
        if (!exists) {
            throw new Error(`Organization with ID ${id} does not exist`);
        }
        
        await ctx.stub.deleteState(id);
    }
    
    async getAllOrganizations(ctx) {
        console.info('============= Getting All Organizations ===========');
        
        const startKey = '';
        const endKey = '';
        
        const iterator = await ctx.stub.getStateByRange(startKey, endKey);
        
        const organizations = [];
        let result = await iterator.next();
        
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            
            try {
                record = JSON.parse(strValue);
                // Only include records that are organizations (not issuers or verifiers)
                if (!result.value.key.toString().startsWith('issuer_') && 
                    !result.value.key.toString().startsWith('verifier_')) {
                    organizations.push(record);
                }
            } catch (err) {
                console.log(err);
            }
            
            result = await iterator.next();
        }
        
        await iterator.close();
        return organizations;
    }
    
    // Issuer CRUD operations
    async createIssuer(ctx, id, name, organization) {
        console.info('============= Creating Issuer ===========');
        
        const issuerKey = `issuer_${id}`;
        const exists = await this.issuerExists(ctx, id);
        if (exists) {
            throw new Error(`Issuer with ID ${id} already exists`);
        }
        
        // Check if the organization exists
        const orgExists = await this.organizationExists(ctx, organization);
        if (!orgExists) {
            throw new Error(`Organization with ID ${organization} does not exist`);
        }
        
        const issuer = {
            id,
            name,
            organization,
            issuedCredentials: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        await ctx.stub.putState(issuerKey, Buffer.from(JSON.stringify(issuer)));
        return issuer;
    }
    
    async getIssuer(ctx, id) {
        console.info('============= Getting Issuer ===========');
        
        const issuerKey = `issuer_${id}`;
        const issuerJSON = await ctx.stub.getState(issuerKey);
        if (!issuerJSON || issuerJSON.length === 0) {
            return null;
        }
        
        return JSON.parse(issuerJSON.toString());
    }
    
    async issuerExists(ctx, id) {
        const issuerKey = `issuer_${id}`;
        const issuerJSON = await ctx.stub.getState(issuerKey);
        return issuerJSON && issuerJSON.length > 0;
    }
    
    async getAllIssuers(ctx) {
        console.info('============= Getting All Issuers ===========');
        
        const startKey = 'issuer_';
        const endKey = 'issuer_~';
        
        const iterator = await ctx.stub.getStateByRange(startKey, endKey);
        
        const issuers = [];
        let result = await iterator.next();
        
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            
            try {
                record = JSON.parse(strValue);
                issuers.push(record);
            } catch (err) {
                console.log(err);
            }
            
            result = await iterator.next();
        }
        
        await iterator.close();
        return issuers;
    }
    
    // Verifier CRUD operations
    async createVerifier(ctx, id, name, organization) {
        console.info('============= Creating Verifier ===========');
        
        const verifierKey = `verifier_${id}`;
        const exists = await this.verifierExists(ctx, id);
        if (exists) {
            throw new Error(`Verifier with ID ${id} already exists`);
        }
        
        // Check if the organization exists
        const orgExists = await this.organizationExists(ctx, organization);
        if (!orgExists) {
            throw new Error(`Organization with ID ${organization} does not exist`);
        }
        
        const verifier = {
            id,
            name,
            organization,
            verificationRequests: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        await ctx.stub.putState(verifierKey, Buffer.from(JSON.stringify(verifier)));
        return verifier;
    }
    
    async getVerifier(ctx, id) {
        console.info('============= Getting Verifier ===========');
        
        const verifierKey = `verifier_${id}`;
        const verifierJSON = await ctx.stub.getState(verifierKey);
        if (!verifierJSON || verifierJSON.length === 0) {
            return null;
        }
        
        return JSON.parse(verifierJSON.toString());
    }
    
    async verifierExists(ctx, id) {
        const verifierKey = `verifier_${id}`;
        const verifierJSON = await ctx.stub.getState(verifierKey);
        return verifierJSON && verifierJSON.length > 0;
    }
    
    async getAllVerifiers(ctx) {
        console.info('============= Getting All Verifiers ===========');
        
        const startKey = 'verifier_';
        const endKey = 'verifier_~';
        
        const iterator = await ctx.stub.getStateByRange(startKey, endKey);
        
        const verifiers = [];
        let result = await iterator.next();
        
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            
            try {
                record = JSON.parse(strValue);
                verifiers.push(record);
            } catch (err) {
                console.log(err);
            }
            
            result = await iterator.next();
        }
        
        await iterator.close();
        return verifiers;
    }
}

module.exports = OrganizationManager; 