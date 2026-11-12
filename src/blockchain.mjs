import { JsonRpcProvider, Contract, verifyMessage } from 'ethers';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { sameAddress } from './core.mjs';

export async function connectBlockchain() {
  let deployment, artifact;
  try {
    deployment = JSON.parse(await readFile(new URL('../.data/deployment.json', import.meta.url), 'utf8'));
    artifact = JSON.parse(await readFile(new URL('../artifacts/CredentialRegistry.json', import.meta.url), 'utf8'));
  } catch { throw new Error('Deployment missing. Start npm run chain in terminal 1, then run npm run deploy in terminal 2.'); }
  const rpc = process.env.RPC_URL || deployment.rpc;
  if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(rpc).hostname)) throw new Error('Demo accounts require a local RPC endpoint.');
  const provider = new JsonRpcProvider(rpc, undefined, { cacheTimeout: -1 });
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== deployment.chainId) { provider.destroy(); throw new Error('Wrong chain. Redeploy on the current local node.'); }
  const contract = new Contract(deployment.address, artifact.abi, provider);
  const signers = { admin: await provider.getSigner(0), issuer: await provider.getSigner(1), student: await provider.getSigner(2), outsider: await provider.getSigner(3) };
  async function assertDeployment() {
    const code = await provider.getCode(deployment.address);
    if (code === '0x' || createHash('sha256').update(code).digest('hex') !== deployment.runtimeCodeHash) throw new Error('The local chain was reset or the contract changed. Run npm run deploy and restart npm start.');
    const controller = await contract.administrator();
    if (!sameAddress(controller, deployment.accounts.admin)) throw new Error('Unexpected registry administrator.');
  }
  await assertDeployment();
  const registry = {
    async getCredential(id) {
      const r = await contract.credentials(id);
      return { digest: r.digest, issuer: r.issuer, student: r.student, expiresAt: Number(r.expiresAt), revoked: r.revoked, exists: r.exists };
    },
    async getIssuer(address) { const r = await contract.issuers(address); return { name: r.name, approved: r.approved }; }
  };
  return { deployment, provider, contract, signers, registry, recoverSigner: verifyMessage, assertDeployment };
}
