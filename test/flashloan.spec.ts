import {
  LendingPoolInstance,
  LendingPoolCoreInstance,
  IPriceOracleInstance,
  MockFlashLoanReceiverInstance,
  TokenDistributorInstance,
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
  RATEMODE_STABLE,
  APPROVAL_AMOUNT_LENDING_POOL_CORE,
  oneEther,
  oneRay,
  ETHEREUM_ADDRESS,
} from "../utils/constants"
import {testEnvProvider} from "../utils/truffle/dlp-tests-env"
import {convertToCurrencyDecimals, convertToCurrencyUnits} from "../utils/misc-utils"

const truffleAssert = require("truffle-assertions")
const expectRevert = require("@openzeppelin/test-helpers").expectRevert

const {expect} = require("chai")

contract("LendingPool FlashLoan function", async ([deployer, ...users]) => {
  let _testEnvProvider: ITestEnv
  let _lendingPoolInstance: LendingPoolInstance
  let _lendingPoolCoreInstance: LendingPoolCoreInstance
  let _mockFlasLoanReceiverInstance: MockFlashLoanReceiverInstance
  let _priceOracleInstance: IPriceOracleInstance
  let _aTokenInstances: IATokenInstances
  let _tokenInstances: ITokenInstances
  let _tokenDistributor: TokenDistributorInstance

  let _daiAddress: string

  let _depositorAddress: string

  let _web3: Web3

  let _initialDepositorETHBalance: string

  const halfEther = (0.5 * Math.pow(10, 18)).toString()

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
        priceOracleInstance,
        mockFlashLoanReceiverInstance,
        tokenDistributorInstance,
      },
      getTokenAddresses,
      getWeb3,
      getAllTokenInstances,
      getFirstDepositorAddressOnTests
    } = _testEnvProvider

    _lendingPoolInstance = lendingPoolInstance
    _lendingPoolCoreInstance = lendingPoolCoreInstance
    _priceOracleInstance = priceOracleInstance
    _aTokenInstances = aTokenInstances
    _mockFlasLoanReceiverInstance = mockFlashLoanReceiverInstance as MockFlashLoanReceiverInstance
    _tokenInstances = await getAllTokenInstances()
    _daiAddress = (await getTokenAddresses()).DAI
    _depositorAddress = await getFirstDepositorAddressOnTests()
    _tokenDistributor = tokenDistributorInstance

    _web3 = await getWeb3()
    _initialDepositorETHBalance = await _web3.eth.getBalance(_depositorAddress)
  })

  it("Deposits ETH into the reserve", async () => {
    const amountToDeposit = await convertToCurrencyDecimals(ETHEREUM_ADDRESS, "1")

    await _lendingPoolInstance.deposit(ETHEREUM_ADDRESS, amountToDeposit, "0", {
      from: _depositorAddress,
      value: amountToDeposit,
    })

  })

  it("Takes ETH flashloan, returns the funds correctly", async () => {
    //move funds to the MockFlashLoanReceiver contract

    let send = web3.eth.sendTransaction({
      from: deployer,
      to: _mockFlasLoanReceiverInstance.address,
      value: web3.utils.toWei("0.5", "ether"),
    })

    const txResult = await _lendingPoolInstance.flashLoan(
      _mockFlasLoanReceiverInstance.address,
      ETHEREUM_ADDRESS,
      new BigNumber(0.8).multipliedBy(oneEther),
      "0x10"
    )

    const reserveData: any = await _lendingPoolInstance.getReserveData(ETHEREUM_ADDRESS)
    const tokenDistributorBalance = await _web3.eth.getBalance(_tokenDistributor.address)

    const currentLiqudityRate = reserveData.liquidityRate
    const currentLiquidityIndex = reserveData.liquidityIndex

    expect(reserveData.totalLiquidity.toString()).to.be.equal("1001960000000000000")
    expect(currentLiqudityRate.toString()).to.be.equal("0")
    expect(currentLiquidityIndex.toString()).to.be.equal("1001960000000000000000000000")
    expect(tokenDistributorBalance.toString()).to.be.equal("840000000000000")
  })

  it("Takes an ETH flashloan as big as the available liquidity", async () => {
    //move funds to the MockFlashLoanReceiver contract

    let send = web3.eth.sendTransaction({
      from: deployer,
      to: _mockFlasLoanReceiverInstance.address,
      value: web3.utils.toWei("0.5", "ether"),
    })

    const txResult = await _lendingPoolInstance.flashLoan(
      _mockFlasLoanReceiverInstance.address,
      ETHEREUM_ADDRESS,
      "1001960000000000000",
      "0x10"
    )

    const reserveData: any = await _lendingPoolInstance.getReserveData(ETHEREUM_ADDRESS)
    const tokenDistributorBalance = await _web3.eth.getBalance(_tokenDistributor.address)

    const currentLiqudityRate = reserveData.liquidityRate
    const currentLiquidityIndex = reserveData.liquidityIndex

    expect(reserveData.totalLiquidity.toString()).to.be.equal("1004414802000000000")
    expect(currentLiqudityRate.toString()).to.be.equal("0")
    expect(currentLiquidityIndex.toString()).to.be.equal("1004414802000000000000000000")
    expect(tokenDistributorBalance.toString()).to.be.equal("1892058000000000")
  })

  it("Takes ETH flashloan, does not return the funds (revert expected)", async () => {
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
        ETHEREUM_ADDRESS,
        new BigNumber(0.8).multipliedBy(oneEther),
        "0x10"
        ),
      "The actual balance of the protocol is inconsistent",
    )
  })

  it("tries to take a very small flashloan, which would result in 0 fees (revert expected)", async () => {
    //move funds to the MockFlashLoanReceiver contract

    await expectRevert(
      _lendingPoolInstance.flashLoan(
        _mockFlasLoanReceiverInstance.address,
        ETHEREUM_ADDRESS,
        "1", //1 wei loan
        "0x10"
        ),
      "The requested amount is too small for a flashLoan.",
    )
  })


  it("tries to take a flashloan that is bigger than the available liquidity (revert expected)", async () => {
    //move funds to the MockFlashLoanReceiver contract

    await expectRevert(
      _lendingPoolInstance.flashLoan(
        _mockFlasLoanReceiverInstance.address,
        ETHEREUM_ADDRESS,
        "1004415000000000000", //slightly higher than the available liquidity
        "0x10"
        ),
      "There is not enough liquidity available to borrow",
    )
  })


  it("tries to take a flashloan using a non contract address as receiver (revert expected)", async () => {
    //move funds to the MockFlashLoanReceiver contract

    await expectRevert(
      _lendingPoolInstance.flashLoan(
        deployer,
        ETHEREUM_ADDRESS,
        "1000000000000000000", 
        "0x10"
        ),
      "revert",
    )
  })



  it("Deposits DAI into the reserve", async () => {
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

    await _lendingPoolInstance.deposit(daiInstance.address, amountToDeposit, "0", {
      from: _depositorAddress,
    })

  })

  it("Takes out a 500 DAI flashloan, returns the funds correctly", async () => {
    const {DAI: daiInstance} = _tokenInstances

    await _mockFlasLoanReceiverInstance.setFailExecutionTransfer(false)

    await _lendingPoolInstance.flashLoan(
      _mockFlasLoanReceiverInstance.address,
      _daiAddress,
      new BigNumber(500).multipliedBy(oneEther),
      "0x10"
      )

    const reserveData: any = await _lendingPoolInstance.getReserveData(_daiAddress)
    const userData: any = await _lendingPoolInstance.getUserReserveData(_daiAddress, deployer)

    const totalLiquidity = reserveData.totalLiquidity.toString()
    const currentLiqudityRate = reserveData.liquidityRate.toString()
    const currentLiquidityIndex = reserveData.liquidityIndex.toString()
    const currentUserBalance = userData.currentATokenBalance.toString()

    const expectedLiquidity = new BigNumber("1001.225").multipliedBy(oneEther).toFixed()

    const tokenDistributorBalance = await daiInstance.balanceOf(_tokenDistributor.address)

    expect(totalLiquidity).to.be.equal(expectedLiquidity, "Invalid total liquidity")
    expect(currentLiqudityRate).to.be.equal("0", "Invalid liquidity rate")
    expect(currentLiquidityIndex).to.be.equal(
      new BigNumber("1.001225").multipliedBy(oneRay).toFixed(),
      "Invalid liquidity index",
    )
    expect(currentUserBalance.toString()).to.be.equal(
      expectedLiquidity,
      "Invalid user balance",
    )

    expect(tokenDistributorBalance.toString()).to.be.equal(
      new BigNumber("0.525").multipliedBy(oneEther).toFixed(),
      "Invalid token distributor balance",
    )
  })

  it("Takes out a 500 DAI flashloan, does not return the funds (revert expected)", async () => {
    //move funds to the MockFlashLoanReceiver contract

    await _mockFlasLoanReceiverInstance.setFailExecutionTransfer(true)

    await expectRevert(
      _lendingPoolInstance.flashLoan(
        _mockFlasLoanReceiverInstance.address,
        _daiAddress,
        new BigNumber(500).multipliedBy(oneEther),
        "0x10"
      ),
      "The actual balance of the protocol is inconsistent",
    )
  })
})
