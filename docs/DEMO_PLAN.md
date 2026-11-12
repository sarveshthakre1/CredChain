# Five-minute interim recording plan

Project title: **CredChain: A Decentralized Academic Credential Verification System**.

Use this script only after the local integration test and browser rehearsal pass. Change every status claim to match the work your team actually observes. The instructor accepts partial/in-progress work; a clear account of working components is better than overstating completion.

## Before opening Zoom

1. Run the README setup and tests. Keep the blockchain and app terminals running.
2. Rehearse with a new example credential. For the final take, issue another fresh credential so it starts unrevoked.
3. Open the application at a comfortable zoom level and increase code text size for readability.
4. Open the relevant source files in the team's GitHub repository in separate browser tabs. The assignment specifically asks for relevant code from GitHub.
5. Close unrelated tabs and silence notifications. Avoid showing account passwords or unrelated personal information.
6. Decide who speaks for each section. If more than one member speaks, rehearse the transitions within the same total five-minute window.
7. Start a Zoom meeting using ASU access. Share the browser window or desktop and record. Confirm the selected recording option is available to your account; cloud/local availability depends on ASU settings. A local-only recording needs an accessible hosting link before submission.

## Timing and screen actions

| Time | Screen | Action |
| --- | --- | --- |
| 0:00–0:35 | Overview | Project goal, actual completed work, work in progress |
| 0:35–1:20 | University | Issue a new credential; point to transaction receipt |
| 1:20–1:45 | Student wallet | Save/download, then present to employer |
| 1:45–2:15 | Employer verifier | Verify the original; show passing checks |
| 2:15–2:45 | Employer verifier | Edit a copy and show failed verification |
| 2:45–3:20 | University + verifier | Restore original, revoke, then show REVOKED |
| 3:20–4:40 | GitHub code | Explain contract, backend verification, frontend connection |
| 4:40–5:00 | Overview or activity | Remaining milestones and next implementation steps |

The optional unauthorized-call simulation can replace part of the tamper segment if necessary. Do not add it at the cost of exceeding the time window. Aim for **5:00**, and verify the final recording is between **4:30 and 5:30**.

## Speaking script with actions

### 0:00 — Current project status

“Hi everyone. Our project is CredChain: A Decentralized Academic Credential Verification System. It allows a university to issue a signed academic credential, a student to share it, and an employer to verify it against a blockchain record.

For this interim version, we have implemented the Solidity registry, local Ethereum connection, issuance, document sharing, verification, and revocation. Real stakeholder authentication, external wallet integration, and broader deployment remain in progress.”

**Screen action:** Show the chain ID/address banner. Use these completed-work claims only after confirming them on your machine.

### 0:35 — University issuance

“I’m acting as Example University using an approved development account. I enter the student's name, degree, and validity period, then issue the credential.

The backend signs the credential, and the contract records its digest, issuer, student account, expiration, and status. The complete document stays off-chain. Here is the confirmed transaction hash and block number.”

**Screen action:** Issue once; wait for receipt. Do not narrate a confirmation before it appears.

### 1:20 — Student sharing

“The student can save this signed document in the browser wallet and download the JSON to share. For this prototype, this wallet is local document storage. It does not yet authenticate the student or manage a browser wallet's private keys.”

**Screen action:** Add to wallet, download if convenient, and present to employer.

### 1:45 — Successful verification

“The employer checks the signature and approved university, then compares the presented document with the on-chain record. It also checks the student account, validity period, and revocation status. These checks pass for the original credential.”

**Screen action:** Click Verify; point to VERIFIED and two or three relevant checks.

### 2:15 — Edited credential

“Now I’ll change the degree in a copy of the document while leaving the original signature unchanged. Verification fails because the edited content no longer matches the signature or registered digest. This detects modification, but it does not independently prove that a university's original statement was truthful.”

**Screen action:** Prepare edited copy and verify. Show TAMPERED.

### 2:45 — Revocation

“I’ll restore the original from the student wallet. The issuing university can revoke it through the contract. After that transaction is confirmed, the employer checks the original again. Its signature is still valid, but its current status is revoked, so verification fails.”

**Screen action:** Present original, revoke its ID, and verify again.

### 3:20 — GitHub walkthrough

“In CredentialRegistry.sol, setIssuer limits university approval to the administrator. issueCredential requires an approved issuer and a registered student. revokeCredential allows only the issuing university to revoke its credential. verifyCredential checks the stored digest and current status.

In src/credentials.mjs, the issuance function creates and signs the document, submits the transaction, and waits for its receipt. In src/core.mjs, verifyEnvelope checks the off-chain signature and compares the credential with registry data.

In public/app.js, the forms call our backend API and display the results. This connects the stakeholder views with the contract behavior we just demonstrated.”

**Screen action:** Point to the named functions in actual GitHub files. Explain the connection to behavior; do not scroll through every line.

### 4:40 — Remaining milestones

“Next, we plan to improve stakeholder authentication, add external wallet support, and align the credential format with the final project requirements. We will expand testing and measure verification behavior and transaction costs for the final report. Thank you.”

## Map to the rubric

| Criterion | Evidence in this recording |
| --- | --- |
| Project status | Opening completed-work examples plus explicit remaining work |
| Working demonstration | University → student → employer workflow and observed verification results |
| Code walkthrough | Named GitHub files/functions tied directly to issuance, verification, and revocation |
| Clarity/timing | Rehearsed 5:00 plan, readable screens, checked audio/video |

## After recording

Review the entire recording. Check that the actual confirmations/results appear, the GitHub code is readable, and the full duration is within the range. Obtain the shareable Zoom recording link and passcode, verify the intended course audience can access it, replace the placeholders in `Canvas_Submission_TEMPLATE.txt`, and submit that `.txt` on Canvas. A meeting invite link is not a recording link.

Do not submit the placeholder template, source ZIP, or an unhosted local video in place of the required link/passcode text file.
