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
var contracts_instances_provider_1 = require("./contracts-instances-provider");
var truffle_core_utils_1 = require("./truffle-core-utils");
var ContractsActionsProvider = /** @class */ (function () {
    function ContractsActionsProvider(artifacts) {
        var _this = this;
        this.setInitialAssetPricesInOracle = function (prices, assetsAddresses) { return __awaiter(_this, void 0, void 0, function () {
            var _i, _a, assetSymbol;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _i = 0, _a = Object.keys(prices);
                        _b.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 5];
                        assetSymbol = _a[_i];
                        return [4 /*yield*/, this.contractsInstancesProvider.getPriceOracleInstance()];
                    case 2: return [4 /*yield*/, (_b.sent()).setAssetPrice(assetsAddresses[assetSymbol], prices[assetSymbol])];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 1];
                    case 5: return [2 /*return*/];
                }
            });
        }); };
        this.setInitialMarketRatesInRatesOracle = function (marketRates, assetsAddresses) { return __awaiter(_this, void 0, void 0, function () {
            var lendingRateOracleInstance, _i, _a, assetSymbol;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.contractsInstancesProvider.getLendingRateOracleInstance()];
                    case 1:
                        lendingRateOracleInstance = _b.sent();
                        _i = 0, _a = Object.keys(marketRates);
                        _b.label = 2;
                    case 2:
                        if (!(_i < _a.length)) return [3 /*break*/, 6];
                        assetSymbol = _a[_i];
                        return [4 /*yield*/, lendingRateOracleInstance.setMarketBorrowRate(assetsAddresses[assetSymbol], marketRates[assetSymbol].borrowRate)];
                    case 3:
                        _b.sent();
                        return [4 /*yield*/, lendingRateOracleInstance.setMarketLiquidityRate(assetsAddresses[assetSymbol], marketRates[assetSymbol].liquidityRate)];
                    case 4:
                        _b.sent();
                        _b.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 2];
                    case 6: return [2 /*return*/];
                }
            });
        }); };
        this.deployRateStrategyContract = function (reservesParams, reserveAddress, assetSymbol) { return __awaiter(_this, void 0, void 0, function () {
            var contract, _a, baseVariableBorrowRate, variableBorrowRateScaling, fixedBorrowRateScaling, borrowToLiquidityRateDelta, lendingPoolAddressesProviderInstance, strategy;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, truffle_core_utils_1.getTruffleContract(this.artifacts, types_1.ContractId.DefaultReserveInterestRateStrategy)];
                    case 1:
                        contract = _b.sent();
                        _a = reservesParams[assetSymbol], baseVariableBorrowRate = _a.baseVariableBorrowRate, variableBorrowRateScaling = _a.variableBorrowRateScaling, fixedBorrowRateScaling = _a.fixedBorrowRateScaling, borrowToLiquidityRateDelta = _a.borrowToLiquidityRateDelta;
                        return [4 /*yield*/, this.contractsInstancesProvider.getLendingPoolAddressesProviderInstance()];
                    case 2:
                        lendingPoolAddressesProviderInstance = _b.sent();
                        return [4 /*yield*/, contract.new(reserveAddress, lendingPoolAddressesProviderInstance.address, baseVariableBorrowRate, variableBorrowRateScaling, fixedBorrowRateScaling, borrowToLiquidityRateDelta)];
                    case 3:
                        strategy = _b.sent();
                        return [2 /*return*/, strategy.address];
                }
            });
        }); };
        this.initReserves = function (reservesParams, tokenAddresses) { return __awaiter(_this, void 0, void 0, function () {
            var lendingPoolConfiguratorInstance, _i, _a, assetSymbol, _b, initialExchangeRate, reserveDecimals, rateStrategyContractAddress;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this.contractsInstancesProvider.getLendingPoolConfiguratorInstance()];
                    case 1:
                        lendingPoolConfiguratorInstance = _c.sent();
                        _i = 0, _a = Object.keys(reservesParams);
                        _c.label = 2;
                    case 2:
                        if (!(_i < _a.length)) return [3 /*break*/, 6];
                        assetSymbol = _a[_i];
                        _b = reservesParams[assetSymbol], initialExchangeRate = _b.initialExchangeRate, reserveDecimals = _b.reserveDecimals;
                        return [4 /*yield*/, this.deployRateStrategyContract(reservesParams, tokenAddresses[assetSymbol], assetSymbol)];
                    case 3:
                        rateStrategyContractAddress = _c.sent();
                        return [4 /*yield*/, lendingPoolConfiguratorInstance.initReserve(tokenAddresses[assetSymbol], initialExchangeRate, reserveDecimals, rateStrategyContractAddress)];
                    case 4:
                        _c.sent();
                        _c.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 2];
                    case 6: return [2 /*return*/];
                }
            });
        }); };
        this.enableReservesToBorrow = function (reservesParams, tokenAddresses) { return __awaiter(_this, void 0, void 0, function () {
            var lendingPoolConfiguratorInstance, _i, _a, assetSymbol, fixedBorrowRateEnabled;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.contractsInstancesProvider.getLendingPoolConfiguratorInstance()];
                    case 1:
                        lendingPoolConfiguratorInstance = _b.sent();
                        _i = 0, _a = Object.keys(reservesParams);
                        _b.label = 2;
                    case 2:
                        if (!(_i < _a.length)) return [3 /*break*/, 5];
                        assetSymbol = _a[_i];
                        fixedBorrowRateEnabled = reservesParams[assetSymbol].fixedBorrowRateEnabled;
                        return [4 /*yield*/, lendingPoolConfiguratorInstance.enableBorrowingOnReserve(tokenAddresses[assetSymbol], fixedBorrowRateEnabled)];
                    case 3:
                        _b.sent();
                        _b.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/];
                }
            });
        }); };
        this.enableReservesAsCollateral = function (reservesParams, tokenAddresses) { return __awaiter(_this, void 0, void 0, function () {
            var lendingPoolConfiguratorInstance, _i, _a, assetSymbol, _b, baseLTVAsCollateral, liquidationThreshold;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this.contractsInstancesProvider.getLendingPoolConfiguratorInstance()];
                    case 1:
                        lendingPoolConfiguratorInstance = _c.sent();
                        _i = 0, _a = Object.keys(reservesParams);
                        _c.label = 2;
                    case 2:
                        if (!(_i < _a.length)) return [3 /*break*/, 5];
                        assetSymbol = _a[_i];
                        _b = reservesParams[assetSymbol], baseLTVAsCollateral = _b.baseLTVAsCollateral, liquidationThreshold = _b.liquidationThreshold;
                        if (baseLTVAsCollateral === "-1")
                            return [3 /*break*/, 4];
                        return [4 /*yield*/, lendingPoolConfiguratorInstance.enableReserveAsCollateral(tokenAddresses[assetSymbol], baseLTVAsCollateral, liquidationThreshold)];
                    case 3:
                        _c.sent();
                        _c.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/];
                }
            });
        }); };
        this.getAllActionsFunctions = function () { return ({
            setInitialAssetPricesInOracle: _this.setInitialAssetPricesInOracle,
            setInitialMarketRatesInRatesOracle: _this.setInitialMarketRatesInRatesOracle,
            enableReservesAsCollateral: _this.enableReservesAsCollateral,
            enableReservesToBorrow: _this.enableReservesToBorrow,
            initReserves: _this.initReserves,
        }); };
        this.artifacts = artifacts;
        this.contractsInstancesProvider = new contracts_instances_provider_1.ContractsInstancesProvider(artifacts);
    }
    return ContractsActionsProvider;
}());
exports.ContractsActionsProvider = ContractsActionsProvider;
//# sourceMappingURL=contracts-actions-provider.js.map