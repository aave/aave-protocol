pragma solidity ^0.5.0;


import "./MintableERC20.sol";


contract MockKNC is MintableERC20 {

    uint256 public decimals = 18;
    string public symbol = "KNC";
    string public name = "Kyber Network";
}