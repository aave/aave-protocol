pragma solidity ^0.5.0;

/************
@title IPriceOracle interface
@notice Interface for the Aave price oracle.*/
interface IPriceOracle {
    /***********
    @dev returns the asset price in ETH
     */
    function getAssetPrice(address _asset) external view returns (uint256);

    /***********
    @dev sets the asset price
     */
    function setAssetPrice(address _asset, uint256 _price) external;

    /***********
    @dev returns the asset price in USD
     */
    function getEthUsdPrice() external view returns (uint256);

    /***********
    @dev sets the asset price
     */
    function setEthUsdPrice(uint256 _price) external;

}
