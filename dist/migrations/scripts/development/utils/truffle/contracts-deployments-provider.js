"use strict";
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
var types_1 = require("../types");
var truffle_core_utils_1 = require("./truffle-core-utils");
var ContractsDeploymentsProvider = /** @class */ (function () {
    function ContractsDeploymentsProvider(artifacts) {
        var _this = this;
        this.artifacts = artifacts;
        this.deployContract = function (deployer, contractId, args) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, truffle_core_utils_1.deployContractTruffle(this.artifacts, deployer, contractId, args)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        }); };
        this._deployMigrationsContract = function (deployer) {
            return function (args) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.deployContract(deployer, types_1.ContractId.Migrations, args)];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            }); };
        };
        this._deployAllMockTokens = function (deployer) {
            return function () { return __awaiter(_this, void 0, void 0, function () {
                var _i, _a, mockTokenContractName;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _i = 0, _a = Object.keys(types_1.MockTokenContractId);
                            _b.label = 1;
                        case 1:
                            if (!(_i < _a.length)) return [3 /*break*/, 4];
                            mockTokenContractName = _a[_i];
                            return [4 /*yield*/, this.deployContract(deployer, mockTokenContractName)];
                        case 2:
                            _b.sent();
                            _b.label = 3;
                        case 3:
                            _i++;
                            return [3 /*break*/, 1];
                        case 4: return [2 /*return*/];
                    }
                });
            }); };
        };
        this._deployMockFlashLoanReceiver = function (deployer) {
            return function (args) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.deployContract(deployer, types_1.ContractId.MockFlashLoanReceiver, args)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); };
        };
        this._deployLendingPoolAddressesProvider = function (deployer) {
            return function (args) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.deployContract(deployer, types_1.ContractId.LendingPoolAddressesProvider, args)];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            }); };
        };
        this._deployFeeProviderContract = function (deployer) {
            return function (args) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.deployContract(deployer, types_1.ContractId.FeeProvider, args)];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            }); };
        };
        this._deployNetworkMetadataProviderContract = function (deployer) {
            return function (args) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.deployContract(deployer, types_1.ContractId.NetworkMetadataProvider, args)];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            }); };
        };
        this._deployLendingPoolParametersProvider = function (deployer) {
            return function (args) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.deployContract(deployer, types_1.ContractId.LendingPoolParametersProvider, args)];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            }); };
        };
        // // TODO: review this. Typechain is not generating the types CoreLibraryContract CoreLibraryInstance
        this._deployCoreLibraryLibrary = function (deployer) {
            return function (args) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.deployContract(deployer, types_1.LibraryId.CoreLibrary, args)];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            }); };
        };
        this._deployPriceOracleContract = function (deployer) {
            return function (args) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.deployContract(deployer, types_1.ContractId.PriceOracle, args)];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            }); };
        };
        this._deployLendingRateOracleContract = function (deployer) {
            return function (args) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.deployContract(deployer, types_1.ContractId.LendingRateOracle, args)];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            }); };
        };
        this._deployLendingPoolCoreContract = function (deployer) {
            return function (args) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.deployContract(deployer, types_1.ContractId.LendingPoolCore, args)];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            }); };
        };
        this._deployLendingPoolDataProviderContract = function (deployer) {
            return function (args) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.deployContract(deployer, types_1.ContractId.LendingPoolDataProvider, args)];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            }); };
        };
        this._deployLendingPoolConfiguratorContract = function (deployer) {
            return function (args) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.deployContract(deployer, types_1.ContractId.LendingPoolConfigurator, args)];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            }); };
        };
        this._deployLendingPoolContract = function (deployer) {
            return function (args) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.deployContract(deployer, types_1.ContractId.LendingPool, args)];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            }); };
        };
        this._deployLendingPoolLiquidationManager = function (deployer) {
            return function (args) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.deployContract(deployer, types_1.ContractId.LendingPoolLiquidationManager, args)];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            }); };
        };
        this._deployWalletBalanceProvider = function (deployer) {
            return function (args) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.deployContract(deployer, types_1.ContractId.WalletBalanceProvider, args)];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            }); };
        };
        this.getAllDeploymentFunctions = function (deployer) { return ({
            deployMigrationsContract: _this._deployMigrationsContract(deployer),
            deployAllMockTokens: _this._deployAllMockTokens(deployer),
            deployMockFlashLoanReceiver: _this._deployMockFlashLoanReceiver(deployer),
            deployLendingPoolAddressesProvider: _this._deployLendingPoolAddressesProvider(deployer),
            deployLendingPoolParametersProviderContract: _this._deployLendingPoolParametersProvider(deployer),
            deployFeeProviderContract: _this._deployFeeProviderContract(deployer),
            deployNetworkMetadataProviderContract: _this._deployNetworkMetadataProviderContract(deployer),
            deployPriceOracleContract: _this._deployPriceOracleContract(deployer),
            deployLendingRateOracleContract: _this._deployLendingRateOracleContract(deployer),
            deployCoreLibraryLibrary: _this._deployCoreLibraryLibrary(deployer),
            deployLendingPoolCoreContract: _this._deployLendingPoolCoreContract(deployer),
            deployLendingPoolConfiguratorContract: _this._deployLendingPoolConfiguratorContract(deployer),
            deployLendingPoolDataProviderContract: _this._deployLendingPoolDataProviderContract(deployer),
            deployLendingPoolContract: _this._deployLendingPoolContract(deployer),
            deployLendingPoolLiquidationManager: _this._deployLendingPoolLiquidationManager(deployer),
            deployWalletBalanceProvider: _this._deployWalletBalanceProvider(deployer)
        }); };
    }
    return ContractsDeploymentsProvider;
}());
exports.ContractsDeploymentsProvider = ContractsDeploymentsProvider;
//# sourceMappingURL=contracts-deployments-provider.js.map