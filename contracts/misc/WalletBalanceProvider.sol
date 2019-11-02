pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/utils/Address.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

import "../configuration/LendingPoolAddressesProvider.sol";
import "../lendingpool/LendingPoolCore.sol";
import "../interfaces/INetworkMetadataProvider.sol";


/*************************************************************************************
@title WalletBalanceProvider contract
@author Aave, influenced by https://github.com/wbobeirne/eth-balance-checker/blob/master/contracts/BalanceChecker.sol
@notice Implements a logic of getting multiple tokens balance for one user address

@dev NOTE: THIS CONTRACT IS NOT USED WITHIN THE AAVE PROTOCOL. It's an accessory contract used to reduce the number of calls
towards the blockchain.

 *************************************************************************************/


contract WalletBalanceProvider {

    using Address for address;

    LendingPoolAddressesProvider provider;

    constructor(LendingPoolAddressesProvider _provider) public {

        provider = _provider;

    }
    /**
    @dev Fallback function, don't accept any ETH
    **/
    function() external payable {
        revert("WalletBalanceProvider does not accept payments");
    }

    /**
    @dev Check the token balance of a wallet in a token contract

    Returns the balance of the token for user. Avoids possible errors:
      - return 0 on non-contract address
    **/
    function balanceOf(address _user, address _token) public view returns (uint) {
        // check if token is actually a contract
        if (_token.isContract()) {
            return IERC20(_token).balanceOf(_user);
        } else {
            return 0;
        }
    }


    /**
    @dev provides balances of user wallet for all reserves available on the pool
    */
    function getUserWalletBalances(address _user) public view returns (address[] memory, uint[] memory) {

        LendingPoolCore core = LendingPoolCore(provider.getLendingPoolCore());

        address[] memory reserves = core.getReserves();
        address ethereumAddress = INetworkMetadataProvider(provider.getNetworkMetadataProvider()).getEthereumAddress();

        uint[] memory balances = new uint[](reserves.length);

        for (uint j = 0; j < reserves.length; j++) {
            if (reserves[j] != ethereumAddress) {
                balances[j] = balanceOf(_user, reserves[j]);
            } else {
                balances[j] = _user.balance; // ETH balance
            }
        }

        return (reserves, balances);
    }
}