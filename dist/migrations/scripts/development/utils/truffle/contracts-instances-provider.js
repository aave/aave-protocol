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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var types_1 = require("../types");
var truffle_core_utils_1 = require("./truffle-core-utils");
var constants_1 = require("../constants");
var contracts_getters_by_network_1 = require("./contracts-getters-by-network");
var bignumber_js_1 = __importDefault(require("bignumber.js"));
var app_root_path_1 = require("app-root-path");
var ContractsInstancesProvider = /** @class */ (function () {
    function ContractsInstancesProvider(artifacts) {
        var _this = this;
        this.getContractInstance = function (contractId, contractAddress) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, truffle_core_utils_1.getTruffleContractInstance(this.artifacts, contractId, contractAddress)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        }); }); };
        this.getMockFlashLoanReceiverInstance = function (contractAddress) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, this.getContractInstance(types_1.ContractId.MockFlashLoanReceiver, contractAddress)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        }); }); };
        this.getLendingPoolInstance = function (contractAddress) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, this.getContractInstance(types_1.ContractId.LendingPool, contractAddress)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        }); }); };
        this.getLendingPoolCoreInstance = function (contractAddress) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getContractInstance(types_1.ContractId.LendingPoolCore, contractAddress)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        }); };
        this.getLendingPoolAddressesProviderInstance = function (contractAddress) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getContractInstance(types_1.ContractId.LendingPoolAddressesProvider, contractAddress)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        }); };
        this.getPriceOracleInstance = function (contractAddress) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, this.getContractInstance(types_1.ContractId.PriceOracle, contractAddress)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        }); }); };
        this.getLendingRateOracleInstance = function (contractAddress) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getContractInstance(types_1.ContractId.LendingRateOracle, contractAddress)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        }); };
        this.getLendingPoolDataProviderInstance = function (contractAddress) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getContractInstance(types_1.ContractId.LendingPoolDataProvider, contractAddress)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        }); };
        this.getLendingPoolConfiguratorInstance = function (contractAddress) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getContractInstance(types_1.ContractId.LendingPoolConfigurator, contractAddress)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        }); };
        this.getNetworkMetadataProviderInstance = function (contractAddress) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getContractInstance(types_1.ContractId.NetworkMetadataProvider, contractAddress)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        }); };
        this.getATokenInstance = function (contractAddress) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getContractInstance(types_1.ContractId.AToken, contractAddress)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        }); };
        this.getATokenInstanceFromReserveAddress = function (reserveAddress) { return __awaiter(_this, void 0, void 0, function () {
            var registeredATokenAddress;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getLendingPoolInstance()];
                    case 1: return [4 /*yield*/, (_a.sent()).getReserveData(reserveAddress)];
                    case 2:
                        registeredATokenAddress = (_a.sent())[11];
                        return [4 /*yield*/, this.getContractInstance(types_1.ContractId.AToken, registeredATokenAddress)];
                    case 3: return [2 /*return*/, _a.sent()];
                }
            });
        }); };
        this.getFeeProviderInstance = function (contractAddress) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, this.getContractInstance(types_1.ContractId.FeeProvider, contractAddress)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        }); }); };
        this.getAllATokenInstances = function () { return __awaiter(_this, void 0, void 0, function () {
            var lendingPoolCoreInstance, lendingPoolInstance, allReservesAddresses, aTokenInstances, _i, allReservesAddresses_1, reserveAddress, aTokenAddress, aTokenInstance, aTokenSymbol;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, truffle_core_utils_1.getTruffleContractInstance(this.artifacts, types_1.ContractId.LendingPoolCore)];
                    case 1:
                        lendingPoolCoreInstance = _a.sent();
                        return [4 /*yield*/, truffle_core_utils_1.getTruffleContractInstance(this.artifacts, types_1.ContractId.LendingPool)];
                    case 2:
                        lendingPoolInstance = _a.sent();
                        return [4 /*yield*/, lendingPoolCoreInstance.getReserves()];
                    case 3:
                        allReservesAddresses = _a.sent();
                        aTokenInstances = {};
                        _i = 0, allReservesAddresses_1 = allReservesAddresses;
                        _a.label = 4;
                    case 4:
                        if (!(_i < allReservesAddresses_1.length)) return [3 /*break*/, 9];
                        reserveAddress = allReservesAddresses_1[_i];
                        return [4 /*yield*/, lendingPoolInstance.getReserveData(reserveAddress)];
                    case 5:
                        aTokenAddress = (_a.sent())[11];
                        return [4 /*yield*/, truffle_core_utils_1.getTruffleContractInstance(this.artifacts, types_1.ContractId.AToken, aTokenAddress)];
                    case 6:
                        aTokenInstance = _a.sent();
                        return [4 /*yield*/, aTokenInstance.symbol()];
                    case 7:
                        aTokenSymbol = _a.sent();
                        aTokenInstances[aTokenSymbol] = aTokenInstance;
                        _a.label = 8;
                    case 8:
                        _i++;
                        return [3 /*break*/, 4];
                    case 9: return [2 /*return*/, aTokenInstances];
                }
            });
        }); };
        this.getWalletBalanceProviderInstance = function (contractAddress) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, this.getContractInstance(types_1.ContractId.WalletBalanceProvider, contractAddress)
                    // TODO: move this (maybe)
                ];
                case 1: return [2 /*return*/, _a.sent()
                    // TODO: move this (maybe)
                ];
            }
        }); }); };
        // TODO: move this (maybe)
        this.calculateInterestOnBorrowPlusFee = function (borrowerAddress, amountBorrowed, duration, rate) { return __awaiter(_this, void 0, void 0, function () {
            var amountBorrowedBN, feeProviderInstance, originationFee, interestCumulated, expectedBorrowedAmount;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        amountBorrowedBN = new bignumber_js_1.default(amountBorrowed);
                        return [4 /*yield*/, this.getFeeProviderInstance()];
                    case 1:
                        feeProviderInstance = _a.sent();
                        return [4 /*yield*/, feeProviderInstance.calculateLoanOriginationFee(borrowerAddress, amountBorrowed)];
                    case 2:
                        originationFee = _a.sent();
                        interestCumulated = amountBorrowedBN
                            .multipliedBy(new bignumber_js_1.default(rate).div(constants_1.RAY).multipliedBy(duration).div(constants_1.ONE_YEAR));
                        expectedBorrowedAmount = amountBorrowedBN.plus(originationFee).plus(interestCumulated);
                        return [2 /*return*/, expectedBorrowedAmount.toFixed(0)];
                }
            });
        }); };
        this.getAllGetters = function () { return ({
            getLendingPoolInstance: _this.getLendingPoolInstance,
            getLendingPoolCoreInstance: _this.getLendingPoolCoreInstance,
            getLendingPoolAddressesProviderInstance: _this.getLendingPoolAddressesProviderInstance,
            getPriceOracleInstance: _this.getPriceOracleInstance,
            getLendingRateOracleInstance: _this.getLendingRateOracleInstance,
            getLendingPoolConfiguratorInstance: _this.getLendingPoolConfiguratorInstance,
            getLendingPoolDataProviderInstance: _this.getLendingPoolDataProviderInstance,
            getNetworkMetadataProviderInstance: _this.getNetworkMetadataProviderInstance,
            getFeeProviderInstance: _this.getFeeProviderInstance,
            getCurrentDeployedInstancesFromArtifacts: _this.getCurrentDeployedInstancesFromArtifacts,
            getCurrentDeployedInstancesFromJson: _this.getCurrentDeployedInstancesFromJsonAddresses,
            getATokenInstances: _this.getAllATokenInstances,
            calculateInterestOnBorrowPlusFee: _this.calculateInterestOnBorrowPlusFee,
            getMockFlashLoanReceiverInstance: _this.getMockFlashLoanReceiverInstance,
            getWalletBalanceProviderInstance: _this.getWalletBalanceProviderInstance,
        }); };
        this.getCurrentDeployedInstancesFromArtifacts = function (network) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getCurrentDeployedInstances(network, types_1.ContractsInstancesOrigin.TruffleArtifacts)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        }); };
        this.getCurrentDeployedInstancesFromJsonAddresses = function (network) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getCurrentDeployedInstances(network, types_1.ContractsInstancesOrigin.Json)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        }); };
        this.getAllAddressesFromInstances = function (contractsInstances) {
            var _a;
            var lendingPoolInstance = contractsInstances.lendingPoolInstance, lendingPoolCoreInstance = contractsInstances.lendingPoolCoreInstance, lendingPoolAddressesProviderInstance = contractsInstances.lendingPoolAddressesProviderInstance, lendingPoolConfiguratorInstance = contractsInstances.lendingPoolConfiguratorInstance, lendingPoolDataProviderInstance = contractsInstances.lendingPoolDataProviderInstance, priceOracleInstance = contractsInstances.priceOracleInstance, lendingRateOracleInstance = contractsInstances.lendingRateOracleInstance, networkMetadataProviderInstance = contractsInstances.networkMetadataProviderInstance, feeProviderInstance = contractsInstances.feeProviderInstance, aTokenInstances = contractsInstances.aTokenInstances, walletBalanceProviderInstance = contractsInstances.walletBalanceProviderInstance;
            return _a = {},
                _a[types_1.ContractId.LendingPool] = { address: lendingPoolInstance.address },
                _a[types_1.ContractId.LendingPoolCore] = { address: lendingPoolCoreInstance.address },
                _a[types_1.ContractId.LendingPoolAddressesProvider] = {
                    address: lendingPoolAddressesProviderInstance.address,
                },
                _a[types_1.ContractId.LendingPoolConfigurator] = { address: lendingPoolConfiguratorInstance.address },
                _a[types_1.ContractId.LendingPoolDataProvider] = { address: lendingPoolDataProviderInstance.address },
                _a[types_1.ContractId.PriceOracle] = { address: priceOracleInstance.address },
                _a[types_1.ContractId.LendingRateOracle] = { address: lendingRateOracleInstance.address },
                _a[types_1.ContractId.NetworkMetadataProvider] = { address: networkMetadataProviderInstance.address },
                _a[types_1.ContractId.FeeProvider] = { address: feeProviderInstance.address },
                _a[types_1.ContractId.WalletBalanceProvider] = { address: walletBalanceProviderInstance.address },
                _a[types_1.ATokenId.aETH] = { address: aTokenInstances.aETH.address },
                _a[types_1.ATokenId.aDAI] = { address: aTokenInstances.aDAI.address },
                _a[types_1.ATokenId.aTUSD] = { address: aTokenInstances.aTUSD.address },
                _a[types_1.ATokenId.aUSDC] = { address: aTokenInstances.aUSDC.address },
                _a[types_1.ATokenId.aLEND] = { address: aTokenInstances.aLEND.address },
                _a[types_1.ATokenId.aBAT] = { address: aTokenInstances.aBAT.address },
                _a;
        };
        this.getCurrentDeployedInstances = function (network, contractsInstancesOrigin) { return __awaiter(_this, void 0, void 0, function () {
            var _a, getLendingPoolInstance, getLendingPoolCoreInstance, getLendingPoolAddressesProviderInstance, getPriceOracleInstance, getLendingRateOracleInstance, getLendingPoolConfiguratorInstance, getLendingPoolDataProviderInstance, getNetworkMetadataProviderInstance, getFeeProviderInstance, getATokenInstances, getWalletBalanceProviderInstance, contractsAddressesFilePath, contractsAddresses, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _a = this.getAllGetters(), getLendingPoolInstance = _a.getLendingPoolInstance, getLendingPoolCoreInstance = _a.getLendingPoolCoreInstance, getLendingPoolAddressesProviderInstance = _a.getLendingPoolAddressesProviderInstance, getPriceOracleInstance = _a.getPriceOracleInstance, getLendingRateOracleInstance = _a.getLendingRateOracleInstance, getLendingPoolConfiguratorInstance = _a.getLendingPoolConfiguratorInstance, getLendingPoolDataProviderInstance = _a.getLendingPoolDataProviderInstance, getNetworkMetadataProviderInstance = _a.getNetworkMetadataProviderInstance, getFeeProviderInstance = _a.getFeeProviderInstance, getATokenInstances = _a.getATokenInstances, getWalletBalanceProviderInstance = _a.getWalletBalanceProviderInstance;
                        contractsAddressesFilePath = contractsInstancesOrigin === types_1.ContractsInstancesOrigin.Json
                            ? app_root_path_1.path + "/migrations/" + network + "-deployed-addresses.json"
                            : undefined;
                        contractsAddresses = contractsAddressesFilePath && require(contractsAddressesFilePath);
                        _b = {};
                        _c = {};
                        return [4 /*yield*/, getLendingPoolInstance(contractsAddresses && contractsAddresses[types_1.ContractId.LendingPool].address)];
                    case 1:
                        _c.lendingPoolInstance = _d.sent();
                        return [4 /*yield*/, getLendingPoolCoreInstance(contractsAddresses && contractsAddresses[types_1.ContractId.LendingPoolCore].address)];
                    case 2:
                        _c.lendingPoolCoreInstance = _d.sent();
                        return [4 /*yield*/, getLendingPoolAddressesProviderInstance(contractsAddresses &&
                                contractsAddresses[types_1.ContractId.LendingPoolAddressesProvider].address)];
                    case 3:
                        _c.lendingPoolAddressesProviderInstance = _d.sent();
                        return [4 /*yield*/, getPriceOracleInstance(contractsAddresses && contractsAddresses[types_1.ContractId.PriceOracle].address)];
                    case 4:
                        _c.priceOracleInstance = _d.sent();
                        return [4 /*yield*/, getLendingRateOracleInstance(contractsAddresses && contractsAddresses[types_1.ContractId.LendingRateOracle].address)];
                    case 5:
                        _c.lendingRateOracleInstance = _d.sent();
                        return [4 /*yield*/, getLendingPoolConfiguratorInstance(contractsAddresses &&
                                contractsAddresses[types_1.ContractId.LendingPoolConfigurator].address)];
                    case 6:
                        _c.lendingPoolConfiguratorInstance = _d.sent();
                        return [4 /*yield*/, getLendingPoolDataProviderInstance(contractsAddresses &&
                                contractsAddresses[types_1.ContractId.LendingPoolDataProvider].address)];
                    case 7:
                        _c.lendingPoolDataProviderInstance = _d.sent();
                        return [4 /*yield*/, getNetworkMetadataProviderInstance(contractsAddresses &&
                                contractsAddresses[types_1.ContractId.NetworkMetadataProvider].address)];
                    case 8:
                        _c.networkMetadataProviderInstance = _d.sent();
                        return [4 /*yield*/, getFeeProviderInstance(contractsAddresses && contractsAddresses[types_1.ContractId.FeeProvider].address)];
                    case 9:
                        _c.feeProviderInstance = _d.sent();
                        return [4 /*yield*/, this.getMockFlashLoanReceiverInstance(contractsAddresses && contractsAddresses[types_1.ContractId.MockFlashLoanReceiver].address)];
                    case 10:
                        _c.mockFlashLoanReceiverInstance = _d.sent();
                        return [4 /*yield*/, getATokenInstances()];
                    case 11:
                        // TODO: review to retrieve from JSON file
                        _c.aTokenInstances = _d.sent();
                        return [4 /*yield*/, getWalletBalanceProviderInstance(contractsAddresses && contractsAddresses[types_1.ContractId.WalletBalanceProvider].address)];
                    case 12: return [2 /*return*/, (_b.deployedInstances = (_c.walletBalanceProviderInstance = _d.sent(),
                            _c),
                            _b)];
                }
            });
        }); };
        this.artifacts = artifacts;
        this.contractGettersByNetwork = new contracts_getters_by_network_1.ContractsGettersByNetwork(artifacts);
    }
    return ContractsInstancesProvider;
}());
exports.ContractsInstancesProvider = ContractsInstancesProvider;
//# sourceMappingURL=contracts-instances-provider.js.map