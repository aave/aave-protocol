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
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var types_1 = require("./types");
var fs_1 = require("fs");
var truffle_core_utils_1 = require("./truffle/truffle-core-utils");
var bignumber_js_1 = __importDefault(require("bignumber.js"));
exports.sleep = function (milliseconds) {
    return new Promise(function (resolve) { return setTimeout(resolve, milliseconds); });
};
exports.getHttpProviderUrlByNetwork = function (network) {
    switch (network) {
        case types_1.EthereumNetwork.kovan:
            return process.env.INFURA_URL_KOVAN;
        case types_1.EthereumNetwork.development:
            return process.env.GANACHE_URL;
        // TODO: prod
        default:
            break;
    }
};
exports.getWSProviderUrlByNetwork = function (network) {
    switch (network) {
        case types_1.EthereumNetwork.kovan:
            return process.env.INFURA_WS_URL_KOVAN;
        case types_1.EthereumNetwork.development:
            return process.env.GANACHE_URL;
        // TODO: prod
        default:
            break;
    }
};
exports.writeObjectToFile = function (path, obj) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
    switch (_a.label) {
        case 0: return [4 /*yield*/, fs_1.promises.writeFile(path, JSON.stringify(obj))];
        case 1: return [2 /*return*/, _a.sent()];
    }
}); }); };
exports.writeTextToFile = function (path, text) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
    switch (_a.label) {
        case 0: return [4 /*yield*/, fs_1.promises.writeFile(path, text)];
        case 1: return [2 /*return*/, _a.sent()];
    }
}); }); };
exports.getEthereumNetworkFromScriptArgs = function () {
    return (process.argv[process.argv.findIndex(function (value) { return value === "--network"; }) + 1]);
};
exports.convertToCurrencyDecimals = function (currency, amount) { return __awaiter(_this, void 0, void 0, function () {
    var token, decimals, currencyUnit, amountInCurrencyDecimals;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, truffle_core_utils_1.getTruffleContractInstance(artifacts, types_1.ContractId.ERC20Detailed, currency)];
            case 1:
                token = _a.sent();
                return [4 /*yield*/, token.decimals()];
            case 2:
                decimals = _a.sent();
                currencyUnit = new bignumber_js_1.default(10).pow(decimals);
                amountInCurrencyDecimals = new bignumber_js_1.default(amount).multipliedBy(currencyUnit);
                return [2 /*return*/, amountInCurrencyDecimals.toFixed()];
        }
    });
}); };
exports.convertToCurrencyUnits = function (currency, amount) { return __awaiter(_this, void 0, void 0, function () {
    var token, decimals, currencyUnit, amountInCurrencyUnits;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, truffle_core_utils_1.getTruffleContractInstance(artifacts, types_1.ContractId.ERC20Detailed, currency)];
            case 1:
                token = _a.sent();
                return [4 /*yield*/, token.decimals()];
            case 2:
                decimals = _a.sent();
                currencyUnit = new bignumber_js_1.default(10).pow(decimals);
                amountInCurrencyUnits = new bignumber_js_1.default(amount).div(currencyUnit);
                return [2 /*return*/, amountInCurrencyUnits.toFixed()];
        }
    });
}); };
//# sourceMappingURL=misc-utils.js.map