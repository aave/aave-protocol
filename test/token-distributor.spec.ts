import {
  ITestEnv,
  ContractsInstancesOrigin,
  ITokenInstances,
  iBasicDistributionParams,
  iTokenBalances,
  iDistributionParams,
} from '../utils/types';
import {
  TokenDistributorInstance,
  MintableERC20Instance,
} from '../utils/typechain-types/truffle-contracts';
import {testEnvProvider} from '../utils/truffle/dlp-tests-env';
import {TOKEN_DISTRIBUTOR_PERCENTAGE_BASE, ETHEREUM_ADDRESS} from '../utils/constants';
import BigNumber from 'bignumber.js';

import {expect} from 'chai';

const testAndExecMintAndTransferTokens = async (
  tokenInstance: MintableERC20Instance,
  amount: string,
  minter: string,
  receiver: string
) => {
  const initialMinterBalance = new BigNumber(await tokenInstance.balanceOf(minter));
  const initialReceiverBalance = new BigNumber(await tokenInstance.balanceOf(receiver));
  await tokenInstance.mint(amount, {
    from: minter,
  });

  expect(initialMinterBalance.plus(amount).toFixed()).to.be.equal(
    new BigNumber(await tokenInstance.balanceOf(minter)).toFixed()
  );

  await tokenInstance.transfer(receiver, amount, {from: minter});

  expect(initialReceiverBalance.plus(amount).toFixed()).to.be.equal(
    new BigNumber(await tokenInstance.balanceOf(receiver)).toFixed()
  );
};

const testAndExecEthTransfer = async (
  amount: string,
  sender: string,
  receiver: string,
  web3: Web3
) => {
  const initialReceiverEthBalance = await web3.eth.getBalance(receiver);
  await web3.eth.sendTransaction({
    from: sender,
    to: receiver,
    value: amount,
  });

  expect(new BigNumber(initialReceiverEthBalance).plus(amount).toFixed()).to.be.equal(
    await web3.eth.getBalance(receiver)
  );
};

const testAndExecDistributeToken = async (
  tokenInstance: MintableERC20Instance,
  tokenDistributorInstance: TokenDistributorInstance,
  distributionParams: iBasicDistributionParams
) => {
  const {receivers} = distributionParams;
  const tokenBalancesReceiversBefore = [];
  for (const receiver of receivers) {
    tokenBalancesReceiversBefore.push((await tokenInstance.balanceOf(receiver)).toString());
  }
  const tokenBalancesBefore: iTokenBalances = {
    tokenDistributor: (await tokenInstance.balanceOf(tokenDistributorInstance.address)).toString(),
    receivers: tokenBalancesReceiversBefore,
  };

  const tokenDistribution = await tokenDistributorInstance.getDistribution();

  await tokenDistributorInstance.distribute([tokenInstance.address]);

  const tokenBalanceOfDistributorAfter = (await tokenInstance.balanceOf(
    tokenDistributorInstance.address
  )).toString();

  expect(parseInt(tokenBalanceOfDistributorAfter)).to.be.within(0, receivers.length - 1);

  for (const [index, receiver] of receivers.entries()) {
    const receiverPercentage = new BigNumber(tokenDistribution[1][index]).toFixed();
    const tokenAmountToReceiver = new BigNumber(tokenBalancesBefore.tokenDistributor)
      .multipliedBy(receiverPercentage)
      .dividedBy(TOKEN_DISTRIBUTOR_PERCENTAGE_BASE)
      .toFixed(0, BigNumber.ROUND_DOWN);
    const tokenBalanceOfReceiverAfter = (await tokenInstance.balanceOf(receiver)).toString();
    expect(tokenBalanceOfReceiverAfter).to.be.equal(
      new BigNumber(tokenBalancesBefore.receivers[index]).plus(tokenAmountToReceiver).toFixed()
    );
  }
};

