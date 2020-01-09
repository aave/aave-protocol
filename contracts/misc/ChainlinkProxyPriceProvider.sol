pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

import "../interfaces/IPriceOracleGetter.sol";
import "../interfaces/IChainlinkAggregator.sol";
import "../libraries/EthAddressLib.sol";

/// @title ChainlinkProxyPriceProvider
/// @author Aave
/// @notice Proxy smart contract to get the price of an asset from a price source, with Chainlink Aggregator
///         smart contracts as primary option
/// - If the returned price by a Chainlink aggregator is <= 0, the call is forwarded to a fallbackOracle
/// - Owned by the Aave governance system, allowed to add sources for assets, replace them
///   and change the fallbackOracle
contract ChainlinkProxyPriceProvider is IPriceOracleGetter, Ownable {

    event AssetSourceUpdated(address indexed asset, address indexed source);
    event FallbackOracleUpdated(address indexed fallbackOracle);

    mapping(address => IChainlinkAggregator) private assetsSources;
    IPriceOracleGetter private fallbackOracle;

    /// @notice Constructor
    /// @param _assets The addresses of the assets
    /// @param _sources The address of the source of each asset
    /// @param _fallbackOracle The address of the fallback oracle to use if the data of an
    ///        aggregator is not consistent
    constructor(address[] memory _assets, address[] memory _sources, address _fallbackOracle) public {
        internalSetFallbackOracle(_fallbackOracle);
        internalSetAssetsSources(_assets, _sources);
    }

    /// @notice External function called by the Aave governance to set or replace sources of assets
    /// @param _assets The addresses of the assets
    /// @param _sources The address of the source of each asset
    function setAssetSources(address[] calldata _assets, address[] calldata _sources) external onlyOwner {
        internalSetAssetsSources(_assets, _sources);
    }

    /// @notice Sets the fallbackOracle
    /// - Callable only by the Aave governance
    /// @param _fallbackOracle The address of the fallbackOracle
    function setFallbackOracle(address _fallbackOracle) external onlyOwner {
        internalSetFallbackOracle(_fallbackOracle);
    }

    /// @notice Internal function to set the sources for each asset
    /// @param _assets The addresses of the assets
    /// @param _sources The address of the source of each asset
    function internalSetAssetsSources(address[] memory _assets, address[] memory _sources) internal {
        require(_assets.length == _sources.length, "INCONSISTENT_PARAMS_LENGTH");
        for (uint256 i = 0; i < _assets.length; i++) {
            assetsSources[_assets[i]] = IChainlinkAggregator(_sources[i]);
            emit AssetSourceUpdated(_assets[i], _sources[i]);
        }
    }

    /// @notice Internal function to set the fallbackOracle
    /// @param _fallbackOracle The address of the fallbackOracle
    function internalSetFallbackOracle(address _fallbackOracle) internal {
        fallbackOracle = IPriceOracleGetter(_fallbackOracle);
        emit FallbackOracleUpdated(_fallbackOracle);
    }

    /// @notice Gets an asset price by address
    /// @param _asset The asset address
    function getAssetPrice(address _asset) public view returns(uint256) {
        IChainlinkAggregator source = assetsSources[_asset];
        if (_asset == EthAddressLib.ethAddress()) {
            return 1 ether;
        } else {
            // If there is no registered source for the asset, call the fallbackOracle
            if (address(source) == address(0)) {
                return IPriceOracleGetter(fallbackOracle).getAssetPrice(_asset);
            } else {
                int256 _price = IChainlinkAggregator(source).latestAnswer();
                if (_price > 0) {
                    return uint256(_price);
                } else {
                    return IPriceOracleGetter(fallbackOracle).getAssetPrice(_asset);
                }
            }
        }
    }

    /// @notice Gets a list of prices from a list of assets addresses
    /// @param _assets The list of assets addresses
    function getAssetsPrices(address[] calldata _assets) external view returns(uint256[] memory) {
        uint256[] memory prices = new uint256[](_assets.length);
        for (uint256 i = 0; i < _assets.length; i++) {
            prices[i] = getAssetPrice(_assets[i]);
        }
        return prices;
    }

    /// @notice Gets the address of the source for an asset address
    /// @param _asset The address of the asset
    /// @return address The address of the source
    function getSourceOfAsset(address _asset) external view returns(address) {
        return address(assetsSources[_asset]);
    }

    /// @notice Gets the address of the fallback oracle
    /// @return address The addres of the fallback oracle
    function getFallbackOracle() external view returns(address) {
        return address(fallbackOracle);
    }
}