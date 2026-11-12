import { randomUUID } from 'node:crypto';
import { SCHEMA, didFor, canonicalize, digestOf, idOf, verifyEnvelope, validateEnvelope, sameAddress } from './core.mjs';

export function createCredentialService(chain) {
  let writes = Promise.resolve();
  const serial = operation => {
    const next = writes.then(operation); writes = next.catch(() => {}); return next;
  };
  return {
    async issue({ name, degree, validDays }) {
      if ([name, degree].some(v => typeof v !== 'string' || !v.trim() || v.length > 120)) throw new Error('Enter a name and degree of 1–120 characters.');
      const days = Number(validDays);
      if (!Number.isInteger(days) || days < 1 || days > 3650) throw new Error('Validity must be 1–3650 days.');
      return serial(async () => {
        await chain.assertDeployment();
        const block = await chain.provider.getBlock('latest');
        const issuedAt = Math.max(Math.floor(Date.now() / 1000), block.timestamp);
        const issuer = chain.deployment.accounts.issuer, student = chain.deployment.accounts.student, chainId = chain.deployment.chainId;
        const institution = (await chain.registry.getIssuer(issuer)).name;
        const credential = {
          schema: SCHEMA, id: randomUUID(), chainId, issuer, issuerDid: didFor(chainId, issuer), institution,
          student: { account: student, did: didFor(chainId, student), name: name.trim() },
          degree: degree.trim(), issuedAt, expiresAt: issuedAt + days * 86400
        };
        const signature = await chain.signers.issuer.signMessage(canonicalize(credential));
        const transaction = await chain.contract.connect(chain.signers.issuer).issueCredential(idOf(credential.id), digestOf(credential), student, credential.expiresAt);
        const receipt = await transaction.wait();
        return { envelope: { credential, signature }, transactionHash: receipt.hash, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed.toString() };
      });
    },
    async verify(envelope) {
      await chain.assertDeployment();
      const block = await chain.provider.getBlock('latest');
      return verifyEnvelope(envelope, { registry: chain.registry, recoverSigner: chain.recoverSigner, chainId: chain.deployment.chainId, now: () => Math.max(Math.floor(Date.now() / 1000), block.timestamp) });
    },
    async revoke(id) {
      if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Enter a valid credential ID.');
      return serial(async () => {
        await chain.assertDeployment();
        const record = await chain.registry.getCredential(idOf(id));
        if (!record.exists || !sameAddress(record.issuer, chain.deployment.accounts.issuer)) throw new Error('Credential not found for this university.');
        if (record.revoked) throw new Error('This credential is already revoked.');
        const receipt = await (await chain.contract.connect(chain.signers.issuer).revokeCredential(idOf(id))).wait();
        return { revoked: true, transactionHash: receipt.hash, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed.toString() };
      });
    },
    async unauthorizedAttempt(envelope) {
      validateEnvelope(envelope);
      await chain.assertDeployment();
      try {
        await chain.contract.connect(chain.signers.outsider).issueCredential.staticCall(idOf(randomUUID()), digestOf(envelope.credential), chain.deployment.accounts.student, envelope.credential.expiresAt);
        return { rejected: false, message: 'Unexpectedly accepted; inspect the access-control rule.' };
      } catch (error) {
        const message = error.reason || error.revert?.args?.[0] || '';
        if (message !== 'Approved issuer only') throw error;
        return { rejected: true, message: 'Approved issuer only', account: chain.deployment.accounts.outsider, simulation: true };
      }
    }
  };
}
