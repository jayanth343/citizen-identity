const { Contract } = require('fabric-contract-api');

class CitizenIdentity extends Contract {
    async InitLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        console.info('============= END : Initialize Ledger ===========');
    }

    async CreateIdentity(ctx, citizenId, name, dateOfBirth, nationality, address) {
        console.info('============= START : Create Identity ===========');

        const identity = {
            docType: 'identity',
            citizenId,
            name,
            dateOfBirth,
            nationality,
            address,
            documents: [],
            created: ctx.stub.getTxTimestamp().seconds.low,
            updated: ctx.stub.getTxTimestamp().seconds.low
        };

        await ctx.stub.putState(citizenId, Buffer.from(JSON.stringify(identity)));
        console.info('============= END : Create Identity ===========');
        return JSON.stringify(identity);
    }

    async GetIdentity(ctx, citizenId) {
        console.info('============= START : Get Identity ===========');
        const identityAsBytes = await ctx.stub.getState(citizenId);
        if (!identityAsBytes || identityAsBytes.length === 0) {
            throw new Error(`Identity ${citizenId} does not exist`);
        }
        console.info('============= END : Get Identity ===========');
        return identityAsBytes.toString();
    }

    async UpdateIdentity(ctx, citizenId, name, dateOfBirth, nationality, address) {
        console.info('============= START : Update Identity ===========');
        const identityAsBytes = await ctx.stub.getState(citizenId);
        if (!identityAsBytes || identityAsBytes.length === 0) {
            throw new Error(`Identity ${citizenId} does not exist`);
        }

        const identity = JSON.parse(identityAsBytes.toString());
        identity.name = name;
        identity.dateOfBirth = dateOfBirth;
        identity.nationality = nationality;
        identity.address = address;
        identity.updated = ctx.stub.getTxTimestamp().seconds.low;

        await ctx.stub.putState(citizenId, Buffer.from(JSON.stringify(identity)));
        console.info('============= END : Update Identity ===========');
        return JSON.stringify(identity);
    }

    async AddDocument(ctx, citizenId, documentId, documentType, documentHash) {
        console.info('============= START : Add Document ===========');
        const identityAsBytes = await ctx.stub.getState(citizenId);
        if (!identityAsBytes || identityAsBytes.length === 0) {
            throw new Error(`Identity ${citizenId} does not exist`);
        }

        const identity = JSON.parse(identityAsBytes.toString());
        const document = {
            documentId,
            documentType,
            documentHash,
            uploadDate: ctx.stub.getTxTimestamp().seconds.low
        };

        identity.documents.push(document);
        identity.updated = ctx.stub.getTxTimestamp().seconds.low;

        await ctx.stub.putState(citizenId, Buffer.from(JSON.stringify(identity)));
        console.info('============= END : Add Document ===========');
        return JSON.stringify(document);
    }

    async GetDocuments(ctx, citizenId) {
        console.info('============= START : Get Documents ===========');
        const identityAsBytes = await ctx.stub.getState(citizenId);
        if (!identityAsBytes || identityAsBytes.length === 0) {
            throw new Error(`Identity ${citizenId} does not exist`);
        }

        const identity = JSON.parse(identityAsBytes.toString());
        console.info('============= END : Get Documents ===========');
        return JSON.stringify(identity.documents);
    }
}

module.exports = CitizenIdentity; 