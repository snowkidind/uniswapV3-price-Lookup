#   Price lookup contract for uniswap v3 pools.

Compatible with solidity ~0.8

Modified from uniswap v3 OracleLibrary.sol 

> Opinion: Uniswap has the propensity to make things pretty complicated and pushes much of that ambiguity off to the end devs, who want simple and quick solutions. When they approach the uniswap codebase, it makes it very difficult to adapt simple tasks into their project. 
>
>For instance, consider looking up the "last traded price" of a pool. It should be a trivial task but not for v3. 


This contract is deployed on mainnet at [0xF3E834BE475Ad2ac1c4C7842073c9b62c9d91358](https://etherscan.io/address/0xf3e834be475ad2ac1c4c7842073c9b62c9d91358#code), and it serves to allow a simple price lookup for this exact use case, nothing more.

To get started: 

- complete .env by changing things in .env.example
- npm install
- review code in scripts/oracle.js
 
NOTE: In the oracle.js file, set deployed variable to true once you deploy the contract on a active network to save time/gas, or just use the contract already deployed on mainnet. (link above)

commands:

`npx hardhat compile`

`npx hardhat run --network mainnet scripts/oracle.js`

`npx hardhat run --network hardhat scripts/oracle.js`

`npx hardhat run --network ropsten scripts/oracle.js`

Remaining issues:

 In other places, the underlying uniswap code identifies pools by using the "pool fee" as an index. In the case of the "OracleLibrary.sol", (this code directly copies) the pool fee isnt used at all to identify the pool. 

 In the enclosed javascript, the first contract call identifies a specific v3 pool by "pool address". In the second contract call, the exact pool is vaguely assumed by only supplying "token symbols".

My intention here was to make an easy method of looking up a price on a v3 pool, but there may be some issues regarding which pool the price is reading from when there are multiple pools of the same currency pair. Comments, critique, observations, bugs, complaints are all welcome.

To contribute something for my efforts, send ERC20's/NFTs/ETH to 0xEBE40BB6FAa9AC01B2eda5c3917Bc3Bb8Bb76437

![Tip QR](https://github.com/snowkidind/uniswapV3priceLookup/tree/master/scripts/lib/tipaddress.png "Tips")
