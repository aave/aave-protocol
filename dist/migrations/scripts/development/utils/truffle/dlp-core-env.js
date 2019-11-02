"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var contracts_instances_provider_1 = require("./contracts-instances-provider");
var contracts_deployments_provider_1 = require("./contracts-deployments-provider");
var contracts_linkings_provider_1 = require("./contracts-linkings-provider");
var contracts_actions_provider_1 = require("./contracts-actions-provider");
var contracts_getters_by_network_1 = require("./contracts-getters-by-network");
var DlpCoreEnv = /** @class */ (function () {
    function DlpCoreEnv(artifacts) {
        this.artifacts = artifacts;
        this.contractsInstancesProvider = new contracts_instances_provider_1.ContractsInstancesProvider(artifacts);
        this.contractsDeploymentsProvider = new contracts_deployments_provider_1.ContractsDeploymentsProvider(artifacts);
        this.contractsLinkingsProvider = new contracts_linkings_provider_1.ContractsLinkingsProvider(artifacts);
        this.contractsActionsProvider = new contracts_actions_provider_1.ContractsActionsProvider(artifacts);
        this.contractGettersByNetwork = new contracts_getters_by_network_1.ContractsGettersByNetwork(artifacts);
    }
    return DlpCoreEnv;
}());
exports.DlpCoreEnv = DlpCoreEnv;
//# sourceMappingURL=dlp-core-env.js.map