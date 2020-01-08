pragma solidity ^0.5.0;

/************
@title IFeeProvider interface
@notice Interface for the Aave fee provider.
*/

interface IFlashLoanReceiver {

    function executeOperation(address _reserve, uint256 _amount, uint256 _fee) external returns (uint256 returnedAmount);
}
