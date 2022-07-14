require("@nomiclabs/hardhat-ethers");
// require("@nomicfoundation/hardhat-toolbox");

const env = require('node-env-file');
env(__dirname + '/.env');

const lastBlock = 15139242

module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.0"
      },
      {
        version: "0.8.1"
      }
    ]
  },

  networks: {
    hardhat: {
      accounts: { mnemonic: process.env.MNEMONIC },
      forking: {
        url: process.env.RPC_NODE,
        blockNumber: lastBlock
      }
    },
    mainnet: {
      url: process.env.RPC_NODE,
      accounts: {mnemonic: process.env.MNEMONIC},
      gas: 1229968,
      gasPrice: 99000000000
    },
    ropsten: {
      url: process.env.ROPSTEN_NODE,
      accounts: { mnemonic: process.env.MNEMONIC },
      gas: 7770000,
      gasPrice: 99000000000
    },
  }
};
