# CredChain: A Decentralized Academic Credential Verification System

CredChain helps universities issue digital academic credentials. Students can save and share them, and employers can check whether they are valid, changed, expired, or revoked.

## Tech Stack

- HTML, CSS, and JavaScript for the website
- Node.js for the backend
- Solidity for the smart contract
- Hardhat for the local Ethereum blockchain
- Ethers.js to connect the backend to the blockchain

## Setup

Install Node.js 24 and open the project folder in VS Code.

Open a terminal inside the project folder and install the dependencies:

```bash
npm install
```

## Run the Project

In the first terminal, start the blockchain:

```bash
npm run chain
```

Leave this terminal running.

Open a second terminal in the same project folder. Deploy the contract, then start the website:

```bash
npm run deploy
npm start
```

Open http://localhost:3000 in your browser. Keep both terminals running while using the website.

## Use the Website

1. Open **University**, enter the student's name, degree, and validity period, and click **Sign & issue credential**.
2. Click **Add to student wallet** to save it in the browser. Use **Download JSON** to save a copy.
3. Click **Present to employer**, then **Verify credential**. A valid credential shows **VERIFIED**.
4. To check an edited document, click **Prepare edited copy** and verify again. It should show **TAMPERED**.
5. Restore the original using **Student wallet → Present to employer**. Revoke its credential ID from the University page, then verify again. It should show **REVOKED**.
6. Open **Blockchain activity** to see issuance and revocation records.

## Run the Tests

Keep the blockchain running and use another terminal:

```bash
npm test
npm run check
npm run test:chain
```

## Current Version

The system runs locally with one configured university and one student account. Separate stakeholder login, wallet authentication, and support for more universities and students are planned.

If you restart the blockchain, deploy the contract again, restart the website, and issue a fresh credential.