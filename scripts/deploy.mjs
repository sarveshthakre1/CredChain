import { JsonRpcProvider, ContractFactory } from 'ethers';
import { writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { compile } from './compile.mjs';

const rpc = process.env.RPC_URL || 'http://127.0.0.1:8545';

const allowedHosts = ['localhost', '127.0.0.1', '[::1]'];

if (!allowedHosts.includes(new URL(rpc).hostname)) {
  throw new Error(
    'This script uses local development accounts. Use a localhost RPC.'
  );
}

const provider = new JsonRpcProvider(
  rpc,
  undefined,
  { cacheTimeout: -1 }
);

try {
  // Compile the Solidity contract.
  const artifact = await compile();

  // Assign local Ethereum accounts to project roles.
  const admin = await provider.getSigner(0);
  const issuer = await provider.getSigner(1);
  const student = await provider.getSigner(2);
  const outsider = await provider.getSigner(3);

  // Deploy the registry using the administrator account.
  const factory = new ContractFactory(
    artifact.abi,
    artifact.bytecode,
    admin
  );

  const contract = await factory.deploy();
  await contract.waitForDeployment();

  // Register the stakeholder accounts.
  await (
    await contract.connect(issuer).registerDID()
  ).wait();

  await (
    await contract.connect(student).registerDID()
  ).wait();

  await (
    await contract.connect(outsider).registerDID()
  ).wait();

  // Approve the university's issuer account.
  await (
    await contract.setIssuer(
      await issuer.getAddress(),
      'Arizona State University',
      true
    )
  ).wait();

  // Collect the deployment configuration.
  const address = await contract.getAddress();
  const network = await provider.getNetwork();
  const code = await provider.getCode(address);

  const deployment = {
    address,
    chainId: Number(network.chainId),
    rpc,

    runtimeCodeHash: createHash('sha256')
      .update(code)
      .digest('hex'),

    accounts: {
      admin: await admin.getAddress(),
      issuer: await issuer.getAddress(),
      student: await student.getAddress(),
      outsider: await outsider.getAddress()
    },

    deployedAt: new Date().toISOString()
  };

  // Save the configuration used by the backend.
  await mkdir(
    new URL('../.data/', import.meta.url),
    { recursive: true }
  );

  await writeFile(
    new URL('../.data/deployment.json', import.meta.url),
    JSON.stringify(deployment, null, 2)
  );

  console.log('CredChain registry deployed:', address);
  console.log(
    'Arizona State University approved and student account registered.'
  );
  console.log('Next: npm start');
  console.log('Website: http://localhost:3000');
} finally {
  provider.destroy();
}