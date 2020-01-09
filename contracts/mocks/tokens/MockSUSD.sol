pragma solidity ^0.5.0;


import "./MintableERC20.sol";


contract MockSUSD is MintableERC20 {

    uint256 public decimals = 6;
    string public symbol = "SUSD";
    string public name = "Synthetix USD";
}