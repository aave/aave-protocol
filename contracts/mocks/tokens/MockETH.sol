pragma solidity ^0.5.0;



import "./MintableERC20.sol";


contract MockETH is MintableERC20 {

    uint public decimals = 18;
    string public symbol = "ETH";
    string public name = "Ethereum";
}