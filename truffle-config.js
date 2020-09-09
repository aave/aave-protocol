/**
 * Audius Smart Contracts truffle configuration
 * @authors Hareesh Nagaraj, Sid Sethi, Roneil Rumburg
 * @version 0.0.1
 */

const { NearProvider, nearlib, utils } = require('near-web3-provider');
// Because we're using a function-call access key, this is the same as the NEAR_LOCAL_EVM
const NEAR_LOCAL_ACCOUNT_ID = 'audius.demo.testnet';
const NEAR_LOCAL_NETWORK_ID = 'default';
const NEAR_LOCAL_URL = 'https://rpc.testnet.near.org';
const NEAR_EXPLORER_URL = 'https://explorer.testnet.near.org';
const NEAR_LOCAL_EVM = 'evm.demo.testnet';

function NearLocalProvider() {
  return new NearProvider({
    nodeUrl: 'http://127.0.0.1:3030',
    networkId: 'local',
    masterAccountId: 'test.near',
    evmAccountId: 'evm',
  });
}

function NearTestNetProvider() {
  return new NearProvider({
    nodeUrl: 'https://rpc.testnet.near.org',
    networkId: 'default',
    masterAccountId: 'illia',
    evmAccountId: 'evm.illia',
  });
}

// TODO: do this only when in development.
{
  const provider = NearLocalProvider();
  utils.createTestAccounts(provider, 5);
}

// Import babel for ES6 support
require('babel-register')({
  presets: [
    ['env', {
      'targets': {
        'node': '8.0'
      }
    }]
  ]
})

require('babel-polyfill')

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  networks: {
    near: {
      network_id: "*",
      skipDryRun: true,
      provider: () => NearTestNetProvider(),
    },
    development: {
      network_id: "*",
      skipDryRun: true,
      provider: () => NearLocalProvider(),
    },
  },
  mocha: {
    enableTimeouts: false
  }
}
