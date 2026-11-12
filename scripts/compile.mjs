import solc from 'solc';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export async function compile() {
  const source = await readFile(new URL('../contracts/CredentialRegistry.sol', import.meta.url), 'utf8');
  const input = { language: 'Solidity', sources: { 'CredentialRegistry.sol': { content: source } }, settings: {
    evmVersion: 'paris', optimizer: { enabled: true, runs: 200 }, outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } }
  } };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  for (const error of output.errors || []) console.error(error.formattedMessage);
  if (output.errors?.some(error => error.severity === 'error')) throw new Error('Solidity compilation failed');
  const c = output.contracts['CredentialRegistry.sol'].CredentialRegistry;
  const artifact = { abi: c.abi, bytecode: '0x' + c.evm.bytecode.object, compiler: solc.version() };
  await mkdir(new URL('../artifacts/', import.meta.url), { recursive: true });
  await writeFile(new URL('../artifacts/CredentialRegistry.json', import.meta.url), JSON.stringify(artifact, null, 2));
  console.log('Compiled CredentialRegistry using', solc.version()); return artifact;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await compile();
