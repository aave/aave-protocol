import {
  LendingPoolInstance,
  LendingPoolCoreInstance,
  IPriceOracleInstance,
  MockFlashLoanReceiverInstance,
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
  oneEther,
  oneRay,
} from "../utils/constants"
import {testEnvProvider} from "../utils/truffle/dlp-tests-env"
import {convertToCurrencyDecimals, convertToCurrencyUnits} from "../utils/misc-utils"

const truffleAssert = require("truffle-assertions")
const expectRevert = require("openzeppelin-test-helpers").expectRevert

contract("LendingPool FlashLoan function", async ([deployer, ...users]) => {
  let _testEnvProvider: ITestEnv
  let _lendingPoolInstance: LendingPoolInstance
  let _lendingPoolCoreInstance: LendingPoolCoreInstance
  let _mockFlasLoanReceiverInstance: MockFlashLoanReceiverInstance
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

  const halfEther = (0.5 * Math.pow(10, 18)).toString()

  before("Initializing LendingPool test variables", async () => {
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
        mockFlashLoanReceiverInstance,
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
    _mockFlasLoanReceiverInstance = mockFlashLoanReceiverInstance as MockFlashLoanReceiverInstance
    _tokenInstances = await getAllTokenInstances()
    _ethereumAddress = await networkMetadataProviderInstance.getEthereumAddress()
    _daiAddress = (await getTokenAddresses()).DAI
    _depositorAddress = await getFirstDepositorAddressOnTests()
    _borrowerAddress = await getFirstBorrowerAddressOnTests()

    _web3 = await getWeb3()
    _initialDepositorETHBalance = await _web3.eth.getBalance(_depositorAddress)
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

  it("FLASH LOAN - Takes ETH Loan, returns the funds correctly", async () => {
    //move funds to the MockFlashLoanReceiver contract

    let send = web3.eth.sendTransaction({
      from: deployer,
      to: _mockFlasLoanReceiverInstance.address,
      value: web3.utils.toWei("0.5", "ether"),
    })

    // TODO: review referral code
    const txResult = await _lendingPoolInstance.flashLoan(
      _mockFlasLoanReceiverInstance.address,
      _ethereumAddress,
      new BigNumber(0.8).multipliedBy(oneEther),
    )

    const reserveData: any = await _lendingPoolInstance.getReserveData(_ethereumAddress)
    const userData: any = await _lendingPoolInstance.getUserReserveData(_ethereumAddress, deployer)

    const totalLiquidity = await convertToCurrencyUnits(
      _ethereumAddress,
      reserveData.totalLiquidity,
    )
    const currentLiqudityRate = reserveData.liquidityRate
    const currentLiquidityIndex = reserveData.liquidityIndex
    const currentUserBalance = await convertToCurrencyUnits(
      _ethereumAddress,
      userData.currentUnderlyingBalance,
    )

    expect(totalLiquidity.toString()).to.be.equal("1.008")
    expect(currentLiqudityRate.toString()).to.be.equal("0")
    expect(currentLiquidityIndex.toString()).to.be.equal(
      new BigNumber(1.008).multipliedBy(oneRay).toFixed(),
    )
    expect(currentUserBalance.toString()).to.be.equal("1.008")
  })

  it("FLASH LOAN - Takes ETH Loan, does not return the funds", async () => {
    //move funds to the MockFlashLoanReceiver contract

    let send = web3.eth.sendTransaction({
      from: deployer,
      to: _mockFlasLoanReceiverInstance.address,
      value: web3.utils.toWei("0.5", "ether"),
    })

    await _mockFlasLoanReceiverInstance.setFailExecutionTransfer(true)

    await expectRevert(
      _lendingPoolInstance.flashLoan(
        _mockFlasLoanReceiverInstance.address,
        _ethereumAddress,
        new BigNumber(0.8).multipliedBy(oneEther),
      ),
      "The actual balance of the protocol in inconsistent",
    )

    const reserveData: any = await _lendingPoolInstance.getReserveData(_ethereumAddress)
    const userData: any = await _lendingPoolInstance.getUserReserveData(_ethereumAddress, deployer)

    const totalLiquidity = await convertToCurrencyUnits(
      _ethereumAddress,
      reserveData.totalLiquidity,
    )
    const currentLiqudityRate = reserveData.liquidityRate
    const currentLiquidityIndex = reserveData.liquidityIndex
    const currentUserBalance = await convertToCurrencyUnits(
      _ethereumAddress,
      userData.currentUnderlyingBalance,
    )

    expect(totalLiquidity.toString()).to.be.equal("1.008")
    expect(currentLiqudityRate.toString()).to.be.equal("0")
    expect(currentLiquidityIndex.toString()).to.be.equal(
      new BigNumber(1.008).multipliedBy(oneRay).toFixed(),
    )
    expect(currentUserBalance.toString()).to.be.equal("1.008")

    // console.log("Deposit ETH gas cost: ", txResult.receipt.gasUsed)
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
      await convertToCurrencyDecimals(_daiAddress, "1000"),
      "Invalid reserve liquidity",
    )

    expect(reserveDataAfter[1].toString()).to.be.equal(
      // availableLiquidity
      await convertToCurrencyDecimals(_daiAddress, "1000"),
      "Invalid available liquidity",
    )

    expect(actualReserveBalance.toString()).to.be.equal(
      await convertToCurrencyDecimals(_daiAddress, "1000"),
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

  it("FLASH LOAN - Takes out a 500 DAI Loan, returns the funds correctly", async () => {
    const {aDAI: aDaiInstance} = _aTokenInstances

    await _mockFlasLoanReceiverInstance.setFailExecutionTransfer(false)

    const txResult = await _lendingPoolInstance.flashLoan(
      _mockFlasLoanReceiverInstance.address,
      _daiAddress,
      new BigNumber(500).multipliedBy(oneEther),
    )

    const reserveData: any = await _lendingPoolInstance.getReserveData(_daiAddress)
    const userData: any = await _lendingPoolInstance.getUserReserveData(_daiAddress, deployer)

    const totalLiquidity = reserveData.totalLiquidity.toString()
    const currentLiqudityRate = reserveData.liquidityRate.toString()
    const currentLiquidityIndex = reserveData.liquidityIndex.toString()
    const currentUserBalance = userData.currentUnderlyingBalance.toString()

    const expectedLiquidity = new BigNumber("1005").multipliedBy(oneEther).toFixed()

    expect(totalLiquidity).to.be.equal(expectedLiquidity, "Invalid total liquidity")
    expect(currentLiqudityRate).to.be.equal("0", "Invalid liquidity rate")
    expect(currentLiquidityIndex).to.be.equal(
      new BigNumber("1.005").multipliedBy(oneRay).toFixed(),
      "Invalid liquidity index",
    )
    expect(currentUserBalance.toString()).to.be.equal(
      expectedLiquidity,
      "Invalid user underlying balance",
    )
  })

  it("FLASH LOAN - Takes out a 500 DAI Loan, does not return the funds", async () => {
    //move funds to the MockFlashLoanReceiver contract

    await _mockFlasLoanReceiverInstance.setFailExecutionTransfer(true)

    await expectRevert(
      _lendingPoolInstance.flashLoan(
        _mockFlasLoanReceiverInstance.address,
        _daiAddress,
        new BigNumber(500).multipliedBy(oneEther),
      ),
      "The actual balance of the protocol in inconsistent",
    )

    const reserveData: any = await _lendingPoolInstance.getReserveData(_daiAddress)
    const userData: any = await _lendingPoolInstance.getUserReserveData(_daiAddress, deployer)

    const totalLiquidity = reserveData.totalLiquidity.toString()
    const currentLiqudityRate = reserveData.liquidityRate.toString()
    const currentLiquidityIndex = reserveData.liquidityIndex.toString()
    const currentUserBalance = userData.currentUnderlyingBalance.toString()

    const expectedLiquidity = new BigNumber("1005").multipliedBy(oneEther).toFixed()

    expect(totalLiquidity).to.be.equal(expectedLiquidity)
    expect(currentLiqudityRate).to.be.equal("0")
    expect(currentLiquidityIndex).to.be.equal(new BigNumber("1.005").multipliedBy(oneRay).toFixed())
    expect(currentUserBalance.toString()).to.be.equal(expectedLiquidity)

    // console.log("Deposit ETH gas cost: ", txResult.receipt.gasUsed)
  })
})
