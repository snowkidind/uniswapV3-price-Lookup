#   Price lookup contract for uniswap v3 pools.

Modified from uniswap v3 OracleLibrary.sol 

Uniswap has the propensity to make things extremely complicated and pushes much of that off to the end devs, who want simple and quick solutions. When they hit the uniswap wall of code, which, in my opinion reflects a giant plate of spaghetti with every seasoning imaginable, it tends to be entirely too much to chew and makes their project much less adaptable to a normal person. 

Not to mention the SDK examples on their documentation are written in TypeScript, which adds unnecessary layers of complexity for new learners, putting off even more developers and use cases.

For instance, take looking up the simple last traded price of a pool. It should be a trivial task but not for v3. This contract, deployed on mainnet at 0xF3E834BE475Ad2ac1c4C7842073c9b62c9d91358, (verified on etherscan) serves to allow a simple price lookup. Modify the included javascript code to do it and you are done.

To contribute something for your efforts, send ERC20's/NFTs/ETH to 0xEBE40BB6FAa9AC01B2eda5c3917Bc3Bb8Bb76437
