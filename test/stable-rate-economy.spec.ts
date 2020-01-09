import {
  LendingPoolInstance,
  LendingPoolCoreInstance,
} from "../utils/typechain-types/truffle-contracts"
import {
  ContractsInstancesOrigin,
  ITestEnv,
  IReservesParams,
  IATokenInstances,
  ITokenInstances,
} from "../utils/types"
import {
  RATEMODE_STABLE,
  APPROVAL_AMOUNT_LENDING_POOL_CORE,
  ETHEREUM_ADDRESS,
} from "../utils/constants"
import {testEnvProvider} from "../utils/truffle/dlp-tests-env"
import {convertToCurrencyDecimals} from "../utils/misc-utils"

const expectRevert = require("@openzeppelin/test-helpers").expectRevert

contract("LendingPool - stable rate economy tests", async ([deployer, ...users]) => {
  let _testEnvProvider: ITestEnv
  let _lendingPoolInstance: LendingPoolInstance
  let _lendingPoolCoreInstance: LendingPoolCoreInstance
  let _aTokenInstances: IATokenInstances
  let _tokenInstances: ITokenInstances

  let _daiAddress: string

  let _depositorAddress: string
  let _borrowerAddress: string

  let _web3: Web3

  before("Initializing LendingPool test variables", async () => {
    _testEnvProvider = await testEnvProvider(
      artifacts,
      [deployer, ...users],
      ContractsInstancesOrigin.TruffleArtifacts,
    )

    const {
      deployedInstances: {
        lendingPoolInstance,
        lendingPoolCoreInstance,
        aTokenInstances,
      },
      getTokenAddresses,
      getWeb3,
      getAllTokenInstances,
      getFirstBorrowerAddressOnTests,
      getFirstDepositorAddressOnTests,
      getReservesParams
    } = _testEnvProvider

    _lendingPoolInstance = lendingPoolInstance
    _lendingPoolCoreInstance = lendingPoolCoreInstance
    _aTokenInstances = aTokenInstances
    _tokenInstances = await getAllTokenInstances()
    _daiAddress = (await getTokenAddresses()).DAI
    _depositorAddress = await getFirstDepositorAddressOnTests()
    _borrowerAddress = await getFirstBorrowerAddressOnTests()

    _web3 = await getWeb3()
  })

  it("BORROW - Test user cannot borrow using the same currency as collateral", async () => {
    const {aDAI: aDaiInstance} = _aTokenInstances
    const {DAI: daiInstance} = _tokenInstances

    //mints DAI to depositor
    await daiInstance.mint(await convertToCurrencyDecimals(daiInstance.address, "1000"), {
      from: _depositorAddress,
    })

    //mints DAI to borrower
    await daiInstance.mint(await convertToCurrencyDecimals(daiInstance.address, "1000"), {
      from: _borrowerAddress,
    })

    //approve protocol to access depositor wallet
    await daiInstance.approve(_lendingPoolCoreInstance.address, APPROVAL_AMOUNT_LENDING_POOL_CORE, {
      from: _depositorAddress,
    })

    //approve protocol to access borrower wallet
    await daiInstance.approve(_lendingPoolCoreInstance.address, APPROVAL_AMOUNT_LENDING_POOL_CORE, {
      from: _borrowerAddress,
    })

    const amountDAItoDeposit = await convertToCurrencyDecimals(_daiAddress, "1000")

    //user 1 deposits 1000 DAI
    const txResult = await _lendingPoolInstance.deposit(_daiAddress, amountDAItoDeposit, "0", {
      from: _depositorAddress,
    })

    //user 2 deposits 1000 DAI, tries to borrow. Needs to be reverted as you can't borrow at a stable rate with the same collateral as the currency.
    const amountDAIToDepositBorrower = await convertToCurrencyDecimals(_daiAddress, "1000")
    await _lendingPoolInstance.deposit(_daiAddress, amountDAIToDepositBorrower, "0", {
      from: _borrowerAddress,
    })

    const data: any = await _lendingPoolInstance.getReserveData(_daiAddress)

    //user 2 tries to borrow
    const amountDAIToBorrow = await convertToCurrencyDecimals(_daiAddress, "250")

    //user 2 tries to borrow
    await expectRevert(
      _lendingPoolInstance.borrow(_daiAddress, amountDAIToBorrow, RATEMODE_STABLE, "0", {
        from: _borrowerAddress,
      }),
      "User cannot borrow the selected amount with a stable rate",
    )
  })

  it("BORROW - Test user cannot borrow more than 25% of the liquidity available", async () => {
    const {aDAI: aDaiInstance} = _aTokenInstances
    const {DAI: daiInstance} = _tokenInstances

    //redeem the DAI previously deposited
    const amountADAIToRedeem = await convertToCurrencyDecimals(aDaiInstance.address, "1000")
    await aDaiInstance.redeem(amountADAIToRedeem, {
      from: _borrowerAddress,
    })

    //user 2 deposits 5 ETH tries to borrow. needs to be reverted as you can't borrow more than 25% of the available reserve (250 DAI)
    const amountETHToDeposit = await convertToCurrencyDecimals(ETHEREUM_ADDRESS, "5")
    await _lendingPoolInstance.deposit(ETHEREUM_ADDRESS, amountETHToDeposit, "0", {
      from: _borrowerAddress,
      value: amountETHToDeposit,
    })

    const data: any = await _lendingPoolInstance.getReserveData(_daiAddress)

    const amountDAIToBorrow = await convertToCurrencyDecimals(_daiAddress, "500")

    //user 2 tries to borrow
    await expectRevert(
      _lendingPoolInstance.borrow(_daiAddress, amountDAIToBorrow, RATEMODE_STABLE, "0", {
        from: _borrowerAddress,
      }),
      "User is trying to borrow too much liquidity at a stable rate",
    )
  })

  it("BORROW - Test user can still borrow  a currency that he previously deposited as a collateral but he transferred/redeemed", async () => {
    const {aDAI: aDaiInstance} = _aTokenInstances
    const {DAI: daiInstance} = _tokenInstances

    const user = users[2]

    //user deposits 1000 DAI
    await daiInstance.mint(await convertToCurrencyDecimals(daiInstance.address, "1000"), {
      from: user,
    })
    await daiInstance.approve(_lendingPoolCoreInstance.address, APPROVAL_AMOUNT_LENDING_POOL_CORE, {
      from: user,
    })

    const amountDAIToDeposit = await convertToCurrencyDecimals(daiInstance.address, "1000")
    await _lendingPoolInstance.deposit(daiInstance.address, amountDAIToDeposit, "0", {
      from: user,
    })

    //user deposits 5 ETH as collateral
    const amountETHToDeposit = await convertToCurrencyDecimals(ETHEREUM_ADDRESS, "5")
    await _lendingPoolInstance.deposit(ETHEREUM_ADDRESS, amountETHToDeposit, "0", {
      from: user,
      value: amountETHToDeposit,
    })

    //user transfers to another address all the overlying aDAI

    const aDAIBalance = await aDaiInstance.balanceOf(user)

    await aDaiInstance.transfer(users[3], aDAIBalance, {
      from: user,
    })

    //check the underlying balance is 0
    const userData: any = await _lendingPoolInstance.getUserReserveData(daiInstance.address, user)

    expect(userData.currentATokenBalance.toString()).to.be.equal("0")

    //user tries to borrow the DAI at a stable rate using the ETH as collateral
    const amountDAIToBorrow = await convertToCurrencyDecimals(_daiAddress, "100")

    //user tries to borrow. No revert expected
    await _lendingPoolInstance.borrow(_daiAddress, amountDAIToBorrow, RATEMODE_STABLE, "0", {
      from: user,
    })
  })
})
