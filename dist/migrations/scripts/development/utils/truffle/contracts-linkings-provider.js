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
var ContractsLinkingsProvider = /** @class */ (function () {
    function ContractsLinkingsProvider(artifacts) {
        var _this = this;
        this.artifacts = artifacts;
        this.linkLibraryToContract = function (deployer, libraryId, contractId) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, truffle_core_utils_1.linkLibraryToContractTruffle(this.artifacts, deployer, libraryId, contractId)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        }); }); };
        this._linkWadRayMathToFeeProvider = function (deployer) {
            return function (libraryAddress, contractAddress) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.linkLibraryToContract(deployer, types_1.LibraryId.WadRayMath, types_1.ContractId.FeeProvider)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            }); }); };
        };
        this._linkWadRayMathToCoreLibrary = function (deployer) {
            return function (libraryAddress, contractAddress) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.linkLibraryToContract(deployer, types_1.LibraryId.WadRayMath, types_1.LibraryId.CoreLibrary)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            }); }); };
        };
        this._linkWadRayMathToLendingPoolCore = function (deployer) {
            return function (libraryAddress, contractAddress) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.linkLibraryToContract(deployer, types_1.LibraryId.WadRayMath, types_1.ContractId.LendingPoolCore)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            }); }); };
        };
        this._linkCoreLibraryToLendingPoolCore = function (deployer) {
            return function (libraryAddress, contractAddress) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.linkLibraryToContract(deployer, types_1.LibraryId.CoreLibrary, types_1.ContractId.LendingPoolCore)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            }); }); };
        };
        this._linkWadRayMathToLendingPoolConfigurator = function (deployer) {
            return function (libraryAddress, contractAddress) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.linkLibraryToContract(deployer, types_1.LibraryId.WadRayMath, types_1.ContractId.LendingPoolConfigurator)];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            }); };
        };
        this._linkWadRayMathToLendingPoolDataProvider = function (deployer) {
            return function (libraryAddress, contractAddress) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.linkLibraryToContract(deployer, types_1.LibraryId.WadRayMath, types_1.ContractId.LendingPoolDataProvider)];
                        case 1: return [2 /*return*/, _a.sent()];
                    }
                });
            }); };
        };
        this._linkWadRayMathToLendingPool = function (deployer) {
            return function (libraryAddress, contractAddress) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.linkLibraryToContract(deployer, types_1.LibraryId.WadRayMath, types_1.ContractId.LendingPool)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            }); }); };
        };
        this.getAllLinkingFunctions = function (deployer) { return ({
            linkWadRayMathToFeeProvider: _this._linkWadRayMathToFeeProvider(deployer),
            linkWadRayMathToCoreLibrary: _this._linkWadRayMathToCoreLibrary(deployer),
            linkWadRayMathToLendingPoolCore: _this._linkWadRayMathToLendingPoolCore(deployer),
            linkCoreLibraryToLendingPoolCore: _this._linkCoreLibraryToLendingPoolCore(deployer),
            linkWadRayMathToLendingPoolConfigurator: _this._linkWadRayMathToLendingPoolConfigurator(deployer),
            linkWadRayMathToLendingPoolDataProvider: _this._linkWadRayMathToLendingPoolDataProvider(deployer),
            linkWadRayMathToLendingPool: _this._linkWadRayMathToLendingPool(deployer),
        }); };
    }
    return ContractsLinkingsProvider;
}());
exports.ContractsLinkingsProvider = ContractsLinkingsProvider;
//# sourceMappingURL=contracts-linkings-provider.js.map