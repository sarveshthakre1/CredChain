# CredChain

CredChain is a decentralized academic credential verification system built using Ethereum and Solidity. The system is designed to allow universities to issue academic credentials, students to control and present their credentials, and employers or other verifiers to check credential integrity and status without relying on a single centralized verification database.

The complete academic credential remains off-chain. CredChain stores only the information needed for verification on-chain, including the credential hash, issuer, holder, storage reference, and revocation status. This approach reduces the amount of sensitive academic information stored directly on the blockchain.

## Current Project Status

This repository currently contains the initial smart contract design for CredChain. The draft establishes the main contract structure, credential lifecycle, access control, function interfaces, and event logging required for the system.

The smart contract currently compiles successfully using Hardhat. Testing, deployment, off-chain storage integration, and the user interface will be developed during later project milestones.

## Technology Stack

- Solidity
- Ethereum
- Hardhat
- Ethers.js
- TypeScript
- Node.js
- npm
- IPFS or encrypted off-chain storage (planned)

## Smart Contract Design

The current `CredChain.sol` draft supports the following components:

- Decentralized identifier (DID) registration
- University issuer authorization
- Academic credential issuance
- On-chain credential hash and status records
- References to off-chain credential storage
- Credential verification through hash comparison
- Credential revocation
- Administrative and issuer access control
- Event logging for major credential lifecycle operations

### Main Contract Functions

`registerDID()`
Registers or updates the caller's decentralized identity and stores a reference to the corresponding off-chain DID document.

`setIssuerAuthorization()`
Allows the contract administrator to approve or remove a university's permission to issue credentials.

`issueCredential()`
Allows an authorized university to issue a credential by recording its identifier, hash, holder, issuer, and off-chain storage reference.

`verifyCredential()`
Checks whether a credential exists, whether the supplied hash matches the on-chain hash, and whether the credential has been revoked.

`revokeCredential()`
Allows the university that originally issued a credential to revoke it.

## Credential Workflow

1. A user or university registers a decentralized identity.
2. The contract administrator authorizes a university as a credential issuer.
3. The authorized university issues an academic credential to a student.
4. The complete credential remains in off-chain storage.
5. CredChain records the credential hash, storage reference, issuer, holder, and status on-chain.
6. The student presents the credential to an employer or another verifier.
7. The verifier recomputes the credential hash and compares it with the on-chain record.
8. CredChain also checks whether the credential has been revoked.
9. The original university issuer can revoke the credential when necessary.

## Repository Structure

```text
CredChain/
├── contracts/
│   └── CredChain.sol
├── hardhat.config.ts
├── package.json
├── package-lock.json
├── tsconfig.json
├── .gitignore
└── README.md
```

The `contracts` directory contains the current Solidity smart contract draft. Additional test, deployment, and application files will be added as development continues.

## Prerequisites

The following software is required to work with the current project:

- Git
- Node.js
- npm

The current development environment uses Hardhat with Solidity and Ethers.js.

## Setup Instructions

Clone the public repository:

```bash
git clone https://github.com/sarveshthakre1/CredChain.git
```

Move into the project directory:

```bash
cd CredChain
```

Install the project dependencies:

```bash
npm install
```

## Compile the Smart Contract

Compile the Solidity contract using Hardhat:

```bash
npx hardhat compile
```

A successful compilation confirms that the current Solidity smart contract draft is syntactically valid.

## Basic Usage

At the current draft stage, CredChain defines the primary smart contract interactions required for the academic credential lifecycle.

A typical interaction will follow this sequence:

1. Call `registerDID()` to register a DID reference.
2. The administrator calls `setIssuerAuthorization()` to authorize a university.
3. The university calls `issueCredential()` to create the on-chain credential record.
4. A verifier calls `verifyCredential()` using the credential identifier and a hash computed from the presented credential.
5. When necessary, the original issuer calls `revokeCredential()` to change the credential's status.

The complete credential itself is not stored in the smart contract.

## Deployment

The current milestone focuses on the smart contract structure and interfaces rather than a complete deployed application.

The contract can currently be compiled locally using Hardhat. Deployment scripts and Ethereum-compatible test network configuration will be added during later project milestones. Ethers.js will be used to connect the CredChain application to the deployed smart contract.

## Off-Chain Storage

CredChain is designed to keep complete academic credentials outside the blockchain. IPFS or an encrypted off-chain database will be used for credential storage in a later implementation stage.

The blockchain will retain the credential hash and storage reference so that a verifier can compare a presented credential with the corresponding on-chain commitment without storing the complete academic record on-chain.

## Event Logging

The smart contract defines events for major system operations, including:

- DID registration
- Issuer authorization changes
- Credential issuance
- Credential verification
- Credential revocation

These events provide an auditable record of important system activity without placing the complete academic credential on-chain.

## Team

**Group 23**

- Sarvesh Thakre
- Vardhan Patil
- Nishant Hire
- Rohan Vayase
- Abishek Nagaram

## Course

**CSE 540: Engineering Blockchain Applications**
Arizona State University
Fall B 2026