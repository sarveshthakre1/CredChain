# Validation and presentation claims

## Verified in the authoring workspace

- Node.js 24.22.1.
- `npm test`: 14 isolated logic tests pass.
- `npm run check`: JavaScript syntax, duplicate-ID, and HTML/JavaScript-reference checks pass.

The isolated tests use doubles for registry responses and signer recovery. They exercise application decisions; they do not establish that ECDSA signatures, Solidity bytecode, or the EVM integration work.

## Must be run on your machine

Package downloads returned HTTP 403 in the authoring workspace. Therefore the supplied Solidity compiler, Ethers dependency, and Hardhat node could not be installed there. `npm run test:chain` is supplied but was not run there. It exercises a genuine deployed contract and real issuer signatures and must pass on your machine.

Browser rendering and the full UI workflow have also not been verified in a real browser in the authoring workspace. The README provides a manual walkthrough for that check.

Do not report the number of isolated logic tests as the number of smart-contract tests. Do not claim public-testnet deployment, real university integration, standard VC conformance, multi-user authentication, or a security audit.

## Recording gate

Record only after:

1. `npm test`, `npm run check`, and `npm run test:chain` pass locally.
2. The app's banner identifies the live local Ethereum registry.
3. A new credential passes verification.
4. An edited degree fails verification.
5. The original fails after revocation.
6. The contract rejects the unauthorized issuance simulation.
7. The GitHub files can be opened and explained.

If only part of the workflow works, the interim assignment permits in-progress work. Record the working part, explicitly identify the rest, and adjust the presentation script to match what was actually observed.
