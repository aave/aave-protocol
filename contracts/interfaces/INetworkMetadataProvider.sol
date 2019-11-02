pragma solidity ^0.5.0;

/************
@title INetworkMetadataProvider interface
@notice Interface for the ethereum network general data
*/

interface INetworkMetadataProvider {
    /***********
    @dev returns the number of blocks in a year
     */
    function getBlocksPerYear() external view returns (uint256);

    /***********
    @dev sets the number of blocks in a year
     */
    function setBlocksPerYear(uint256 _blocksPerYear) external;

    /***********
    @dev returns the address used as mock for the ethereum asset
     */
    function getEthereumAddress() external view returns (address);

    /***********
    @dev sets the address used as mock for the ethereum asset
     */
    function setEthereumAddress(address _ethereumAddress) external;

}
