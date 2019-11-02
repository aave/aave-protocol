"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var bignumber_js_1 = __importDefault(require("bignumber.js"));
exports.WAD = Math.pow(10, 18).toString();
exports.HALF_WAD = new bignumber_js_1.default(Math.pow(10, 18)).multipliedBy(0.5).toString();
exports.RAY = new bignumber_js_1.default(10).exponentiatedBy(27).toFixed();
exports.ONE_YEAR = "31536000";
exports.MAX_UINT_AMOUNT = "115792089237316195423570985008687907853269984665640564039457584007913129639935";
exports.oneEther = new bignumber_js_1.default(Math.pow(10, 18));
exports.oneRay = new bignumber_js_1.default(Math.pow(10, 27));
exports.RATEMODE_FIXED = "0";
exports.RATEMODE_VARIABLE = "1";
exports.NIL_ADDRESS = "0x0000000000000000000000000000000000000000";
exports.APPROVAL_AMOUNT_LENDING_POOL_CORE = "1000000000000000000000000000";
//# sourceMappingURL=constants.js.map