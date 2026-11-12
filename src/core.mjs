import { createHash } from 'node:crypto';

export const TITLE = 'CredChain: A Decentralized Academic Credential Verification System';
export const SCHEMA = 'credchain.academic.v1';
export const isAddress = value => typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value);
export const sameAddress = (a, b) => isAddress(a) && isAddress(b) && a.toLowerCase() === b.toLowerCase();
export const didFor = (chainId, address) => {
  if (!Number.isSafeInteger(chainId) || chainId < 1 || !isAddress(address)) throw new Error('Invalid DID components');
  return `did:pkh:eip155:${chainId}:${address.toLowerCase()}`;
};

// Educational JSON canonicalization. This is not claimed to implement RFC 8785.
// Signing and verification use the same explicitly versioned credential schema.
export function canonicalize(value, depth = 0) {
  if (depth > 10) throw new Error('Document nesting exceeds limit');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isSafeInteger(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(v => canonicalize(v, depth + 1)).join(',') + ']';
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalize(value[key], depth + 1)).join(',') + '}';
  }
  throw new Error('Unsupported document value');
}
export const digestOf = value => '0x' + createHash('sha256').update(canonicalize(value)).digest('hex');
export const idOf = id => '0x' + createHash('sha256').update(id).digest('hex');

export function validateEnvelope(envelope) {
  const c = envelope?.credential;
  if (!c || c.schema !== SCHEMA) throw new Error('Unsupported credential format');
  if (typeof c.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(c.id)) throw new Error('Invalid credential identifier');
  if (!isAddress(c.issuer) || !isAddress(c.student?.account)) throw new Error('Invalid issuer or student account');
  if (!Number.isSafeInteger(c.chainId) || c.chainId <= 0) throw new Error('Invalid chain identifier');
  if (c.issuerDid !== didFor(c.chainId, c.issuer) || c.student.did !== didFor(c.chainId, c.student.account)) throw new Error('DID does not match account');
  for (const field of [c.institution, c.degree, c.student.name]) {
    if (typeof field !== 'string' || !field.trim() || field.length > 120) throw new Error('Invalid credential text');
  }
  if (!Number.isSafeInteger(c.issuedAt) || !Number.isSafeInteger(c.expiresAt) || c.issuedAt < 0 || c.expiresAt <= c.issuedAt) throw new Error('Invalid credential dates');
  if (typeof envelope.signature !== 'string' || !/^0x[0-9a-f]{130}$/i.test(envelope.signature)) throw new Error('Invalid signature format');
  return c;
}

export async function verifyEnvelope(envelope, { registry, recoverSigner, chainId, now = () => Math.floor(Date.now() / 1000) }) {
  let c;
  try { c = validateEnvelope(envelope); } catch (e) { return { valid: false, status: 'MALFORMED', message: e.message, checks: [] }; }
  const digest = digestOf(c), record = await registry.getCredential(idOf(c.id)), issuer = await registry.getIssuer(c.issuer);
  let signer = null;
  try { signer = await recoverSigner(canonicalize(c), envelope.signature); } catch { /* Invalid signature is a failed check, never a valid fallback. */ }
  const checks = [
    { name: 'Issuer signature', passed: sameAddress(signer, c.issuer) },
    { name: 'Approved university', passed: issuer.approved && issuer.name === c.institution },
    { name: 'Registered credential', passed: !!record?.exists },
    { name: 'Document integrity', passed: !!record?.exists && record.digest.toLowerCase() === digest.toLowerCase() },
    { name: 'Issuer and student match', passed: !!record?.exists && sameAddress(record.issuer, c.issuer) && sameAddress(record.student, c.student.account) },
    { name: 'Expiration matches registry', passed: !!record?.exists && record.expiresAt === c.expiresAt },
    { name: 'Current and unexpired', passed: c.issuedAt <= now() && c.expiresAt > now() },
    { name: 'Not revoked', passed: !!record?.exists && !record.revoked },
    { name: 'Correct development chain', passed: c.chainId === chainId }
  ];
  const passed = name => checks.find(check => check.name === name).passed;
  let status = 'VERIFIED', message = 'Approved university, valid signature, matching document, and current registry status.';
  if (!passed('Issuer signature') || !passed('Document integrity') && record?.exists) { status = 'TAMPERED'; message = 'The signature or document digest does not match the registered credential.'; }
  else if (!passed('Correct development chain')) { status = 'WRONG_CHAIN'; message = 'This credential belongs to another chain.'; }
  else if (!passed('Approved university')) { status = 'UNTRUSTED_ISSUER'; message = 'The issuer is not currently approved under this institution name.'; }
  else if (!record?.exists) { status = 'NOT_REGISTERED'; message = 'This credential is not registered on the current deployment.'; }
  else if (record.revoked) { status = 'REVOKED'; message = 'The issuing university revoked this credential.'; }
  else if (!passed('Current and unexpired')) { status = 'EXPIRED_OR_NOT_YET_VALID'; message = 'The credential is outside its validity period.'; }
  else if (checks.some(check => !check.passed)) { status = 'MISMATCH'; message = 'The credential metadata does not match the registry.'; }
  return { valid: checks.every(check => check.passed), status, message, checks, digest, credential: c };
}
