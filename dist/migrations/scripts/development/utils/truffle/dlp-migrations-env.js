"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var dlp_core_env_1 = require("./dlp-core-env");
var app_root_path_1 = require("app-root-path");
var misc_utils_1 = require("../misc-utils");
var DlpMigrationsEnv = /** @class */ (function (_super) {
    __extends(DlpMigrationsEnv, _super);
    function DlpMigrationsEnv(artifacts) {
        var _this = _super.call(this, artifacts) || this;
        _this._setupMigrationEnv = function (deployer, network, introMessage) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!network) {
                            throw new Error("Error. Invalid Ethereum network " + network);
                        }
                        console.log("[" + network + "] " + introMessage);
                        return [4 /*yield*/, deployer];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); };
        _this._registerAllContractsAddressesInJson = function (network) { return function () { return __awaiter(_this, void 0, void 0, function () {
            var addressesDeployedContracts, _a, _b, contractsAddressesFilePath;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _b = (_a = this.contractsInstancesProvider).getAllAddressesFromInstances;
                        return [4 /*yield*/, this.contractsInstancesProvider.getCurrentDeployedInstancesFromArtifacts(network)];
                    case 1: return [4 /*yield*/, _b.apply(_a, [(_c.sent())
                                .deployedInstances])];
                    case 2:
                        addressesDeployedContracts = _c.sent();
                        contractsAddressesFilePath = app_root_path_1.path + "/migrations/" + (network) + "-deployed-addresses.json";
                        // Persistence in a json file of the addresses of contracts deployed by other contracts
                        return [4 /*yield*/, misc_utils_1.writeObjectToFile(contractsAddressesFilePath, addressesDeployedContracts)];
                    case 3:
                        // Persistence in a json file of the addresses of contracts deployed by other contracts
                        _c.sent();
                        return [2 /*return*/];
                }
            });
        }); }; };
        _this.getMigrationHandler = function (migrationMessage, migrationExecutor) {
            return function (deployer, network, accounts) { return __awaiter(_this, void 0, void 0, function () {
                var executorParams;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this._setupMigrationEnv(deployer, network, migrationMessage)];
                        case 1:
                            _a.sent();
                            executorParams = __assign({}, this.contractsInstancesProvider.getAllGetters(), this.contractsDeploymentsProvider.getAllDeploymentFunctions(deployer), this.contractsLinkingsProvider.getAllLinkingFunctions(deployer), this.contractsActionsProvider.getAllActionsFunctions(), this.contractGettersByNetwork.getAllGettersByNetwork(network, accounts), { registerAllContractsAddressesInJson: this._registerAllContractsAddressesInJson(network), ethereumNetwork: network, accounts: accounts });
                            return [4 /*yield*/, migrationExecutor(executorParams)];
                        case 2:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
        };
        return _this;
    }
    return DlpMigrationsEnv;
}(dlp_core_env_1.DlpCoreEnv));
exports.DlpMigrationsEnv = DlpMigrationsEnv;
exports.migrationHandler = function (migrationMessage, artifacts, migrationExecutor) { return new DlpMigrationsEnv(artifacts).getMigrationHandler(migrationMessage, migrationExecutor); };
//# sourceMappingURL=dlp-migrations-env.js.map