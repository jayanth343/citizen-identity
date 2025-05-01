const { Contract } = require('fabric-contract-api');

class AccessControl extends Contract {
    async InitLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        console.info('============= END : Initialize Ledger ===========');
    }

    async CreateRole(ctx, roleId, roleName, permissions) {
        console.info('============= START : Create Role ===========');

        const role = {
            docType: 'role',
            roleId,
            roleName,
            permissions: JSON.parse(permissions),
            created: ctx.stub.getTxTimestamp().seconds.low,
            updated: ctx.stub.getTxTimestamp().seconds.low
        };

        await ctx.stub.putState(roleId, Buffer.from(JSON.stringify(role)));
        console.info('============= END : Create Role ===========');
        return JSON.stringify(role);
    }

    async AssignRole(ctx, userId, roleId) {
        console.info('============= START : Assign Role ===========');

        const roleAssignment = {
            docType: 'roleAssignment',
            userId,
            roleId,
            assigned: ctx.stub.getTxTimestamp().seconds.low
        };

        const key = `roleAssignment:${userId}:${roleId}`;
        await ctx.stub.putState(key, Buffer.from(JSON.stringify(roleAssignment)));
        console.info('============= END : Assign Role ===========');
        return JSON.stringify(roleAssignment);
    }

    async RevokeRole(ctx, userId, roleId) {
        console.info('============= START : Revoke Role ===========');
        const key = `roleAssignment:${userId}:${roleId}`;
        await ctx.stub.deleteState(key);
        console.info('============= END : Revoke Role ===========');
        return `Role ${roleId} revoked from user ${userId}`;
    }

    async CheckPermission(ctx, userId, permission) {
        console.info('============= START : Check Permission ===========');
        const queryString = {
            selector: {
                docType: 'roleAssignment',
                userId: userId
            }
        };

        const queryResults = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        let result = await queryResults.next();
        
        while (!result.done) {
            const roleAssignment = JSON.parse(result.value.value.toString());
            const roleAsBytes = await ctx.stub.getState(roleAssignment.roleId);
            if (roleAsBytes && roleAsBytes.length > 0) {
                const role = JSON.parse(roleAsBytes.toString());
                if (role.permissions.includes(permission)) {
                    console.info('============= END : Check Permission ===========');
                    return 'true';
                }
            }
            result = await queryResults.next();
        }

        console.info('============= END : Check Permission ===========');
        return 'false';
    }

    async GetUserRoles(ctx, userId) {
        console.info('============= START : Get User Roles ===========');
        const queryString = {
            selector: {
                docType: 'roleAssignment',
                userId: userId
            }
        };

        const queryResults = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        const results = [];
        let result = await queryResults.next();
        
        while (!result.done) {
            const roleAssignment = JSON.parse(result.value.value.toString());
            const roleAsBytes = await ctx.stub.getState(roleAssignment.roleId);
            if (roleAsBytes && roleAsBytes.length > 0) {
                const role = JSON.parse(roleAsBytes.toString());
                results.push(role);
            }
            result = await queryResults.next();
        }

        console.info('============= END : Get User Roles ===========');
        return JSON.stringify(results);
    }

    async GetRolePermissions(ctx, roleId) {
        console.info('============= START : Get Role Permissions ===========');
        const roleAsBytes = await ctx.stub.getState(roleId);
        if (!roleAsBytes || roleAsBytes.length === 0) {
            throw new Error(`Role ${roleId} does not exist`);
        }

        const role = JSON.parse(roleAsBytes.toString());
        console.info('============= END : Get Role Permissions ===========');
        return JSON.stringify(role.permissions);
    }
}

module.exports = AccessControl; 