const testAndExecDistributeEth = async (
  tokenDistributorInstance: TokenDistributorInstance,
  distributionParams: iBasicDistributionParams,
  web3: Web3
) => {
  const {receivers} = distributionParams;

  const ethBalancesReceiversBefore = [];
  for (const receiver of receivers) {
    ethBalancesReceiversBefore.push(await web3.eth.getBalance(receiver));
  }
  const ethBalancesBefore: iTokenBalances = {
    tokenDistributor: await web3.eth.getBalance(tokenDistributorInstance.address),
    receivers: ethBalancesReceiversBefore,
  };

  const ethDistribution = await tokenDistributorInstance.getDistribution();

  await tokenDistributorInstance.distribute([ETHEREUM_ADDRESS]);

  const ethBalanceOfDistributorAfter = await web3.eth.getBalance(tokenDistributorInstance.address);

  expect(parseInt(ethBalanceOfDistributorAfter)).to.be.within(0, receivers.length - 1);

  for (const [index, receiver] of receivers.entries()) {
    const receiverPercentage = new BigNumber(ethDistribution[1][index]).toFixed();
    const ethAmountToReceiver = new BigNumber(ethBalancesBefore.tokenDistributor)
      .multipliedBy(receiverPercentage)
      .dividedBy(TOKEN_DISTRIBUTOR_PERCENTAGE_BASE)
      .toFixed(0, BigNumber.ROUND_DOWN);
    const ethBalanceOfReceiverAfter = await web3.eth.getBalance(receiver);
    expect(ethBalanceOfReceiverAfter).to.be.equal(
      new BigNumber(ethBalancesBefore.receivers[index]).plus(ethAmountToReceiver).toFixed()
    );
  }
};

contract('TokenDistributor', async ([deployer, ...users]) => {
  let _testEnvProvider: ITestEnv;
  let _tokenDistributorInstance: TokenDistributorInstance;
  let _tokenInstances: ITokenInstances;
  let _web3: Web3;
  let _depositorAddress: string;
  let _daiDistributionParams: iDistributionParams;
  let _lendDistributionParams: iDistributionParams;
  let _ethDistributionParams: iDistributionParams;

  before('Initializing LendingPoolConfigurator test variables', async () => {
    _testEnvProvider = await testEnvProvider(
      artifacts,
      [deployer, ...users],
      ContractsInstancesOrigin.TruffleArtifacts
    );

    const {
      deployedInstances: {tokenDistributorInstance},
      getAllTokenInstances,
      getWeb3,
      getFirstDepositorAddressOnTests,
      getFeeDistributionParams,
    } = _testEnvProvider;
    _tokenDistributorInstance = tokenDistributorInstance;
    _tokenInstances = await getAllTokenInstances();
    _web3 = await getWeb3();
    _depositorAddress = await getFirstDepositorAddressOnTests();

    const {receivers, percentages} = await getFeeDistributionParams();
    _daiDistributionParams = {
      amountToDistribute: '333',
      receivers,
      percentages,
    };
    _lendDistributionParams = {
      amountToDistribute: '777',
      receivers,
      percentages,
    };
    _ethDistributionParams = {
      amountToDistribute: '2534',
      receivers,
      percentages,
    };
  });

  it('Transfers ETH to the TokenDistributor', async () => {
    await testAndExecEthTransfer(
      _ethDistributionParams.amountToDistribute,
      deployer,
      _tokenDistributorInstance.address,
      _web3
    );
  });

  it('Mints and transfers DAI to the TokenDistributor', async () => {
    await testAndExecMintAndTransferTokens(
      _tokenInstances.DAI,
      _daiDistributionParams.amountToDistribute,
      _depositorAddress,
      _tokenDistributorInstance.address
    );
  });

  it('Mints and transfers LEND to the TokenDistributor', async () => {
    await testAndExecMintAndTransferTokens(
      _tokenInstances.LEND,
      _lendDistributionParams.amountToDistribute,
      _depositorAddress,
      _tokenDistributorInstance.address
    );
  });

  it('Distributes the ETH to the receivers', async () => {
    await testAndExecDistributeEth(_tokenDistributorInstance, _ethDistributionParams, _web3);
  });

  it('Distributes the DAI token to the receivers', async () => {
    await testAndExecDistributeToken(
      _tokenInstances.DAI,
      _tokenDistributorInstance,
      _daiDistributionParams
    );
  });

  it('Distributes the LEND token to the receivers', async () => {
    await testAndExecDistributeToken(
      _tokenInstances.LEND,
      _tokenDistributorInstance,
      _lendDistributionParams
    );
  });
});
