"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var EthereumNetwork;
(function (EthereumNetwork) {
    EthereumNetwork["kovan"] = "kovan";
    EthereumNetwork["development"] = "development";
    EthereumNetwork["coverage"] = "coverage";
})(EthereumNetwork = exports.EthereumNetwork || (exports.EthereumNetwork = {}));
var TokenContractId;
(function (TokenContractId) {
    TokenContractId["DAI"] = "DAI";
    TokenContractId["LEND"] = "LEND";
    TokenContractId["TUSD"] = "TUSD";
    TokenContractId["BAT"] = "BAT";
    TokenContractId["ETH"] = "ETH";
    TokenContractId["USDC"] = "USDC";
})(TokenContractId = exports.TokenContractId || (exports.TokenContractId = {}));
var MockTokenContractId;
(function (MockTokenContractId) {
    MockTokenContractId["MockDAI"] = "MockDAI";
    MockTokenContractId["MockLEND"] = "MockLEND";
    MockTokenContractId["MockTUSD"] = "MockTUSD";
    MockTokenContractId["MockBAT"] = "MockBAT";
    MockTokenContractId["MockETH"] = "MockETH";
    MockTokenContractId["MockUSDC"] = "MockUSDC";
    MockTokenContractId["MockUSDT"] = "MockUSDT";
    MockTokenContractId["MockSUSD"] = "MockSUSD";
    MockTokenContractId["MockZRX"] = "MockZRX";
    MockTokenContractId["MockMKR"] = "MockMKR";
    MockTokenContractId["MockAMPL"] = "MockAMPL";
    MockTokenContractId["MockWBTC"] = "MockWBTC";
    MockTokenContractId["MockLINK"] = "MockLINK";
    MockTokenContractId["MockKNC"] = "MockKNC";
    MockTokenContractId["MockMANA"] = "MockMANA";
    MockTokenContractId["MockREP"] = "MockREP";
})(MockTokenContractId = exports.MockTokenContractId || (exports.MockTokenContractId = {}));
var ContractId;
(function (ContractId) {
    ContractId["Migrations"] = "Migrations";
    ContractId["MockDAI"] = "MockDAI";
    ContractId["MockLEND"] = "MockLEND";
    ContractId["MockTUSD"] = "MockTUSD";
    ContractId["MockBAT"] = "MockBAT";
    ContractId["MockETH"] = "MockETH";
    ContractId["MockUSDC"] = "MockUSDC";
    ContractId["MockUSDT"] = "MockUSDT";
    ContractId["MockSUSD"] = "MockSUSD";
    ContractId["MockZRX"] = "MockZRX";
    ContractId["MockMKR"] = "MockMKR";
    ContractId["MockAMPL"] = "MockAMPL";
    ContractId["MockWBTC"] = "MockWBTC";
    ContractId["MockLINK"] = "MockLINK";
    ContractId["MockKNC"] = "MockKNC";
    ContractId["MockMANA"] = "MockMANA";
    ContractId["MockREP"] = "MockREP";
    ContractId["MockFlashLoanReceiver"] = "MockFlashLoanReceiver";
    ContractId["LendingPoolAddressesProvider"] = "LendingPoolAddressesProvider";
    ContractId["LendingPoolParametersProvider"] = "LendingPoolParametersProvider";
    ContractId["FeeProvider"] = "FeeProvider";
    ContractId["NetworkMetadataProvider"] = "NetworkMetadataProvider";
    ContractId["PriceOracle"] = "PriceOracle";
    ContractId["LendingRateOracle"] = "LendingRateOracle";
    ContractId["LendingPoolCore"] = "LendingPoolCore";
    ContractId["LendingPoolConfigurator"] = "LendingPoolConfigurator";
    ContractId["LendingPoolDataProvider"] = "LendingPoolDataProvider";
    ContractId["LendingPool"] = "LendingPool";
    ContractId["AToken"] = "AToken";
    ContractId["ERC20"] = "ERC20";
    ContractId["ERC20Detailed"] = "ERC20Detailed";
    ContractId["MintableERC20"] = "MintableERC20";
    ContractId["DefaultReserveInterestRateStrategy"] = "DefaultReserveInterestRateStrategy";
    ContractId["LendingPoolLiquidationManager"] = "LendingPoolLiquidationManager";
    ContractId["WalletBalanceProvider"] = "WalletBalanceProvider";
})(ContractId = exports.ContractId || (exports.ContractId = {}));
var LibraryId;
(function (LibraryId) {
    LibraryId["WadRayMath"] = "WadRayMath";
    LibraryId["CoreLibrary"] = "CoreLibrary";
})(LibraryId = exports.LibraryId || (exports.LibraryId = {}));
// Used to fetch instances of contracts, from the deployed artifacts or from the addresses in the Json file
var ContractsInstancesOrigin;
(function (ContractsInstancesOrigin) {
    ContractsInstancesOrigin["Json"] = "JSON";
    ContractsInstancesOrigin["TruffleArtifacts"] = "TruffleArtifacts";
})(ContractsInstancesOrigin = exports.ContractsInstancesOrigin || (exports.ContractsInstancesOrigin = {}));
var ATokenId;
(function (ATokenId) {
    ATokenId["aETH"] = "aETH";
    ATokenId["aDAI"] = "aDAI";
    ATokenId["aTUSD"] = "aTUSD";
    ATokenId["aUSDC"] = "aUSDC";
    ATokenId["aLEND"] = "aLEND";
    ATokenId["aBAT"] = "aBAT";
})(ATokenId = exports.ATokenId || (exports.ATokenId = {}));
//# sourceMappingURL=types.js.map