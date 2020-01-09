import {ITestEnv, ContractsInstancesOrigin, IATokenInstances} from '../utils/types';
import {
  ATokenInstance,
  LendingPoolInstance,
  ERC20DetailedInstance,
  MintableERC20Instance,
  LendingPoolCoreInstance,
} from '../utils/typechain-types/truffle-contracts';
import {testEnvProvider} from '../utils/truffle/dlp-tests-env';
import {convertToCurrencyDecimals} from '../utils/misc-utils';
import {APPROVAL_AMOUNT_LENDING_POOL_CORE, ETHEREUM_ADDRESS, oneEther, RATEMODE_STABLE, NIL_ADDRESS, MAX_UINT_AMOUNT} from '../utils/constants';

const expectRevert = require('@openzeppelin/test-helpers').expectRevert;

contract('AToken: Transfer', async ([deployer, ...users]) => {
  let _testEnvProvider: ITestEnv;
  let _aDAI: ATokenInstance;
  let _DAI: MintableERC20Instance;
  let _lendingPoolInstance: LendingPoolInstance;
  let _lendingPoolCoreInstance: LendingPoolCoreInstance;

  before('Initializing test variables', async () => {
    _testEnvProvider = await testEnvProvider(
      artifacts,
      [deployer, ...users],
      ContractsInstancesOrigin.TruffleArtifacts
    );

    const {
      deployedInstances: {aTokenInstances, tokenInstances},
      getLendingPoolInstance,
      getLendingPoolCoreInstance
    } = _testEnvProvider;

    const {aDAI} = aTokenInstances;
    const {DAI} = tokenInstances;

    _lendingPoolInstance = await getLendingPoolInstance();
    _lendingPoolCoreInstance = await getLendingPoolCoreInstance()

    _aDAI = aDAI;
    _DAI = DAI;
  });

  it('User 0 deposits 1000 DAI, transfers to user 1', async () => {
    await _DAI.mint(await convertToCurrencyDecimals(_DAI.address, '1000'), {
      from: users[0],
    });

    await _DAI.approve(_lendingPoolCoreInstance.address, APPROVAL_AMOUNT_LENDING_POOL_CORE, {
      from: users[0],
    });

    //user 1 deposits 1000 DAI
    const amountDAItoDeposit = await convertToCurrencyDecimals(_DAI.address, '1000');

    await _lendingPoolInstance.deposit(_DAI.address, amountDAItoDeposit, '0', {
      from: users[0],
    });

    await _aDAI.transfer(users[1], amountDAItoDeposit, {from: users[0]})

    const fromBalance = await _aDAI.balanceOf(users[0])
    const toBalance = await _aDAI.balanceOf(users[1])

    expect(fromBalance.toString()).to.be.equal("0", "Invalid from balance after transfer")
    expect(toBalance.toString()).to.be.equal(amountDAItoDeposit.toString(), "Invalid to balance after transfer")

  });


  it('User 1 redirects interest to user 2, transfers 500 DAI back to user 0', async () => {

    await _aDAI.redirectInterestStream(users[2], {from: users[1]});


    const aDAIRedirected = await convertToCurrencyDecimals(_DAI.address, '1000');

    const aDAItoTransfer = await convertToCurrencyDecimals(_DAI.address, '500');

    
    const user2RedirectedBalanceBefore = await _aDAI.getRedirectedBalance(users[2])
    expect(user2RedirectedBalanceBefore.toString()).to.be.equal(aDAIRedirected, "Invalid redirected balance for user 2 before transfer")

    await _aDAI.transfer(users[0], aDAItoTransfer, {from: users[1]})


    const user2RedirectedBalanceAfter = await _aDAI.getRedirectedBalance(users[2])
    const user1RedirectionAddress = await _aDAI.getInterestRedirectionAddress(users[1])

    expect(user2RedirectedBalanceAfter.toString()).to.be.equal(aDAItoTransfer, "Invalid redirected balance for user 2 after transfer")
    expect(user1RedirectionAddress.toString()).to.be.equal(users[2], "Invalid redirection address for user 1")

  });

  it('User 0 transfers back to user 1', async () => {


    const aDAItoTransfer = await convertToCurrencyDecimals(_DAI.address, '500');


    await _aDAI.transfer(users[1], aDAItoTransfer, {from: users[0]})


    const user2RedirectedBalanceAfter = await _aDAI.getRedirectedBalance(users[2])

    const user1BalanceAfter = await _aDAI.balanceOf(users[1])

    expect(user2RedirectedBalanceAfter.toString()).to.be.equal(user1BalanceAfter.toString(), "Invalid redirected balance for user 2 after transfer")

  });


  it('User 0 deposits 1 ETH and user tries to borrow, but the aTokens received as a transfer are not available as collateral (revert expected)', async () => {

    await _lendingPoolInstance.deposit(ETHEREUM_ADDRESS, oneEther, '0', {
      from: users[0],
      value: oneEther.toFixed(0)
    });

 
    await expectRevert(_lendingPoolInstance.borrow(ETHEREUM_ADDRESS, await convertToCurrencyDecimals(ETHEREUM_ADDRESS,"0.1"), RATEMODE_STABLE, "0", {from: users[1]}), "The collateral balance is 0")

  });

  it('User 1 sets the DAI as collateral and borrows, tries to transfer everything back to user 0 (revert expected)', async () => {

    await _lendingPoolInstance.setUserUseReserveAsCollateral(_DAI.address, true, {from: users[1]})

    const aDAItoTransfer = await convertToCurrencyDecimals(_DAI.address, '1000');

    await _lendingPoolInstance.borrow(ETHEREUM_ADDRESS, await convertToCurrencyDecimals(ETHEREUM_ADDRESS,"0.1"), RATEMODE_STABLE, "0", {from: users[1]})

    await expectRevert(_aDAI.transfer(users[0], aDAItoTransfer, {from: users[1]}), "Transfer cannot be allowed.")
  });

 
  it('User 0 tries to transfer 0 balance (revert expected)', async () => {
    await expectRevert(_aDAI.transfer(users[1], "0", {from: users[0]}), "Transferred amount needs to be greater than zero")
  });

  it('User 1 repays the borrow, transfers aDAI back to user 0', async () => {

    await _lendingPoolInstance.repay(ETHEREUM_ADDRESS, MAX_UINT_AMOUNT, users[1], {from: users[1], value: oneEther.toFixed(0)})

    const aDAItoTransfer = await convertToCurrencyDecimals(_DAI.address, '1000');

    await _aDAI.transfer(users[0], aDAItoTransfer, {from: users[1]})

    const user2RedirectedBalanceAfter = await _aDAI.getRedirectedBalance(users[2])

    const user1RedirectionAddress = await _aDAI.getInterestRedirectionAddress(users[1])

    expect(user2RedirectedBalanceAfter.toString()).to.be.equal("0", "Invalid redirected balance for user 2 after transfer")

    expect(user1RedirectionAddress.toString()).to.be.equal(NIL_ADDRESS, "Invalid redirected address for user 1")

  });

  it('User 0 redirects interest to user 2, transfers 500 aDAI to user 1. User 1 redirects to user 3. User 0 transfers another 100 aDAI', async () => {

   
    let aDAItoTransfer = await convertToCurrencyDecimals(_DAI.address, '500');

    await _aDAI.redirectInterestStream(users[2], {from: users[0]})

    await _aDAI.transfer(users[1], aDAItoTransfer, {from: users[0]})

    await _aDAI.redirectInterestStream(users[3], {from: users[1]})

    aDAItoTransfer = await convertToCurrencyDecimals(_DAI.address, '100');

    await _aDAI.transfer(users[1], aDAItoTransfer, {from: users[0]})


    const user2RedirectedBalanceAfter = await _aDAI.getRedirectedBalance(users[2])
    const user3RedirectedBalanceAfter = await _aDAI.getRedirectedBalance(users[3])

    const expectedUser2Redirected = await convertToCurrencyDecimals(_DAI.address, "400")
    const expectedUser3Redirected = await convertToCurrencyDecimals(_DAI.address, "600")

    expect(user2RedirectedBalanceAfter.toString()).to.be.equal(expectedUser2Redirected, "Invalid redirected balance for user 2 after transfer")
    expect(user3RedirectedBalanceAfter.toString()).to.be.equal(expectedUser3Redirected, "Invalid redirected balance for user 3 after transfer")


  });


});
