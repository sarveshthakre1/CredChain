// Requires npm install and npm run chain. This suite uses real EVM transactions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JsonRpcProvider, ContractFactory } from 'ethers';
import { compile } from '../scripts/compile.mjs';
import { createCredentialService } from '../src/credentials.mjs';
import { idOf } from '../src/core.mjs';
import { createApplication } from '../src/server.mjs';
import { randomUUID } from 'node:crypto';

test('real local EVM: contract permissions, signatures, tampering, revocation, expiry and HTTP workflow', async t => {
  const { verifyMessage } = await import('ethers');
  const rpc = process.env.RPC_URL || 'http://127.0.0.1:8545';
  if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(rpc).hostname)) throw new Error('Use a local test chain');
  const provider = new JsonRpcProvider(rpc, undefined, { cacheTimeout: -1 }); t.after(() => provider.destroy());
  const admin = await provider.getSigner(0), issuer = await provider.getSigner(1), student = await provider.getSigner(2), outsider = await provider.getSigner(3);
  const artifact = await compile();
  const contract = await new ContractFactory(artifact.abi, artifact.bytecode, admin).deploy(); await contract.waitForDeployment();
  await (await contract.connect(issuer).registerDID()).wait(); await (await contract.connect(student).registerDID()).wait();
  await (await contract.connect(outsider).registerDID()).wait();
  const issuerAddress = await issuer.getAddress(), studentAddress = await student.getAddress();
  await assert.rejects(contract.connect(outsider).setIssuer(issuerAddress, 'Fake University', true));
  await (await contract.setIssuer(issuerAddress, 'Example University', true)).wait();
  const network = await provider.getNetwork();
  const chain = { provider, contract, signers: { admin, issuer, student, outsider }, recoverSigner: verifyMessage,
    deployment: { address: await contract.getAddress(), chainId: Number(network.chainId), accounts: { admin: await admin.getAddress(), issuer: issuerAddress, student: studentAddress, outsider: await outsider.getAddress() } },
    assertDeployment: async () => {},
    registry: {
      async getCredential(id) { const r = await contract.credentials(id); return { exists: r.exists, digest: r.digest, issuer: r.issuer, student: r.student, expiresAt: Number(r.expiresAt), revoked: r.revoked }; },
      async getIssuer(address) { const r = await contract.issuers(address); return { name: r.name, approved: r.approved }; }
    }
  };
  const service = createCredentialService(chain);
  const issued = await service.issue({ name: 'Alex Student', degree: 'MS CS', validDays: 365 });
  assert.equal((await service.verify(issued.envelope)).valid, true);
  assert.equal(await contract.verifyCredential(idOf(issued.envelope.credential.id), (await import('../src/core.mjs')).digestOf(issued.envelope.credential)), true);
  const altered = structuredClone(issued.envelope); altered.credential.degree = 'Forged PhD';
  assert.equal((await service.verify(altered)).status, 'TAMPERED');
  assert.equal((await service.unauthorizedAttempt(issued.envelope)).rejected, true);
  await assert.rejects(contract.connect(outsider).revokeCredential(idOf(issued.envelope.credential.id)));
  const other = await service.issue({ name: 'Another Student', degree: 'Certificate', validDays: 1 });
  await (await contract.setIssuer(issuerAddress, 'Example University', false)).wait();
  assert.equal((await service.verify(other.envelope)).status, 'UNTRUSTED_ISSUER');
  await (await contract.setIssuer(issuerAddress, 'Example University', true)).wait();
  await service.revoke(issued.envelope.credential.id);
  assert.equal((await service.verify(issued.envelope)).status, 'REVOKED');
  const snapshot = await provider.send('evm_snapshot', []);
  try {
    await provider.send('evm_increaseTime', [86401]); await provider.send('evm_mine', []);
    assert.equal((await service.verify(other.envelope)).status, 'EXPIRED_OR_NOT_YET_VALID');
  } finally { await provider.send('evm_revert', [snapshot]); }
  const expiredId = idOf(randomUUID()), digest = '0x' + '44'.repeat(32);
  await assert.rejects(contract.connect(issuer).issueCredential(expiredId, digest, studentAddress, 1));
  const { server } = createApplication(chain);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port;
  const post = (route, body) => fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await fetch(base)).status, 200);
  assert.equal((await fetch(base + '/api/config')).status, 200);
  const httpIssued = await post('/api/issue', { name: 'HTTP Student', degree: 'MS CS', validDays: 365 });
  assert.equal(httpIssued.status, 201); const httpCredential = await httpIssued.json();
  assert.equal((await (await post('/api/verify', httpCredential.envelope)).json()).valid, true);
  assert.equal((await post('/api/revoke', { id: httpCredential.envelope.credential.id })).status, 200);
  assert.equal((await (await post('/api/verify', httpCredential.envelope)).json()).status, 'REVOKED');
  assert.equal((await fetch(base + '/api/activity')).status, 200);
  assert.equal((await fetch(base + '/src/server.mjs')).status, 404);
  assert.equal((await fetch(base + '/api/issue', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://attacker.example' }, body: '{}' })).status, 403);
});
