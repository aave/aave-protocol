pragma solidity ^0.5.0;

import "../../interfaces/IPriceOracle.sol";


contract PriceOracle is IPriceOracle {

    mapping(address => uint) prices;
    uint ethPriceUsd;

    function getAssetPrice(address _asset) external view returns(uint) {
        return prices[_asset];
    }

    function setAssetPrice(address _asset, uint _price) external {
        prices[_asset] = _price;
    }

    function getEthUsdPrice() external view returns(uint) {
        return ethPriceUsd;
    }

    function setEthUsdPrice(uint _price) external {
        ethPriceUsd = _price;
    }
}