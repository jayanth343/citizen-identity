const { Contract } = require('fabric-contract-api');

class DisclosureManager extends Contract {
    async InitLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        console.info('============= END : Initialize Ledger ===========');
    }

    async RequestDisclosure(ctx, requestId, requesterId, citizenId, attributes, purpose) {
        console.info('============= START : Request Disclosure ===========');

        const request = {
            docType: 'disclosureRequest',
            requestId,
            requesterId,
            citizenId,
            attributes: JSON.parse(attributes),
            purpose,
            status: 'pending',
            created: ctx.stub.getTxTimestamp().seconds.low,
            updated: ctx.stub.getTxTimestamp().seconds.low
        };

        await ctx.stub.putState(requestId, Buffer.from(JSON.stringify(request)));
        console.info('============= END : Request Disclosure ===========');
        return JSON.stringify(request);
    }

    async ApproveDisclosure(ctx, requestId, citizenId) {
        console.info('============= START : Approve Disclosure ===========');
        const requestAsBytes = await ctx.stub.getState(requestId);
        if (!requestAsBytes || requestAsBytes.length === 0) {
            throw new Error(`Request ${requestId} does not exist`);
        }

        const request = JSON.parse(requestAsBytes.toString());
        if (request.citizenId !== citizenId) {
            throw new Error('Only the citizen can approve the request');
        }

        request.status = 'approved';
        request.updated = ctx.stub.getTxTimestamp().seconds.low;

        await ctx.stub.putState(requestId, Buffer.from(JSON.stringify(request)));
        console.info('============= END : Approve Disclosure ===========');
        return JSON.stringify(request);
    }

    async RejectDisclosure(ctx, requestId, citizenId) {
        console.info('============= START : Reject Disclosure ===========');
        const requestAsBytes = await ctx.stub.getState(requestId);
        if (!requestAsBytes || requestAsBytes.length === 0) {
            throw new Error(`Request ${requestId} does not exist`);
        }

        const request = JSON.parse(requestAsBytes.toString());
        if (request.citizenId !== citizenId) {
            throw new Error('Only the citizen can reject the request');
        }

        request.status = 'rejected';
        request.updated = ctx.stub.getTxTimestamp().seconds.low;

        await ctx.stub.putState(requestId, Buffer.from(JSON.stringify(request)));
        console.info('============= END : Reject Disclosure ===========');
        return JSON.stringify(request);
    }

    async GetDisclosureRequest(ctx, requestId) {
        console.info('============= START : Get Disclosure Request ===========');
        const requestAsBytes = await ctx.stub.getState(requestId);
        if (!requestAsBytes || requestAsBytes.length === 0) {
            throw new Error(`Request ${requestId} does not exist`);
        }
        console.info('============= END : Get Disclosure Request ===========');
        return requestAsBytes.toString();
    }

    async GetPendingRequests(ctx, citizenId) {
        console.info('============= START : Get Pending Requests ===========');
        const queryString = {
            selector: {
                docType: 'disclosureRequest',
                citizenId: citizenId,
                status: 'pending'
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
        console.info('============= END : Get Pending Requests ===========');
        return JSON.stringify(results);
    }

    async GetRequestHistory(ctx, citizenId) {
        console.info('============= START : Get Request History ===========');
        const queryString = {
            selector: {
                docType: 'disclosureRequest',
                citizenId: citizenId
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
        console.info('============= END : Get Request History ===========');
        return JSON.stringify(results);
    }
}

module.exports = DisclosureManager; 