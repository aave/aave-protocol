pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "../../flashloan/base/FlashLoanReceiverBase.sol";
import "../tokens/MintableERC20.sol";

contract MockFlashLoanReceiver is FlashLoanReceiverBase {

    using SafeMath for uint256;
    event ExecutedWithFail(address _reserve, uint256 _amount, uint256 _fee);
    event ExecutedWithSuccess(address _reserve, uint256 _amount, uint256 _fee);


    bool failExecution = false;

    constructor(ILendingPoolAddressesProvider _provider) FlashLoanReceiverBase(_provider)  public {
    }

    function setFailExecutionTransfer(bool _fail) public {
        failExecution = _fail;
    }

    function executeOperation(
        address _reserve,
        uint256 _amount,
        uint256 _fee,
        bytes memory _params) public {
        //mint to this contract the specific amount
        MintableERC20 token = MintableERC20(_reserve);


        //check the contract has the specified balance
        require(_amount <= getBalanceInternal(address(this), _reserve), "Invalid balance for the contract");

        if(failExecution) {
            emit ExecutedWithFail(_reserve, _amount, _fee);
            return;
        }

        //execution does not fail - mint tokens and return them to the _destination
        //note: if the reserve is eth, the mock contract must receive at least _fee ETH before calling executeOperation

        if(_reserve != EthAddressLib.ethAddress()) {
            token.mint(_fee);
        }
        //returning amount + fee to the destination
        transferFundsBackToPoolInternal(_reserve, _amount.add(_fee));
        emit ExecutedWithSuccess(_reserve, _amount, _fee);
    }
}