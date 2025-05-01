const { Contract } = require('fabric-contract-api');

class DocumentRegistry extends Contract {
    async InitLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        console.info('============= END : Initialize Ledger ===========');
    }

    async RegisterDocument(ctx, documentId, documentType, documentHash, ownerId, metadata) {
        console.info('============= START : Register Document ===========');

        const document = {
            docType: 'document',
            documentId,
            documentType,
            documentHash,
            ownerId,
            metadata: JSON.parse(metadata),
            verified: false,
            verificationDate: null,
            created: ctx.stub.getTxTimestamp().seconds.low,
            updated: ctx.stub.getTxTimestamp().seconds.low
        };

        await ctx.stub.putState(documentId, Buffer.from(JSON.stringify(document)));
        console.info('============= END : Register Document ===========');
        return JSON.stringify(document);
    }

    async GetDocument(ctx, documentId) {
        console.info('============= START : Get Document ===========');
        const documentAsBytes = await ctx.stub.getState(documentId);
        if (!documentAsBytes || documentAsBytes.length === 0) {
            throw new Error(`Document ${documentId} does not exist`);
        }
        console.info('============= END : Get Document ===========');
        return documentAsBytes.toString();
    }

    async VerifyDocument(ctx, documentId, verifierId, verificationResult) {
        console.info('============= START : Verify Document ===========');
        const documentAsBytes = await ctx.stub.getState(documentId);
        if (!documentAsBytes || documentAsBytes.length === 0) {
            throw new Error(`Document ${documentId} does not exist`);
        }

        const document = JSON.parse(documentAsBytes.toString());
        document.verified = verificationResult === 'true';
        document.verificationDate = ctx.stub.getTxTimestamp().seconds.low;
        document.verifierId = verifierId;
        document.updated = ctx.stub.getTxTimestamp().seconds.low;

        await ctx.stub.putState(documentId, Buffer.from(JSON.stringify(document)));
        console.info('============= END : Verify Document ===========');
        return JSON.stringify(document);
    }

    async GetDocumentsByOwner(ctx, ownerId) {
        console.info('============= START : Get Documents By Owner ===========');
        const queryString = {
            selector: {
                docType: 'document',
                ownerId: ownerId
            }
        };

        const queryResults = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        const results = [];
        let result = await queryResults.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            results.push(record);
            result = await queryResults.next();
        }
        console.info('============= END : Get Documents By Owner ===========');
        return JSON.stringify(results);
    }

    async GetVerifiedDocuments(ctx) {
        console.info('============= START : Get Verified Documents ===========');
        const queryString = {
            selector: {
                docType: 'document',
                verified: true
            }
        };

        const queryResults = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        const results = [];
        let result = await queryResults.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            results.push(record);
            result = await queryResults.next();
        }
        console.info('============= END : Get Verified Documents ===========');
        return JSON.stringify(results);
    }
}

module.exports = DocumentRegistry; 