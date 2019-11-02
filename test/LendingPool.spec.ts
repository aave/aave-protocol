import {
  LendingPoolInstance,
  LendingPoolCoreInstance,
  IPriceOracleInstance,
} from "../utils/typechain-types/truffle-contracts"
import {
  ContractsInstancesOrigin,
  ITestEnv,
  IReservesParams,
  IATokenInstances,
  ITokenInstances,
} from "../utils/types"
import BigNumber from "bignumber.js"
import {
  WAD,
  RAY,
  ONE_YEAR,
  MAX_UINT_AMOUNT,
  RATEMODE_VARIABLE,
  RATEMODE_FIXED,
  APPROVAL_AMOUNT_LENDING_POOL_CORE,
  oneRay,
} from "../utils/constants"
import {testEnvProvider} from "../utils/truffle/dlp-tests-env"
import {convertToCurrencyDecimals} from "../utils/misc-utils"

const time = require("openzeppelin-test-helpers").time

const truffleAssert = require("truffle-assertions")

const {expect} = require("chai")

contract("LendingPool", async ([deployer, ...users]) => {
  let _testEnvProvider: ITestEnv
  let _lendingPoolInstance: LendingPoolInstance
  let _lendingPoolCoreInstance: LendingPoolCoreInstance
  let _priceOracleInstance: IPriceOracleInstance
  let _aTokenInstances: IATokenInstances
  let _tokenInstances: ITokenInstances

  let _ethereumAddress: string
  let _daiAddress: string

  let _reservesParams: IReservesParams

  let _depositorAddress: string
  let _borrowerAddress: string

  let _web3: Web3

  let _initialDepositorETHBalance: string
  let _baseRoundErrorBalance: number

  const halfEther = (0.5 * Math.pow(10, 18)).toString()

  before("Initializing LendingPool test variables", async () => {
    BigNumber.config({ROUNDING_MODE: 4})

    _testEnvProvider = await testEnvProvider(
      artifacts,
      [deployer, ...users],
      ContractsInstancesOrigin.Json,
    )

    const {
      deployedInstances: {
        lendingPoolInstance,
        lendingPoolCoreInstance,
        aTokenInstances,
        networkMetadataProviderInstance,
        priceOracleInstance,
      },
      getTokenAddresses,
      getWeb3,
      getAllTokenInstances,
      getFirstBorrowerAddressOnTests,
      getFirstDepositorAddressOnTests,
    } = _testEnvProvider

    const {getReservesParams} = await testEnvProvider(
      artifacts,
      [deployer, ...users],
      ContractsInstancesOrigin.Json,
    )
    _reservesParams = await getReservesParams()
    _lendingPoolInstance = lendingPoolInstance
    _lendingPoolCoreInstance = lendingPoolCoreInstance
    _priceOracleInstance = priceOracleInstance
    _aTokenInstances = aTokenInstances
    _tokenInstances = await getAllTokenInstances()
    _ethereumAddress = await networkMetadataProviderInstance.getEthereumAddress()
    _daiAddress = (await getTokenAddresses()).DAI
    _depositorAddress = await getFirstDepositorAddressOnTests()
    _borrowerAddress = await getFirstBorrowerAddressOnTests()

    _web3 = await getWeb3()
    _initialDepositorETHBalance = await _web3.eth.getBalance(_depositorAddress)

    /**
     * @dev deposits a small amount of DAI to cover for the rounding losses
     */

    _baseRoundErrorBalance = parseInt(await convertToCurrencyDecimals(_daiAddress, "1"))
    const {DAI: daiInstance} = _tokenInstances

    //mints DAI to depositor
    await daiInstance.mint(await convertToCurrencyDecimals(daiInstance.address, "1"), {
      from: users[5],
    })

    //approve protocol to access depositor wallet
    await daiInstance.approve(_lendingPoolCoreInstance.address, APPROVAL_AMOUNT_LENDING_POOL_CORE, {
      from: users[5],
    })

    // TODO: review referral code
    const txResult = await _lendingPoolInstance.deposit(
      _daiAddress,
      _baseRoundErrorBalance.toString(),
      "0",
      {from: users[5]},
    )
  })

  it("DEPOSITOR - Deposits ETH into the reserve", async () => {
    const amountToDeposit = await convertToCurrencyDecimals(_ethereumAddress, "1")

    // TODO: review referral code
    const txResult = await _lendingPoolInstance.deposit(
      _ethereumAddress,
      amountToDeposit,
      "0",
      {from: _depositorAddress, value: amountToDeposit},
    )

    // console.log("Deposit ETH gas cost: ", txResult.receipt.gasUsed)

    const reserveDataAfter = await _lendingPoolInstance.getReserveData(_ethereumAddress)

    const totalBalance = await web3.eth.getBalance(_lendingPoolCoreInstance.address)

    const depositorETHBalance = await web3.eth.getBalance(_depositorAddress)

    const userReserveData = await _lendingPoolInstance.getUserReserveData(
      _ethereumAddress,
      deployer,
    )

    const userGlobalData = await _lendingPoolInstance.getUserAccountData(deployer)

    const gasUsed = txResult.receipt.gasUsed

    const txCost = new BigNumber(gasUsed).multipliedBy(1000000000).toFixed()

    expect(reserveDataAfter[0].toString()).to.be.equal(
      // totalLiquidity
      amountToDeposit,
      "Invalid reserve liquidity",
    )

    expect(reserveDataAfter[1].toString()).to.be.equal(
      // availableLiquidity
      amountToDeposit,
      "Invalid available liquidity",
    )

    expect(totalBalance.toString()).to.be.equal(
      reserveDataAfter[1].toString(), // availableLiquidity
      "Invalid balance",
    )

    expect(reserveDataAfter[9].toString()).to.be.equal(RAY, "Invalid liquidityIndex") // liquidityIndex

    expect(userReserveData[0].toString()).to.be.equal(
      // currentATokenBalance
      await convertToCurrencyDecimals(_aTokenInstances.aETH.address, "100"),
      "Invalid aToken balance for the user",
    )

    expect(userReserveData[1].toString()).to.be.equal(
      // currentUnderlyingBalance
      amountToDeposit,
      "Invalid Underlying balance for the user",
    )

    expect(userGlobalData[0].toString()).to.be.equal(
      // totalLiquidityETH
      amountToDeposit,
      "Invalid total liquidity ETH balance for the user",
    )

    expect(userGlobalData[1].toString()).to.be.equal(
      // totalCollateralETH
      amountToDeposit,
      "Invalid total collateral ETH balance for the user",
    )

    expect(userGlobalData[2].toString()).to.be.equal(
      // totalBorrowsETH
      "0",
      "Invalid total borrows ETH balance for the user",
    )

    expect(depositorETHBalance.toString()).to.be.equal(
      new BigNumber(_initialDepositorETHBalance)
        .minus(amountToDeposit)
        .minus(txCost)
        .toFixed(),
    )

    truffleAssert.eventEmitted(txResult, "Deposit", (ev: any) => {
      const {_reserve, _user, _amount} = ev
      return (
        _reserve === _ethereumAddress &&
        _user === deployer &&
        new BigNumber(_amount).isEqualTo(new BigNumber(amountToDeposit))
      )
    })
  })

  it("DEPOSITOR - Redeems half of the aETH balance to ETH", async () => {
    const {aETH: aEthInstance} = _aTokenInstances
    const aTokensBalanceBefore = await aEthInstance.balanceOf(_depositorAddress)
    const depositorBalanceBefore = await _web3.eth.getBalance(_depositorAddress)
    const reserveDataBefore = await _lendingPoolInstance.getReserveData(_ethereumAddress)
    const amountToRedeem = new BigNumber(aTokensBalanceBefore).div(2)

    const txResult = await aEthInstance.redeem(amountToRedeem.toString(), {from: _depositorAddress})

    const depositorBalanceAfter = await web3.eth.getBalance(_depositorAddress)

    const reserveData = await _lendingPoolInstance.getReserveData(_ethereumAddress)

    const actualReserveBalance = await web3.eth.getBalance(_lendingPoolCoreInstance.address)

    const gasUsed = txResult.receipt.gasUsed

    const txCost = new BigNumber(gasUsed).multipliedBy(1000000000).toFixed()

    // console.log("Redeem ETH gas cost: ", txResult.receipt.gasUsed)

    expect(depositorBalanceAfter.toString()).to.be.equal(
      new BigNumber(depositorBalanceBefore)
        .plus(halfEther)
        .minus(txCost)
        .toFixed(),
      "Invalid ETH depositor balance after redeem",
    )
    expect(reserveData[0].toString()).to.be.equal(
      // totalLiquidity
      new BigNumber(reserveDataBefore[0]).minus(halfEther).toFixed(), // totalLiquidity
      "Invalid reserve liquidity",
    )
    expect(reserveData[1].toString()).to.be.equal(
      // availableLiquidity
      new BigNumber(reserveDataBefore[1]).minus(halfEther).toFixed(), // availableLiquidity
      "Invalid available liquidity",
    )
    expect(actualReserveBalance.toString()).to.be.equal(
      reserveData[1].toString(), // availableLiquidity
      "Invalid balance",
    )
    expect(reserveData[9].toString()).to.be.equal(RAY, "Invalid liquidityIndex") // liquidityIndex

    const userGlobalData = await _lendingPoolInstance.getUserAccountData(deployer)
    const userReserveData = await _lendingPoolInstance.getUserReserveData(
      _ethereumAddress,
      deployer,
    )

    expect(userReserveData[0].toString()).to.be.equal(
      // currentATokenBalance
      await convertToCurrencyDecimals(_aTokenInstances.aETH.address, "50"),
      "Invalid aToken balance for the user",
    )

    expect(userReserveData[1].toString()).to.be.equal(
      // currentUnderlyingBalance
      await convertToCurrencyDecimals(_ethereumAddress, "0.5"),
      "Invalid Underlying balance for the user",
    )

    expect(userGlobalData[0].toString()).to.be.equal(
      // totalLiquidityETH
      await convertToCurrencyDecimals(_ethereumAddress, "0.5"),
      "Invalid total liquidity ETH balance for the user",
    )

    expect(userGlobalData[1].toString()).to.be.equal(
      // totalCollateralETH
      await convertToCurrencyDecimals(_ethereumAddress, "0.5"),
      "Invalid total collateral ETH balance for the user",
    )

    expect(userGlobalData[2].toString()).to.be.equal(
      // totalBorrowsETH
      "0",
      "Invalid total borrows ETH balance for the user",
    )
    truffleAssert.eventEmitted(txResult, "Redeem", (ev: any) => {
      const {_aToken, _user, _aTokenAmount, _amountUnderlying} = ev
      return (
        _aToken.toUpperCase() === _aTokenInstances.aETH.address.toUpperCase() &&
        _user.toUpperCase() === _depositorAddress.toUpperCase() &&
        new BigNumber(_aTokenAmount.toString()).isEqualTo(amountToRedeem.toString())
      )
    })
  })

  it("DEPOSITOR - Redeems remaining half of the aETH balance to ETH", async () => {
    const {aETH: aEthInstance} = _aTokenInstances
    const aEthBalanceBefore = await aEthInstance.balanceOf(_depositorAddress)

    const depositorBalanceBefore = await web3.eth.getBalance(_depositorAddress)
    const amountToRedeem = new BigNumber(aEthBalanceBefore)

    const txResult = await aEthInstance.redeem(amountToRedeem.toString(), {from: _depositorAddress})

    const depositorBalanceAfter = await web3.eth.getBalance(_depositorAddress)

    const reserveData = await _lendingPoolInstance.getReserveData(_ethereumAddress)

    const actualReserveBalance = await web3.eth.getBalance(_lendingPoolCoreInstance.address)

    const gasUsed = txResult.receipt.gasUsed

    const txCost = new BigNumber(gasUsed).multipliedBy(1000000000).toFixed()

    // console.log("Redeem ETH gas cost: ", txResult.receipt.gasUsed)

    expect(depositorBalanceAfter.toString()).to.be.equal(
      new BigNumber(depositorBalanceBefore)
        .plus(halfEther)
        .minus(txCost)
        .toFixed(),
    )
    expect(reserveData[0].toString()).to.be.equal(
      // totalLiquidity
      "0",
      "Invalid reserve liquidity",
    )
    expect(reserveData[1].toString()).to.be.equal(
      // availableLiquidity
      "0",
      "Invalid available liquidity",
    )
    expect(actualReserveBalance.toString()).to.be.equal(
      reserveData[1].toString(), // availableLiquidity
      "Invalid balance",
    )
    expect(reserveData[9].toString()).to.be.equal(RAY, "Invalid liquidityIndex") // liquidityIndex

    const userGlobalData = await _lendingPoolInstance.getUserAccountData(_depositorAddress)
    const userReserveData = await _lendingPoolInstance.getUserReserveData(
      _ethereumAddress,
      _depositorAddress,
    )

    expect(userReserveData[0].toString()).to.be.equal(
      // currentATokenBalance
      "0",
      "Invalid aToken balance for the user",
    )

    expect(userReserveData[1].toString()).to.be.equal(
      // currentUnderlyingBalance
      "0",
      "Invalid Underlying balance for the user",
    )

    expect(userGlobalData[0].toString()).to.be.equal(
      // totalLiquidityETH
      "0",
      "Invalid total liquidity ETH balance for the user",
    )

    expect(userGlobalData[1].toString()).to.be.equal(
      // totalCollateralETH
      "0",
      "Invalid total collateral ETH balance for the user",
    )

    expect(userGlobalData[2].toString()).to.be.equal(
      // totalBorrowsETH
      "0",
      "Invalid total borrows ETH balance for the user",
    )
    truffleAssert.eventEmitted(txResult, "Redeem", (ev: any) => {
      const {_aToken, _user, _aTokenAmount, _amountUnderlying} = ev
      return (
        _aToken.toUpperCase() === _aTokenInstances.aETH.address.toUpperCase() &&
        _user.toUpperCase() === _depositorAddress.toUpperCase() &&
        new BigNumber(_aTokenAmount.toString()).isEqualTo(amountToRedeem.toString())
      )
    })
  })

  it("DEPOSITOR - Deposits DAI into the reserve", async () => {
    const {aDAI: aDaiInstance} = _aTokenInstances
    const {DAI: daiInstance} = _tokenInstances

    //mints DAI to depositor
    await daiInstance.mint(await convertToCurrencyDecimals(daiInstance.address, "1000"), {
      from: _depositorAddress,
    })

    //approve protocol to access depositor wallet
    await daiInstance.approve(_lendingPoolCoreInstance.address, APPROVAL_AMOUNT_LENDING_POOL_CORE, {
      from: _depositorAddress,
    })

    const amountToDeposit = await convertToCurrencyDecimals(_daiAddress, "1000")

    // TODO: review referral code
    const txResult = await _lendingPoolInstance.deposit(
      daiInstance.address,
      amountToDeposit,
      "0",
      {from: _depositorAddress},
    )

    // console.log("Deposit DAI gas cost: ", txResult.receipt.gasUsed)

    const reserveDataAfter = await _lendingPoolInstance.getReserveData(_daiAddress)
    const actualReserveBalance = await daiInstance.balanceOf(_lendingPoolCoreInstance.address)
    const userReserveData = await _lendingPoolInstance.getUserReserveData(
      _daiAddress,
      _depositorAddress,
    )
    const userGlobalData = await _lendingPoolInstance.getUserAccountData(_depositorAddress)
    const currDAIPriceETH = await _priceOracleInstance.getAssetPrice(_daiAddress)

    expect(reserveDataAfter[0].toString()).to.be.equal(
      // totalLiquidity
      new BigNumber(await convertToCurrencyDecimals(_daiAddress, "1000"))
        .plus(_baseRoundErrorBalance)
        .toFixed(),
      "Invalid reserve liquidity",
    )

    expect(reserveDataAfter[1].toString()).to.be.equal(
      // availableLiquidity
      new BigNumber(await convertToCurrencyDecimals(_daiAddress, "1000"))
        .plus(_baseRoundErrorBalance)
        .toFixed(),
      "Invalid available liquidity",
    )

    expect(actualReserveBalance.toString()).to.be.equal(
      new BigNumber(await convertToCurrencyDecimals(_daiAddress, "1000"))
        .plus(_baseRoundErrorBalance)
        .toFixed(),
      "Invalid balance",
    )

    expect(reserveDataAfter[10].toString()).to.be.equal(RAY, "Invalid liquidityIndex") // liquidityIndex

    expect(userReserveData[0].toString()).to.be.equal(
      // currentATokenBalance
      await convertToCurrencyDecimals(_aTokenInstances.aDAI.address, "100000"),
      "Invalid aToken balance for the user",
    )

    expect(userReserveData[1].toString()).to.be.equal(
      // currentUnderlyingBalance
      await convertToCurrencyDecimals(_daiAddress, "1000"),
      "Invalid Underlying balance for the user",
    )

    expect(userGlobalData[0].toString()).to.be.equal(
      // totalLiquidityETH
      new BigNumber("1000").multipliedBy(currDAIPriceETH).toFixed(),
      "Invalid total liquidity ETH balance for the user",
    )

    expect(userGlobalData[1].toString()).to.be.equal(
      // totalCollateralETH
      new BigNumber("1000").multipliedBy(currDAIPriceETH).toFixed(),
      "Invalid total collateral ETH balance for the user",
    )

    expect(userGlobalData[2].toString()).to.be.equal(
      // totalBorrowsETH
      "0",
      "Invalid total borrows ETH balance for the user",
    )

    truffleAssert.eventEmitted(txResult, "Deposit", (ev: any) => {
      const {_reserve, _user, _amount} = ev
      return (
        _reserve === _daiAddress &&
        _user === _depositorAddress &&
        new BigNumber(_amount).isEqualTo(new BigNumber(amountToDeposit))
      )
    })
  })

  it("BORROWER - Deposits ETH into the reserve", async () => {
    const amountToDeposit = await convertToCurrencyDecimals(_ethereumAddress, "4")

    const borrowerETHBalanceBefore = await web3.eth.getBalance(_borrowerAddress)

    const txResult = await _lendingPoolInstance.deposit(
      _ethereumAddress,
      amountToDeposit,
      "0",
      {from: _borrowerAddress, value: amountToDeposit},
    )
    const reserveDataAfter = await _lendingPoolInstance.getReserveData(_ethereumAddress)

    const totalBalance = await web3.eth.getBalance(_lendingPoolCoreInstance.address)

    const borrowerETHAfter = await web3.eth.getBalance(_borrowerAddress)

    const userReserveData = await _lendingPoolInstance.getUserReserveData(
      _ethereumAddress,
      _borrowerAddress,
    )

    const userGlobalData = await _lendingPoolInstance.getUserAccountData(_borrowerAddress)

    const gasUsed = txResult.receipt.gasUsed

    const txCost = new BigNumber(gasUsed).multipliedBy(1000000000).toFixed()

    expect(reserveDataAfter[0].toString()).to.be.equal(
      // totalLiquidity
      amountToDeposit,
      "Invalid reserve liquidity",
    )

    expect(reserveDataAfter[1].toString()).to.be.equal(
      // availableLiquidity
      amountToDeposit,
      "Invalid available liquidity",
    )

    expect(totalBalance.toString()).to.be.equal(
      reserveDataAfter[1].toString(), // availableLiquidity
      "Invalid balance",
    )

    expect(reserveDataAfter[9].toString()).to.be.equal(RAY, "Invalid liquidityIndex") // liquidityIndex

    expect(userReserveData[0].toString()).to.be.equal(
      // currentATokenBalance
      await convertToCurrencyDecimals(_aTokenInstances.aETH.address, "400"),
      "Invalid aToken balance for the user",
    )

    expect(userReserveData[1].toString()).to.be.equal(
      // currentUnderlyingBalance
      amountToDeposit,
      "Invalid Underlying balance for the user",
    )

    expect(userGlobalData[0].toString()).to.be.equal(
      // totalLiquidityETH
      amountToDeposit,
      "Invalid total liquidity ETH balance for the user",
    )

    expect(userGlobalData[1].toString()).to.be.equal(
      // totalCollateralETH
      amountToDeposit,
      "Invalid total collateral ETH balance for the user",
    )

    expect(userGlobalData[2].toString()).to.be.equal(
      // totalBorrowsETH
      "0",
      "Invalid total borrows ETH balance for the user",
    )

    expect(borrowerETHAfter.toString()).to.be.equal(
      new BigNumber(borrowerETHBalanceBefore)
        .minus(amountToDeposit)
        .minus(txCost)
        .toFixed(),
      "The wallet balance of the BORROWER after the deposit does not match.",
    )

    truffleAssert.eventEmitted(txResult, "Deposit", (ev: any) => {
      const {_reserve, _user, _amount} = ev
      return (
        _reserve === _ethereumAddress &&
        _user === _borrowerAddress &&
        new BigNumber(_amount).isEqualTo(new BigNumber(amountToDeposit))
      )
    })
  })

  it("BORROWER - Borrows 1/4 of the available borrows in DAI at a fixed rate from the reserve against deposited ETH", async () => {
    const userGlobalData = await _lendingPoolInstance.getUserAccountData(_borrowerAddress)

    const daiEthPrice = await _priceOracleInstance.getAssetPrice(_daiAddress)

    const amountToBorrow = new BigNumber(userGlobalData[3]) // availableBorrowsETH
      .div(daiEthPrice)
      .multipliedBy(WAD).div(4)

    console.log("Amount to borrow: ", amountToBorrow.toString())

    // TODO: review referral code
    const txResult = await _lendingPoolInstance.borrow(
      _daiAddress,
      amountToBorrow.toFixed(0),
      RATEMODE_FIXED,
      "0",
      {from: _borrowerAddress},
    )

    const reserveData: any = await _lendingPoolInstance.getReserveData(_daiAddress)
    const userData: any = await _lendingPoolInstance.getUserReserveData(
      _daiAddress,
      _borrowerAddress,
    )

    const expectedUtilizationRate = new BigNumber(reserveData.totalBorrowsFixed)
      .multipliedBy(RAY)
      .div(reserveData.totalLiquidity)
      .toFixed(0)

    const expectedVariableRate = new BigNumber(_reservesParams.DAI.baseVariableBorrowRate)
      .plus(
        new BigNumber(_reservesParams.DAI.variableBorrowRateScaling)
          .div(RAY)
          .multipliedBy(expectedUtilizationRate),
      )
      .toFixed(0)

    const expectedFixedRate = new BigNumber(0.14).multipliedBy(RAY).toFixed()

    expect(reserveData.utilizationRate.toString()).to.be.equal(
      expectedUtilizationRate,
      "Utilization rate does not match",
    )

    expect(reserveData.averageFixedBorrowRate.toString()).to.be.equal(
      userData.borrowRate.toString(),
      "Rates don't match",
    )

    expect(reserveData.fixedBorrowRate.toString()).to.be.equal(
      expectedFixedRate,
      "Calculated fixed rate does not match",
    )

    expect(reserveData.variableBorrowRate.toString()).to.be.equal(
      expectedVariableRate,
      "Calculated variable rate does not match",
    )
  })

  it("BORROWER - Borrows 1/4 of the available borrows in DAI at a fixed rate from the reserve against deposited ETH", async () => {
    const userGlobalData = await _lendingPoolInstance.getUserAccountData(_borrowerAddress)
    const daiEthPrice = await _priceOracleInstance.getAssetPrice(_daiAddress)

    const amountToBorrow = new BigNumber(userGlobalData[3]) // availableBorrowsETH
      .div(daiEthPrice)
      .multipliedBy(WAD).div(4)

    const currentFixedRate = (await _lendingPoolCoreInstance.getReserveCurrentFixedBorrowRate(
      _daiAddress,
    )).toString()

    // TODO: review referral code
    const txResult = await _lendingPoolInstance.borrow(
      _daiAddress,
      amountToBorrow.toFixed(0),
      RATEMODE_FIXED,
      "0",
      {from: _borrowerAddress},
    )

    await time.increase(time.duration.years(1))

    const userReserveData: any = await _lendingPoolInstance.getUserReserveData(
      _daiAddress,
      _borrowerAddress,
    )
    const reserveData = await _lendingPoolInstance.getReserveData(_daiAddress)

    const totalBorrowed = new BigNumber(userReserveData[2]) // currentBorrowBalance
      .plus(userReserveData[7]) // originationFee
      .toFixed()

    const principalBorrowBalance = userReserveData[3].toString()

    //calculating expected values
    //one year passed, so borrower needs to pay 14% on the borrowed amount.
    //also the reserve must have earned 14% on the borrowed amount
    const currTime = await time.latest()

    const expectedUtilizationRate = new BigNumber(reserveData[2]) // totalBorrowsFixed
      .multipliedBy(RAY)
      .div(reserveData[0]) // totalLiquidity
      .toFixed(0)

    const expectedVariableRate = new BigNumber(_reservesParams.DAI.baseVariableBorrowRate)
      .plus(
        new BigNumber(_reservesParams.DAI.variableBorrowRateScaling)
          .div(RAY)
          .multipliedBy(expectedUtilizationRate),
      )
      .toFixed(0)

    const expectedFixedRate = new BigNumber(0.14)
      .multipliedBy(RAY)
      .toFixed(0)

    expect(reserveData[8].toString()).to.be.equal(
      // utilizationRate
      expectedUtilizationRate,
      "Utilization rate does not match",
    )

    expect(reserveData[6].toString()).to.be.equal(
      // fixedBorrowRate
      expectedFixedRate,
      "Calculated fixed rate does not match",
    )

    expect(reserveData[5].toString()).to.be.equal(
      // variableBorrowRate
      expectedVariableRate,
      "Calculated variable rate does not match",
    )
  })

  it("BORROWER - Repays the fixed rate DAI borrow", async () => {
    const {DAI: daiInstance} = _tokenInstances

    //mint additional DAI to borrower to cover the interest
    await daiInstance.mint(await convertToCurrencyDecimals(daiInstance.address, "5000"), {
      from: _borrowerAddress,
    })

    //authorizing the protocol first
    await daiInstance.approve(_lendingPoolCoreInstance.address, APPROVAL_AMOUNT_LENDING_POOL_CORE, {
      from: _borrowerAddress,
    })

    const reserveDataBefore: any = await _lendingPoolInstance.getReserveData(_daiAddress)
    const userDataBefore: any = await _lendingPoolInstance.getUserReserveData(
      _daiAddress,
      _borrowerAddress,
    )
    const normalizedIncome = await _lendingPoolCoreInstance.getReserveNormalizedIncome(_daiAddress)
    const reserveLastUpdate = await _lendingPoolCoreInstance.getReserveLastUpdate(_daiAddress)
    const userLastUpdate = await _lendingPoolCoreInstance.getUserLastUpdate(
      _daiAddress,
      _borrowerAddress,
    )
    const currTime = await time.latest()

    const txResult = await _lendingPoolInstance.repay(
      daiInstance.address,
      MAX_UINT_AMOUNT,
      _borrowerAddress,
      {from: _borrowerAddress},
    )

    // console.log("Repay DAI gas cost: ", txResult.receipt.gasUsed)

    const userData: any = await _lendingPoolInstance.getUserReserveData(
      _daiAddress,
      _borrowerAddress,
    )
    const reserveData: any = await _lendingPoolInstance.getReserveData(_daiAddress)

    expect(userData.currentBorrowBalance.toString()).to.be.equal("0") // currentBorrowBalance
    expect(reserveData.totalBorrowsVariable.toString()).to.be.equal("0") // total borrows variable
    expect(reserveData.totalBorrowsFixed.toString()).to.be.equal("0") // total borrows variable
    expect(reserveData.variableBorrowRate.toString()).to.be.equal(
      new BigNumber(0.06).multipliedBy(oneRay).toFixed(),
    ) // total borrows variable
    expect(reserveData.utilizationRate.toString()).to.be.equal("0") // total borrows variable
    expect(reserveData.liquidityRate.toString()).to.be.equal("0") // total borrows variable
    expect(reserveData.averageFixedBorrowRate.toString()).to.be.equal("0")
  })

  it("BORROWER - Borrows at a variable rate and swaps to fixed", async () => {
    const {DAI: daiInstance} = _tokenInstances
    const userGlobalData = await _lendingPoolInstance.getUserAccountData(_borrowerAddress)

    const daiEthPrice = await _priceOracleInstance.getAssetPrice(_daiAddress)

    const amountToBorrow = new BigNumber(userGlobalData[3]) // availableBorrowsETH
      .div(daiEthPrice)
      .multipliedBy(WAD)
      .toFixed(0)

    const borrowTxResult = await _lendingPoolInstance.borrow(
      daiInstance.address,
      amountToBorrow,
      RATEMODE_VARIABLE,
      "0",
      {from: _borrowerAddress},
    )

    const reserveDataBefore = await _lendingPoolInstance.getReserveData(_daiAddress)
    const userReserveDataBefore = await _lendingPoolInstance.getUserReserveData(
      _daiAddress,
      _borrowerAddress,
    )

    const switchTxResult = await _lendingPoolInstance.swapBorrowRateMode(daiInstance.address, {
      from: _borrowerAddress,
    })

    // console.log("Swap gas cost: ", switchTxResult.receipt.gasUsed)

    const reserveDataAfter = await _lendingPoolInstance.getReserveData(_daiAddress)
    const userReserveDataAfter = await _lendingPoolInstance.getUserReserveData(
      _daiAddress,
      _borrowerAddress,
    )
  
    expect(reserveDataBefore[3].toString()).to.be.equal(
      // totalBorrowsVariable
      amountToBorrow,
      "Invalid total borrows variable before",
    )
    expect(reserveDataBefore[2].toString()).to.be.equal(
      // totalBorrowsFixed
      "0",
      "Invalid total borrows fixed before",
    )
    expect(userReserveDataBefore[3].toString()).to.be.equal(
      // principalBorrowBalance
      amountToBorrow,
      "Invalid principal borrow balance before",
    )
    expect(userReserveDataBefore[4].toString()).to.be.equal(
      // borrowRateMode
      RATEMODE_VARIABLE,
      "Invalid borrow rate mode before",
    )

    expect(userReserveDataAfter[4].toString()).to.be.equal(RATEMODE_FIXED) // borrowRateMode
  })

  it("BORROWER - Swaps the current borrow back to variable", async () => {
    const {DAI: daiInstance} = _tokenInstances
    const userReserveDataBefore = await _lendingPoolInstance.getUserReserveData(
      _daiAddress,
      _borrowerAddress,
    )

    const currentBorrowBalance = userReserveDataBefore[3].toString() // principalBorrowBalance

    const switchTxResult = await _lendingPoolInstance.swapBorrowRateMode(daiInstance.address, {
      from: _borrowerAddress,
    })

    // console.log("Swap gas cost: ", switchTxResult.receipt.gasUsed)

    const reserveDataAfter = await _lendingPoolInstance.getReserveData(_daiAddress)
    const userReserveDataAfter = await _lendingPoolInstance.getUserReserveData(
      _daiAddress,
      _borrowerAddress,
    )

    expect(reserveDataAfter[2].toString()).to.be.equal(
      // totalBorrowsFixed
      "0",
      "Invalid total borrows fixed after",
    )
    expect(userReserveDataAfter[4].toString()).to.be.equal(RATEMODE_VARIABLE) // borrowRateMode
  })

  it("BORROWER - Repays the variable rate DAI borrow", async () => {
    const {DAI: daiInstance} = _tokenInstances

    //mint additional DAI to borrower to cover the interest
    await daiInstance.mint(await convertToCurrencyDecimals(daiInstance.address, "1000"), {
      from: _borrowerAddress,
    })

    await time.increase(time.duration.years(1))

    //authorizing the protocol first
    await daiInstance.approve(_lendingPoolCoreInstance.address, APPROVAL_AMOUNT_LENDING_POOL_CORE, {
      from: _borrowerAddress,
    })

    const txResult = await _lendingPoolInstance.repay(
      daiInstance.address,
      MAX_UINT_AMOUNT,
      _borrowerAddress,
      {from: _borrowerAddress},
    )

    const userData: any = await _lendingPoolInstance.getUserReserveData(
      _daiAddress,
      _borrowerAddress,
    )
    const reserveData: any = await _lendingPoolInstance.getReserveData(_daiAddress)

    expect(userData.currentBorrowBalance.toString()).to.be.equal("0") // currentBorrowBalance
    expect(reserveData.totalBorrowsVariable.toString()).to.be.equal("0") // total borrows variable
    expect(reserveData.totalBorrowsFixed.toString()).to.be.equal("0") // total borrows variable
    //    expect(reserveData.variableBorrowRate.toString()).to.be.equal(new BigNumber(0.6).multipliedBy(oneRay).toFixed()) // total borrows variable
    expect(reserveData.utilizationRate.toString()).to.be.equal("0") // total borrows variable
    expect(reserveData.liquidityRate.toString()).to.be.equal("0") // total borrows variable
  })

  it("DEPOSITOR - Redeems the deposited DAI", async () => {
    const {aDAI: aDaiInstance} = _aTokenInstances
    const {DAI: daiInstance} = _tokenInstances
    const aDaiBalanceBefore = await aDaiInstance.balanceOf(_depositorAddress)

    await time.increase(time.duration.years(10))

    const converted = await aDaiInstance.aTokenAmountToUnderlyingAmount(aDaiBalanceBefore)

    const actualUserDaiBalanceBefore = await daiInstance.balanceOf(_depositorAddress)
    const txResult = await aDaiInstance.redeem(aDaiBalanceBefore.toString(), {
      from: _depositorAddress,
    })

    const reserveData = await _lendingPoolInstance.getReserveData(_daiAddress)

    const actualReserveADaiBalance = await aDaiInstance.balanceOf(_lendingPoolCoreInstance.address)

    const actualDaiUserBalance = await daiInstance.balanceOf(_depositorAddress)

    const expectedBalanceDifference = new BigNumber(actualDaiUserBalance.toString())
      .minus(actualUserDaiBalanceBefore)
      .toFixed()

    expect(expectedBalanceDifference.toString()).to.be.equal(
      converted.toString(),
      "The actual user balance does not match the expected amount",
    )

    expect(reserveData[0]).to.be.bignumber.greaterThan(
      _baseRoundErrorBalance.toString(),
      "Invalid reserve liquidity",
    ) // totalLiquidity
    expect(reserveData[1]).to.be.bignumber.greaterThan(
      _baseRoundErrorBalance.toString(),
      "Invalid available liquidity",
    )

    const userGlobalData = await _lendingPoolInstance.getUserAccountData(_depositorAddress)
    const userReserveData = await _lendingPoolInstance.getUserReserveData(
      _daiAddress,
      _depositorAddress,
    )

    expect(userReserveData[0].toString()).to.be.equal(
      // currentATokenBalance
      "0",
      "Invalid aToken balance for the user",
    )

    expect(userReserveData[1].toString()).to.be.equal(
      // currentUnderlyingBalance
      await convertToCurrencyDecimals(_daiAddress, "0"),
      "Invalid Underlying balance for the user",
    )

    expect(userGlobalData[0].toString()).to.be.equal(
      // totalLiquidityETH
      await convertToCurrencyDecimals(_daiAddress, "0"),
      "Invalid total liquidity ETH balance for the user",
    )

    expect(userGlobalData[1].toString()).to.be.equal(
      // totalCollateralETH
      await convertToCurrencyDecimals(_daiAddress, "0"),
      "Invalid total collateral ETH balance for the user",
    )

    expect(userGlobalData[2].toString()).to.be.equal(
      // totalBorrowsETH
      "0",
      "Invalid total borrows ETH balance for the user",
    )
    truffleAssert.eventEmitted(txResult, "Redeem", (ev: any) => {
      const {_aToken, _user, _aTokenAmount, _amountUnderlying} = ev
      return (
        _aToken.toUpperCase() === _aTokenInstances.aDAI.address.toUpperCase() &&
        _user.toUpperCase() === _depositorAddress.toUpperCase() &&
        new BigNumber(_aTokenAmount.toString()).isEqualTo(aDaiBalanceBefore.toString())
      )
    })
  })
})
