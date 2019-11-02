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
var misc_utils_1 = require("../misc-utils");
var bignumber_js_1 = __importDefault(require("bignumber.js"));
var web3_1 = __importDefault(require("web3"));
var ContractsGettersByNetwork = /** @class */ (function () {
    function ContractsGettersByNetwork(artifacts) {
        var _this = this;
        this.artifacts = artifacts;
        this._getParamPerNetwork = function (network, devGetter, kovanGetter, prodGetter) { return __awaiter(_this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = network;
                        switch (_a) {
                            case types_1.EthereumNetwork.development: return [3 /*break*/, 1];
                            case types_1.EthereumNetwork.coverage: return [3 /*break*/, 1];
                            case types_1.EthereumNetwork.kovan: return [3 /*break*/, 3];
                        }
                        return [3 /*break*/, 4];
                    case 1: return [4 /*yield*/, devGetter()];
                    case 2: return [2 /*return*/, _b.sent()];
                    case 3: return [2 /*return*/, kovanGetter()
                        // TODO: prod
                    ];
                    case 4: return [2 /*return*/];
                }
            });
        }); };
        this._getTokenAddresses = function (network) { return function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._getParamPerNetwork(network, this._getDevReservesAddresses, 
                        // TODO: kovan
                        this._getDevReservesAddresses, 
                        // TODO: prod
                        this._getDevReservesAddresses)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        }); }; };
        this._getDevReservesAddresses = function () { return __awaiter(_this, void 0, void 0, function () {
            var addresses, _i, _a, mockTokenContractName, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        addresses = {};
                        _i = 0, _a = Object.keys(types_1.MockTokenContractId);
                        _d.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        mockTokenContractName = _a[_i];
                        _b = addresses;
                        _c = mockTokenContractName.replace("Mock", "");
                        return [4 /*yield*/, truffle_core_utils_1.getTruffleContractInstance(this.artifacts, mockTokenContractName)];
                    case 2:
                        _b[_c] = (_d.sent()).address;
                        _d.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, addresses];
                }
            });
        }); };
        this._getKovanReservesAddresses = function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, ({
                        BAT: "",
                        ETH: "",
                        DAI: "",
                        LEND: "",
                        TUSD: "",
                        USDC: "",
                    })];
            });
        }); };
        this._getAllTokenInstances = function (network) { return function () { return __awaiter(_this, void 0, void 0, function () {
            var allTokenAddresses, tokenInstances, _i, _a, _b, tokenSymbol, tokenAddress, tokenInstance;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this._getTokenAddresses(network)];
                    case 1: return [4 /*yield*/, (_c.sent())()];
                    case 2:
                        allTokenAddresses = _c.sent();
                        tokenInstances = {};
                        _i = 0, _a = Object.entries(allTokenAddresses);
                        _c.label = 3;
                    case 3:
                        if (!(_i < _a.length)) return [3 /*break*/, 6];
                        _b = _a[_i], tokenSymbol = _b[0], tokenAddress = _b[1];
                        return [4 /*yield*/, truffle_core_utils_1.getTruffleContractInstance(this.artifacts, types_1.ContractId.MintableERC20, tokenAddress)];
                    case 4:
                        tokenInstance = _c.sent();
                        tokenInstances[tokenSymbol] = tokenInstance;
                        _c.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 3];
                    case 6: return [2 /*return*/, tokenInstances];
                }
            });
        }); }; };
        this._getEthereumAddress = function (network) { return function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, this._getTokenAddresses(network)()];
                case 1: return [2 /*return*/, (_a.sent()).ETH];
            }
        }); }); }; };
        this._getBlocksPerYear = function (network) { return function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._getParamPerNetwork(network, this._getBlocksPerYearDev, this._getBlocksPerYearKovan, 
                        // TODO: prod
                        this._getBlocksPerYearProd)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        }); }; };
        this._getETHUSDPrice = function (network) { return function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._getParamPerNetwork(network, this._getEthUSDPriceDev, this._getEthUSDPriceKovan, 
                        // TODO: prod
                        this._getEthUSDPriceProd)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        }); }; };
        this._getReservesParams = function (network) { return function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._getParamPerNetwork(network, this._getReservesParamsDev, this._getReservesParamsKovan, 
                        // TODO: prod
                        this._getReservesParamsKovan)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        }); }; };
        this._getInitialATokenExchangeRateKovan = function () {
            return new bignumber_js_1.default(100).multipliedBy(constants_1.oneRay).toFixed();
        };
        this._getReservesParamsDev = function () { return ({
            DAI: {
                baseVariableBorrowRate: new bignumber_js_1.default(0.06).multipliedBy(constants_1.oneRay).toFixed(),
                variableBorrowRateScaling: new bignumber_js_1.default(0.25).multipliedBy(constants_1.oneRay).toFixed(),
                fixedBorrowRateScaling: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                borrowToLiquidityRateDelta: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                baseLTVAsCollateral: "75",
                liquidationThreshold: "80",
                liquidationDiscount: "105",
                fixedBorrowRateEnabled: true,
                reserveDecimals: "18",
                initialExchangeRate: new bignumber_js_1.default(100).multipliedBy(constants_1.oneRay).toFixed(),
            },
            TUSD: {
                baseVariableBorrowRate: new bignumber_js_1.default(0.03).multipliedBy(constants_1.oneRay).toFixed(),
                variableBorrowRateScaling: new bignumber_js_1.default(0.25).multipliedBy(constants_1.oneRay).toFixed(),
                fixedBorrowRateScaling: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                borrowToLiquidityRateDelta: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                baseLTVAsCollateral: "75",
                liquidationThreshold: "80",
                liquidationDiscount: "105",
                fixedBorrowRateEnabled: true,
                reserveDecimals: "18",
                initialExchangeRate: new bignumber_js_1.default(100).multipliedBy(constants_1.oneRay).toFixed(),
            },
            USDC: {
                baseVariableBorrowRate: new bignumber_js_1.default(0.03).multipliedBy(constants_1.oneRay).toFixed(),
                variableBorrowRateScaling: new bignumber_js_1.default(0.3).multipliedBy(constants_1.oneRay).toFixed(),
                fixedBorrowRateScaling: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                borrowToLiquidityRateDelta: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                baseLTVAsCollateral: "75",
                liquidationThreshold: "80",
                liquidationDiscount: "105",
                fixedBorrowRateEnabled: true,
                reserveDecimals: "6",
                initialExchangeRate: new bignumber_js_1.default(100).multipliedBy(constants_1.oneRay).toFixed(),
            },
            USDT: {
                baseVariableBorrowRate: new bignumber_js_1.default(0.03).multipliedBy(constants_1.oneRay).toFixed(),
                variableBorrowRateScaling: new bignumber_js_1.default(0.3).multipliedBy(constants_1.oneRay).toFixed(),
                fixedBorrowRateScaling: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                borrowToLiquidityRateDelta: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                baseLTVAsCollateral: "-1",
                liquidationThreshold: "80",
                liquidationDiscount: "105",
                fixedBorrowRateEnabled: true,
                reserveDecimals: "6",
                initialExchangeRate: new bignumber_js_1.default(100).multipliedBy(constants_1.oneRay).toFixed(),
            },
            SUSD: {
                baseVariableBorrowRate: new bignumber_js_1.default(0.03).multipliedBy(constants_1.oneRay).toFixed(),
                variableBorrowRateScaling: new bignumber_js_1.default(0.3).multipliedBy(constants_1.oneRay).toFixed(),
                fixedBorrowRateScaling: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                borrowToLiquidityRateDelta: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                baseLTVAsCollateral: "-1",
                liquidationThreshold: "80",
                liquidationDiscount: "105",
                fixedBorrowRateEnabled: true,
                reserveDecimals: "6",
                initialExchangeRate: new bignumber_js_1.default(100).multipliedBy(constants_1.oneRay).toFixed(),
            },
            LEND: {
                baseVariableBorrowRate: new bignumber_js_1.default(0.01).multipliedBy(constants_1.oneRay).toFixed(),
                variableBorrowRateScaling: new bignumber_js_1.default(0.15).multipliedBy(constants_1.oneRay).toFixed(),
                fixedBorrowRateScaling: new bignumber_js_1.default(0.05).multipliedBy(constants_1.oneRay).toFixed(),
                borrowToLiquidityRateDelta: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                baseLTVAsCollateral: "60",
                liquidationThreshold: "65",
                liquidationDiscount: "115",
                fixedBorrowRateEnabled: true,
                reserveDecimals: "18",
                initialExchangeRate: new bignumber_js_1.default(100).multipliedBy(constants_1.oneRay).toFixed(),
            },
            BAT: {
                baseVariableBorrowRate: new bignumber_js_1.default(0.01).multipliedBy(constants_1.oneRay).toFixed(),
                variableBorrowRateScaling: new bignumber_js_1.default(0.15).multipliedBy(constants_1.oneRay).toFixed(),
                fixedBorrowRateScaling: new bignumber_js_1.default(0.05).multipliedBy(constants_1.oneRay).toFixed(),
                borrowToLiquidityRateDelta: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                baseLTVAsCollateral: "60",
                liquidationThreshold: "65",
                liquidationDiscount: "105",
                fixedBorrowRateEnabled: false,
                reserveDecimals: "18",
                initialExchangeRate: new bignumber_js_1.default(100).multipliedBy(constants_1.oneRay).toFixed(),
            },
            ETH: {
                baseVariableBorrowRate: new bignumber_js_1.default(0.01).multipliedBy(constants_1.oneRay).toFixed(),
                variableBorrowRateScaling: new bignumber_js_1.default(0.15).multipliedBy(constants_1.oneRay).toFixed(),
                fixedBorrowRateScaling: new bignumber_js_1.default(0.05).multipliedBy(constants_1.oneRay).toFixed(),
                borrowToLiquidityRateDelta: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                baseLTVAsCollateral: "75",
                liquidationThreshold: "80",
                liquidationDiscount: "105",
                fixedBorrowRateEnabled: true,
                reserveDecimals: "18",
                initialExchangeRate: new bignumber_js_1.default(100).multipliedBy(constants_1.oneRay).toFixed(),
            },
            LINK: {
                baseVariableBorrowRate: new bignumber_js_1.default(0.01).multipliedBy(constants_1.oneRay).toFixed(),
                variableBorrowRateScaling: new bignumber_js_1.default(0.15).multipliedBy(constants_1.oneRay).toFixed(),
                fixedBorrowRateScaling: new bignumber_js_1.default(0.05).multipliedBy(constants_1.oneRay).toFixed(),
                borrowToLiquidityRateDelta: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                baseLTVAsCollateral: "65",
                liquidationThreshold: "70",
                liquidationDiscount: "110",
                fixedBorrowRateEnabled: true,
                reserveDecimals: "18",
                initialExchangeRate: new bignumber_js_1.default(100).multipliedBy(constants_1.oneRay).toFixed(),
            },
            WBTC: {
                baseVariableBorrowRate: new bignumber_js_1.default(0.01).multipliedBy(constants_1.oneRay).toFixed(),
                variableBorrowRateScaling: new bignumber_js_1.default(0.15).multipliedBy(constants_1.oneRay).toFixed(),
                fixedBorrowRateScaling: new bignumber_js_1.default(0.05).multipliedBy(constants_1.oneRay).toFixed(),
                borrowToLiquidityRateDelta: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                baseLTVAsCollateral: "60",
                liquidationThreshold: "65",
                liquidationDiscount: "110",
                fixedBorrowRateEnabled: true,
                reserveDecimals: "18",
                initialExchangeRate: new bignumber_js_1.default(100).multipliedBy(constants_1.oneRay).toFixed(),
            },
            AMPL: {
                baseVariableBorrowRate: new bignumber_js_1.default(0.01).multipliedBy(constants_1.oneRay).toFixed(),
                variableBorrowRateScaling: new bignumber_js_1.default(0.15).multipliedBy(constants_1.oneRay).toFixed(),
                fixedBorrowRateScaling: new bignumber_js_1.default(0.05).multipliedBy(constants_1.oneRay).toFixed(),
                borrowToLiquidityRateDelta: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                baseLTVAsCollateral: "60",
                liquidationThreshold: "65",
                liquidationDiscount: "110",
                fixedBorrowRateEnabled: true,
                reserveDecimals: "18",
                initialExchangeRate: new bignumber_js_1.default(100).multipliedBy(constants_1.oneRay).toFixed(),
            },
            KNC: {
                baseVariableBorrowRate: new bignumber_js_1.default(0.01).multipliedBy(constants_1.oneRay).toFixed(),
                variableBorrowRateScaling: new bignumber_js_1.default(0.15).multipliedBy(constants_1.oneRay).toFixed(),
                fixedBorrowRateScaling: new bignumber_js_1.default(0.05).multipliedBy(constants_1.oneRay).toFixed(),
                borrowToLiquidityRateDelta: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                baseLTVAsCollateral: "60",
                liquidationThreshold: "65",
                liquidationDiscount: "110",
                fixedBorrowRateEnabled: true,
                reserveDecimals: "18",
                initialExchangeRate: new bignumber_js_1.default(100).multipliedBy(constants_1.oneRay).toFixed(),
            },
            REP: {
                baseVariableBorrowRate: new bignumber_js_1.default(0.01).multipliedBy(constants_1.oneRay).toFixed(),
                variableBorrowRateScaling: new bignumber_js_1.default(0.15).multipliedBy(constants_1.oneRay).toFixed(),
                fixedBorrowRateScaling: new bignumber_js_1.default(0.05).multipliedBy(constants_1.oneRay).toFixed(),
                borrowToLiquidityRateDelta: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                baseLTVAsCollateral: "60",
                liquidationThreshold: "65",
                liquidationDiscount: "110",
                fixedBorrowRateEnabled: true,
                reserveDecimals: "18",
                initialExchangeRate: new bignumber_js_1.default(100).multipliedBy(constants_1.oneRay).toFixed(),
            },
            MKR: {
                baseVariableBorrowRate: new bignumber_js_1.default(0.01).multipliedBy(constants_1.oneRay).toFixed(),
                variableBorrowRateScaling: new bignumber_js_1.default(0.15).multipliedBy(constants_1.oneRay).toFixed(),
                fixedBorrowRateScaling: new bignumber_js_1.default(0.05).multipliedBy(constants_1.oneRay).toFixed(),
                borrowToLiquidityRateDelta: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                baseLTVAsCollateral: "60",
                liquidationThreshold: "65",
                liquidationDiscount: "110",
                fixedBorrowRateEnabled: true,
                reserveDecimals: "18",
                initialExchangeRate: new bignumber_js_1.default(100).multipliedBy(constants_1.oneRay).toFixed(),
            },
            MANA: {
                baseVariableBorrowRate: new bignumber_js_1.default(0.01).multipliedBy(constants_1.oneRay).toFixed(),
                variableBorrowRateScaling: new bignumber_js_1.default(0.15).multipliedBy(constants_1.oneRay).toFixed(),
                fixedBorrowRateScaling: new bignumber_js_1.default(0.05).multipliedBy(constants_1.oneRay).toFixed(),
                borrowToLiquidityRateDelta: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                baseLTVAsCollateral: "60",
                liquidationThreshold: "65",
                liquidationDiscount: "110",
                fixedBorrowRateEnabled: true,
                reserveDecimals: "18",
                initialExchangeRate: new bignumber_js_1.default(100).multipliedBy(constants_1.oneRay).toFixed(),
            },
            ZRX: {
                baseVariableBorrowRate: new bignumber_js_1.default(0.01).multipliedBy(constants_1.oneRay).toFixed(),
                variableBorrowRateScaling: new bignumber_js_1.default(0.15).multipliedBy(constants_1.oneRay).toFixed(),
                fixedBorrowRateScaling: new bignumber_js_1.default(0.05).multipliedBy(constants_1.oneRay).toFixed(),
                borrowToLiquidityRateDelta: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                baseLTVAsCollateral: "60",
                liquidationThreshold: "65",
                liquidationDiscount: "110",
                fixedBorrowRateEnabled: true,
                reserveDecimals: "18",
                initialExchangeRate: new bignumber_js_1.default(100).multipliedBy(constants_1.oneRay).toFixed(),
            },
        }); };
        this._getReservesParamsKovan = function () { return ({
            DAI: {
                baseVariableBorrowRate: new bignumber_js_1.default(0.06).multipliedBy(constants_1.oneRay).toFixed(),
                variableBorrowRateScaling: new bignumber_js_1.default(0.25).multipliedBy(constants_1.oneRay).toFixed(),
                fixedBorrowRateScaling: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                borrowToLiquidityRateDelta: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                baseLTVAsCollateral: "75",
                liquidationThreshold: "80",
                liquidationDiscount: "105",
                fixedBorrowRateEnabled: true,
                reserveDecimals: "18",
                initialExchangeRate: new bignumber_js_1.default(100).multipliedBy(constants_1.oneRay).toFixed(),
            },
            TUSD: {
                baseVariableBorrowRate: new bignumber_js_1.default(0.03).multipliedBy(constants_1.oneRay).toFixed(),
                variableBorrowRateScaling: new bignumber_js_1.default(0.25).multipliedBy(constants_1.oneRay).toFixed(),
                fixedBorrowRateScaling: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                borrowToLiquidityRateDelta: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                baseLTVAsCollateral: "75",
                liquidationThreshold: "80",
                liquidationDiscount: "105",
                fixedBorrowRateEnabled: true,
                reserveDecimals: "18",
                initialExchangeRate: new bignumber_js_1.default(100).multipliedBy(constants_1.oneRay).toFixed(),
            },
            USDC: {
                baseVariableBorrowRate: new bignumber_js_1.default(0.03).multipliedBy(constants_1.oneRay).toFixed(),
                variableBorrowRateScaling: new bignumber_js_1.default(0.3).multipliedBy(constants_1.oneRay).toFixed(),
                fixedBorrowRateScaling: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                borrowToLiquidityRateDelta: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                baseLTVAsCollateral: "75",
                liquidationThreshold: "80",
                liquidationDiscount: "105",
                fixedBorrowRateEnabled: true,
                reserveDecimals: "6",
                initialExchangeRate: new bignumber_js_1.default(100).multipliedBy(constants_1.oneRay).toFixed(),
            },
            USDT: {
                baseVariableBorrowRate: new bignumber_js_1.default(0.03).multipliedBy(constants_1.oneRay).toFixed(),
                variableBorrowRateScaling: new bignumber_js_1.default(0.3).multipliedBy(constants_1.oneRay).toFixed(),
                fixedBorrowRateScaling: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                borrowToLiquidityRateDelta: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                baseLTVAsCollateral: "-1",
                liquidationThreshold: "80",
                liquidationDiscount: "105",
                fixedBorrowRateEnabled: true,
                reserveDecimals: "6",
                initialExchangeRate: new bignumber_js_1.default(100).multipliedBy(constants_1.oneRay).toFixed(),
            },
            SUSD: {
                baseVariableBorrowRate: new bignumber_js_1.default(0.03).multipliedBy(constants_1.oneRay).toFixed(),
                variableBorrowRateScaling: new bignumber_js_1.default(0.3).multipliedBy(constants_1.oneRay).toFixed(),
                fixedBorrowRateScaling: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                borrowToLiquidityRateDelta: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                baseLTVAsCollateral: "-1",
                liquidationThreshold: "80",
                liquidationDiscount: "105",
                fixedBorrowRateEnabled: true,
                reserveDecimals: "6",
                initialExchangeRate: new bignumber_js_1.default(100).multipliedBy(constants_1.oneRay).toFixed(),
            },
            LEND: {
                baseVariableBorrowRate: new bignumber_js_1.default(0.01).multipliedBy(constants_1.oneRay).toFixed(),
                variableBorrowRateScaling: new bignumber_js_1.default(0.15).multipliedBy(constants_1.oneRay).toFixed(),
                fixedBorrowRateScaling: new bignumber_js_1.default(0.05).multipliedBy(constants_1.oneRay).toFixed(),
                borrowToLiquidityRateDelta: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                baseLTVAsCollateral: "60",
                liquidationThreshold: "65",
                liquidationDiscount: "115",
                fixedBorrowRateEnabled: true,
                reserveDecimals: "18",
                initialExchangeRate: new bignumber_js_1.default(100).multipliedBy(constants_1.oneRay).toFixed(),
            },
            BAT: {
                baseVariableBorrowRate: new bignumber_js_1.default(0.01).multipliedBy(constants_1.oneRay).toFixed(),
                variableBorrowRateScaling: new bignumber_js_1.default(0.15).multipliedBy(constants_1.oneRay).toFixed(),
                fixedBorrowRateScaling: new bignumber_js_1.default(0.05).multipliedBy(constants_1.oneRay).toFixed(),
                borrowToLiquidityRateDelta: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                baseLTVAsCollateral: "60",
                liquidationThreshold: "65",
                liquidationDiscount: "105",
                fixedBorrowRateEnabled: false,
                reserveDecimals: "18",
                initialExchangeRate: new bignumber_js_1.default(100).multipliedBy(constants_1.oneRay).toFixed(),
            },
            ETH: {
                baseVariableBorrowRate: new bignumber_js_1.default(0.01).multipliedBy(constants_1.oneRay).toFixed(),
                variableBorrowRateScaling: new bignumber_js_1.default(0.15).multipliedBy(constants_1.oneRay).toFixed(),
                fixedBorrowRateScaling: new bignumber_js_1.default(0.05).multipliedBy(constants_1.oneRay).toFixed(),
                borrowToLiquidityRateDelta: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                baseLTVAsCollateral: "75",
                liquidationThreshold: "80",
                liquidationDiscount: "105",
                fixedBorrowRateEnabled: true,
                reserveDecimals: "18",
                initialExchangeRate: new bignumber_js_1.default(100).multipliedBy(constants_1.oneRay).toFixed(),
            },
            LINK: {
                baseVariableBorrowRate: new bignumber_js_1.default(0.01).multipliedBy(constants_1.oneRay).toFixed(),
                variableBorrowRateScaling: new bignumber_js_1.default(0.15).multipliedBy(constants_1.oneRay).toFixed(),
                fixedBorrowRateScaling: new bignumber_js_1.default(0.05).multipliedBy(constants_1.oneRay).toFixed(),
                borrowToLiquidityRateDelta: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                baseLTVAsCollateral: "65",
                liquidationThreshold: "70",
                liquidationDiscount: "110",
                fixedBorrowRateEnabled: true,
                reserveDecimals: "18",
                initialExchangeRate: new bignumber_js_1.default(100).multipliedBy(constants_1.oneRay).toFixed(),
            },
            WBTC: {
                baseVariableBorrowRate: new bignumber_js_1.default(0.01).multipliedBy(constants_1.oneRay).toFixed(),
                variableBorrowRateScaling: new bignumber_js_1.default(0.15).multipliedBy(constants_1.oneRay).toFixed(),
                fixedBorrowRateScaling: new bignumber_js_1.default(0.05).multipliedBy(constants_1.oneRay).toFixed(),
                borrowToLiquidityRateDelta: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                baseLTVAsCollateral: "60",
                liquidationThreshold: "65",
                liquidationDiscount: "110",
                fixedBorrowRateEnabled: true,
                reserveDecimals: "18",
                initialExchangeRate: new bignumber_js_1.default(100).multipliedBy(constants_1.oneRay).toFixed(),
            },
            AMPL: {
                baseVariableBorrowRate: new bignumber_js_1.default(0.01).multipliedBy(constants_1.oneRay).toFixed(),
                variableBorrowRateScaling: new bignumber_js_1.default(0.15).multipliedBy(constants_1.oneRay).toFixed(),
                fixedBorrowRateScaling: new bignumber_js_1.default(0.05).multipliedBy(constants_1.oneRay).toFixed(),
                borrowToLiquidityRateDelta: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                baseLTVAsCollateral: "-1",
                liquidationThreshold: "65",
                liquidationDiscount: "110",
                fixedBorrowRateEnabled: true,
                reserveDecimals: "18",
                initialExchangeRate: new bignumber_js_1.default(100).multipliedBy(constants_1.oneRay).toFixed(),
            },
            KNC: {
                baseVariableBorrowRate: new bignumber_js_1.default(0.01).multipliedBy(constants_1.oneRay).toFixed(),
                variableBorrowRateScaling: new bignumber_js_1.default(0.15).multipliedBy(constants_1.oneRay).toFixed(),
                fixedBorrowRateScaling: new bignumber_js_1.default(0.05).multipliedBy(constants_1.oneRay).toFixed(),
                borrowToLiquidityRateDelta: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                baseLTVAsCollateral: "60",
                liquidationThreshold: "65",
                liquidationDiscount: "110",
                fixedBorrowRateEnabled: true,
                reserveDecimals: "18",
                initialExchangeRate: new bignumber_js_1.default(100).multipliedBy(constants_1.oneRay).toFixed(),
            },
            REP: {
                baseVariableBorrowRate: new bignumber_js_1.default(0.01).multipliedBy(constants_1.oneRay).toFixed(),
                variableBorrowRateScaling: new bignumber_js_1.default(0.15).multipliedBy(constants_1.oneRay).toFixed(),
                fixedBorrowRateScaling: new bignumber_js_1.default(0.05).multipliedBy(constants_1.oneRay).toFixed(),
                borrowToLiquidityRateDelta: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                baseLTVAsCollateral: "60",
                liquidationThreshold: "65",
                liquidationDiscount: "110",
                fixedBorrowRateEnabled: true,
                reserveDecimals: "18",
                initialExchangeRate: new bignumber_js_1.default(100).multipliedBy(constants_1.oneRay).toFixed(),
            },
            MKR: {
                baseVariableBorrowRate: new bignumber_js_1.default(0.01).multipliedBy(constants_1.oneRay).toFixed(),
                variableBorrowRateScaling: new bignumber_js_1.default(0.15).multipliedBy(constants_1.oneRay).toFixed(),
                fixedBorrowRateScaling: new bignumber_js_1.default(0.05).multipliedBy(constants_1.oneRay).toFixed(),
                borrowToLiquidityRateDelta: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                baseLTVAsCollateral: "60",
                liquidationThreshold: "65",
                liquidationDiscount: "110",
                fixedBorrowRateEnabled: true,
                reserveDecimals: "18",
                initialExchangeRate: new bignumber_js_1.default(100).multipliedBy(constants_1.oneRay).toFixed(),
            },
            MANA: {
                baseVariableBorrowRate: new bignumber_js_1.default(0.01).multipliedBy(constants_1.oneRay).toFixed(),
                variableBorrowRateScaling: new bignumber_js_1.default(0.15).multipliedBy(constants_1.oneRay).toFixed(),
                fixedBorrowRateScaling: new bignumber_js_1.default(0.05).multipliedBy(constants_1.oneRay).toFixed(),
                borrowToLiquidityRateDelta: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                baseLTVAsCollateral: "60",
                liquidationThreshold: "65",
                liquidationDiscount: "110",
                fixedBorrowRateEnabled: true,
                reserveDecimals: "18",
                initialExchangeRate: new bignumber_js_1.default(100).multipliedBy(constants_1.oneRay).toFixed(),
            },
            ZRX: {
                baseVariableBorrowRate: new bignumber_js_1.default(0.01).multipliedBy(constants_1.oneRay).toFixed(),
                variableBorrowRateScaling: new bignumber_js_1.default(0.15).multipliedBy(constants_1.oneRay).toFixed(),
                fixedBorrowRateScaling: new bignumber_js_1.default(0.05).multipliedBy(constants_1.oneRay).toFixed(),
                borrowToLiquidityRateDelta: new bignumber_js_1.default(0.1).multipliedBy(constants_1.oneRay).toFixed(),
                baseLTVAsCollateral: "60",
                liquidationThreshold: "65",
                liquidationDiscount: "110",
                fixedBorrowRateEnabled: true,
                reserveDecimals: "18",
                initialExchangeRate: new bignumber_js_1.default(100).multipliedBy(constants_1.oneRay).toFixed(),
            },
        }); };
        this._getInitialAssetPricesDev = function () { return ({
            ETH: constants_1.oneEther.toFixed(),
            DAI: constants_1.oneEther.multipliedBy("0.00369068412860").toFixed(),
            TUSD: constants_1.oneEther.multipliedBy("0.00364714136416").toFixed(),
            USDC: constants_1.oneEther.multipliedBy("0.00367714136416").toFixed(),
            LEND: constants_1.oneEther.multipliedBy("0.00003620948469").toFixed(),
            BAT: constants_1.oneEther.multipliedBy("0.00137893825230").toFixed(),
            USDT: constants_1.oneEther.multipliedBy("0.00369068412860").toFixed(),
            SUSD: constants_1.oneEther.multipliedBy("0.00364714136416").toFixed(),
            MKR: constants_1.oneEther.multipliedBy("2.508581").toFixed(),
            REP: constants_1.oneEther.multipliedBy("0.048235").toFixed(),
            ZRX: constants_1.oneEther.multipliedBy("0.001151").toFixed(),
            WBTC: constants_1.oneEther.multipliedBy("47.332685").toFixed(),
            LINK: constants_1.oneEther.multipliedBy("0.009955").toFixed(),
            AMPL: constants_1.oneEther.multipliedBy("0.002257").toFixed(),
            KNC: constants_1.oneEther.multipliedBy("0.001072").toFixed(),
            MANA: constants_1.oneEther.multipliedBy("0.000158").toFixed(),
        }); };
        this._getInitialAssetPricesKovan = function () { return ({
            ETH: constants_1.oneEther.toFixed(),
            DAI: constants_1.oneEther.multipliedBy("0.00369068412860").toFixed(),
            TUSD: constants_1.oneEther.multipliedBy("0.00364714136416").toFixed(),
            USDC: constants_1.oneEther.multipliedBy("0.00367714136416").toFixed(),
            LEND: constants_1.oneEther.multipliedBy("0.00003620948469").toFixed(),
            BAT: constants_1.oneEther.multipliedBy("0.00137893825230").toFixed(),
            USDT: constants_1.oneEther.multipliedBy("0.00369068412860").toFixed(),
            SUSD: constants_1.oneEther.multipliedBy("0.00364714136416").toFixed(),
            MKR: constants_1.oneEther.multipliedBy("2.508581").toFixed(),
            REP: constants_1.oneEther.multipliedBy("0.048235").toFixed(),
            ZRX: constants_1.oneEther.multipliedBy("0.001151").toFixed(),
            WBTC: constants_1.oneEther.multipliedBy("47.332685").toFixed(),
            LINK: constants_1.oneEther.multipliedBy("0.009955").toFixed(),
            AMPL: constants_1.oneEther.multipliedBy("0.002257").toFixed(),
            KNC: constants_1.oneEther.multipliedBy("0.001072").toFixed(),
            MANA: constants_1.oneEther.multipliedBy("0.000158").toFixed(),
        }); };
        this._getInitialAssetsPrices = function (network) { return function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._getParamPerNetwork(network, this._getInitialAssetPricesDev, this._getInitialAssetPricesKovan, 
                        // TODO: prod
                        this._getInitialAssetPricesKovan)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        }); }; };
        this._getMarketRatesPerAssetDev = function () { return ({
            ETH: {
                borrowRate: constants_1.oneRay.multipliedBy(0.06).toFixed(),
                liquidityRate: constants_1.oneRay.multipliedBy(0.01).toFixed(),
            },
            DAI: {
                borrowRate: constants_1.oneRay.multipliedBy(0.14).toFixed(),
                liquidityRate: constants_1.oneRay.multipliedBy(0.07).toFixed(),
            },
            TUSD: {
                borrowRate: constants_1.oneRay.multipliedBy(0.12).toFixed(),
                liquidityRate: constants_1.oneRay.toFixed(),
            },
            USDC: {
                borrowRate: constants_1.oneRay.multipliedBy(0.12).toFixed(),
                liquidityRate: constants_1.oneRay.toFixed(),
            },
            BAT: {
                borrowRate: constants_1.oneRay.multipliedBy(0.06).toFixed(),
                liquidityRate: constants_1.oneRay.multipliedBy(0.02).toFixed(),
            },
            LEND: {
                borrowRate: constants_1.oneRay.multipliedBy(0.06).toFixed(),
                liquidityRate: constants_1.oneRay.multipliedBy(0.02).toFixed(),
            },
        }); };
        this._getMarketRatesPerAssetKovan = function () { return ({
            ETH: {
                borrowRate: constants_1.oneRay.multipliedBy(0.06).toFixed(),
                liquidityRate: constants_1.oneRay.multipliedBy(0.01).toFixed(),
            },
            DAI: {
                borrowRate: constants_1.oneRay.multipliedBy(0.09).toFixed(),
                liquidityRate: constants_1.oneRay.multipliedBy(0.07).toFixed(),
            },
            TUSD: {
                borrowRate: constants_1.oneRay.multipliedBy(0.07).toFixed(),
                liquidityRate: constants_1.oneRay.toFixed(),
            },
            USDC: {
                borrowRate: constants_1.oneRay.multipliedBy(0.07).toFixed(),
                liquidityRate: constants_1.oneRay.toFixed(),
            },
            SUSD: {
                borrowRate: constants_1.oneRay.multipliedBy(0.05).toFixed(),
                liquidityRate: constants_1.oneRay.toFixed(),
            },
            USDT: {
                borrowRate: constants_1.oneRay.multipliedBy(0.05).toFixed(),
                liquidityRate: constants_1.oneRay.toFixed(),
            },
            BAT: {
                borrowRate: constants_1.oneRay.multipliedBy(0.03).toFixed(),
                liquidityRate: constants_1.oneRay.multipliedBy(0.01).toFixed(),
            },
            LEND: {
                borrowRate: constants_1.oneRay.multipliedBy(0.03).toFixed(),
                liquidityRate: constants_1.oneRay.multipliedBy(0.01).toFixed(),
            },
            LINK: {
                borrowRate: constants_1.oneRay.multipliedBy(0.03).toFixed(),
                liquidityRate: constants_1.oneRay.multipliedBy(0.01).toFixed(),
            },
            KNC: {
                borrowRate: constants_1.oneRay.multipliedBy(0.03).toFixed(),
                liquidityRate: constants_1.oneRay.multipliedBy(0.01).toFixed(),
            },
            AMPL: {
                borrowRate: constants_1.oneRay.multipliedBy(0.03).toFixed(),
                liquidityRate: constants_1.oneRay.multipliedBy(0.01).toFixed(),
            },
            REP: {
                borrowRate: constants_1.oneRay.multipliedBy(0.03).toFixed(),
                liquidityRate: constants_1.oneRay.multipliedBy(0.01).toFixed(),
            },
            MKR: {
                borrowRate: constants_1.oneRay.multipliedBy(0.03).toFixed(),
                liquidityRate: constants_1.oneRay.multipliedBy(0.01).toFixed(),
            },
            MANA: {
                borrowRate: constants_1.oneRay.multipliedBy(0.03).toFixed(),
                liquidityRate: constants_1.oneRay.multipliedBy(0.01).toFixed(),
            },
            WBTC: {
                borrowRate: constants_1.oneRay.multipliedBy(0.03).toFixed(),
                liquidityRate: constants_1.oneRay.multipliedBy(0.01).toFixed(),
            },
            ZRX: {
                borrowRate: constants_1.oneRay.multipliedBy(0.03).toFixed(),
                liquidityRate: constants_1.oneRay.multipliedBy(0.01).toFixed(),
            },
        }); };
        this._getMarketRatesPerAsset = function (network) { return function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._getParamPerNetwork(network, this._getMarketRatesPerAssetDev, this._getMarketRatesPerAssetKovan, 
                        // TODO: prod
                        this._getMarketRatesPerAssetKovan)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        }); }; };
        this._getGenesisLendingPoolManagerAddress = function (network, accounts) { return function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._getParamPerNetwork(network, this._getGenesisLendingPoolManagerAddressDev(accounts), this._getGenesisLendingPoolManagerAddressKovan(accounts), 
                        // TODO: prod
                        this._getGenesisLendingPoolManagerAddressKovan(accounts))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        }); }; };
        this._getGenesisLendingPoolManagerAddressDev = function (accounts) { return function () {
            return accounts[0];
        }; };
        this._getGenesisLendingPoolManagerAddressKovan = function (accounts) { return function () {
            return accounts[0];
        }; };
        this._getFirstDepositorAddressOnTests = function (network, accounts) { return function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._getParamPerNetwork(network, this._getFirstDepositorAddressOnTestsDev(accounts), this._getFirstDepositorAddressOnTestsKovan(accounts), 
                        // TODO: prod
                        this._getFirstDepositorAddressOnTestsKovan(accounts))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        }); }; };
        this._getFirstDepositorAddressOnTestsDev = function (accounts) { return function () {
            return accounts[0];
        }; };
        this._getFirstDepositorAddressOnTestsKovan = function (accounts) { return function () {
            return accounts[0];
        }; };
        this._getFirstBorrowerAddressOnTests = function (network, accounts) { return function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._getParamPerNetwork(network, this._getFirstBorrowerAddressOnTestsDev(accounts), this._getFirstBorrowerAddressOnTestsKovan(accounts), 
                        // TODO: prod
                        this._getFirstBorrowerAddressOnTestsKovan(accounts))];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        }); }; };
        this._getFirstBorrowerAddressOnTestsDev = function (accounts) { return function () {
            return accounts[1];
        }; };
        this._getFirstBorrowerAddressOnTestsKovan = function (accounts) { return function () {
            return accounts[1];
        }; };
        this._getWeb3 = function (network) { return function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._getParamPerNetwork(network, this._getWeb3Dev, this._getWeb3Kovan, 
                        // TODO: prod
                        this._getWeb3Kovan)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        }); }; };
        this._getWeb3Dev = function () { return new web3_1.default(misc_utils_1.getHttpProviderUrlByNetwork(types_1.EthereumNetwork.development)); };
        this._getWeb3Kovan = function () { return new web3_1.default(misc_utils_1.getHttpProviderUrlByNetwork(types_1.EthereumNetwork.kovan)); };
        this._getGenesisFeeCollectionAddress = function (network, accounts) { return function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._getParamPerNetwork(network, this._getGenesisFeeCollectionAddressDev(accounts), this._getGenesisFeeCollectionAddressKovan, 
                        // TODO: prod
                        this._getGenesisFeeCollectionAddressKovan)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        }); }; };
        this._getGenesisFeeCollectionAddressDev = function (accounts) { return function () {
            return accounts[0];
        }; };
        this._getGenesisFeeCollectionAddressKovan = function () {
            return "0xD2fB6EB0A435Bd4564974fA124fA6A031DDFf6a2";
        };
        this._getBlocksPerYearDev = function () { return 21600; };
        this._getBlocksPerYearKovan = function () { return 21600; };
        this._getBlocksPerYearProd = function () { return 21600; };
        this._getEthUSDPriceDev = function () { return constants_1.oneEther.multipliedBy(250).toFixed(); }; // 250 USD
        this._getEthUSDPriceKovan = function () { return constants_1.oneEther.multipliedBy(250).toFixed(); }; // 250 USD
        this._getEthUSDPriceProd = function () { return constants_1.oneEther.multipliedBy(250).toFixed(); }; // 250 USD
        this.getAllGettersByNetwork = function (network, accounts) { return ({
            getTokenAddresses: _this._getTokenAddresses(network),
            getEthereumAddress: _this._getEthereumAddress(network),
            getBlocksPerYear: _this._getBlocksPerYear(network),
            getETHUSDPrice: _this._getETHUSDPrice(network),
            getReservesParams: _this._getReservesParams(network),
            getInitialAssetsPrices: _this._getInitialAssetsPrices(network),
            getMarketRatesPerAsset: _this._getMarketRatesPerAsset(network),
            getGenesisFeeCollectionAddress: _this._getGenesisFeeCollectionAddress(network, accounts),
            getGenesisLendingPoolManagerAddress: _this._getGenesisLendingPoolManagerAddress(network, accounts),
            getFirstBorrowerAddressOnTests: _this._getFirstBorrowerAddressOnTests(network, accounts),
            getFirstDepositorAddressOnTests: _this._getFirstDepositorAddressOnTests(network, accounts),
            getWeb3: _this._getWeb3(network),
            getAllTokenInstances: _this._getAllTokenInstances(network)
        }); };
    }
    return ContractsGettersByNetwork;
}());
exports.ContractsGettersByNetwork = ContractsGettersByNetwork;
//# sourceMappingURL=contracts-getters-by-network.js.map