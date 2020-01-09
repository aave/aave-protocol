pragma solidity ^0.5.0;

interface GenericOracleI {
    // ganache
    event AssetPriceUpdated(address _asset, uint256 _price, uint256 timestamp);
    event EthPriceUpdated(uint256 _price, uint256 timestamp);

    // kovan
    event ProphecySubmitted(
        address indexed _sybil,
        address indexed _asset,
        uint96 _sybilProphecy,
        uint96 _oracleProphecy
    );

    function getAssetPrice(address _asset) external view returns(uint256);
    function getEthUsdPrice() external view returns(uint256);
}

