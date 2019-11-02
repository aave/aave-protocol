pragma solidity ^0.5.0;


import "./MintableERC20.sol";


contract MockUSDT is MintableERC20 {

    uint public decimals = 6;
    string public symbol = "USDT";
    string public name = "USDT Coin";
}