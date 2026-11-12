import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { canonicalize, digestOf, didFor, idOf, validateEnvelope, verifyEnvelope, SCHEMA } from '../src/core.mjs';

const issuer = '0x' + '11'.repeat(20), student = '0x' + '22'.repeat(20), stranger = '0x' + '33'.repeat(20);
function fixture() {
  const credential = { schema: SCHEMA, id: randomUUID(), chainId: 31337, issuer, issuerDid: didFor(31337, issuer), institution: 'Example University',
    student: { account: student, did: didFor(31337, student), name: 'Alex Student' }, degree: 'MS Computer Science', issuedAt: 100, expiresAt: 200 };
  const envelope = { credential, signature: '0x' + 'ab'.repeat(65) };
  const record = { digest: digestOf(credential), issuer, student, expiresAt: 200, revoked: false, exists: true };
  const trusted = { name: 'Example University', approved: true };
  // These are logic-test doubles. They do not validate an ECDSA signature or execute an EVM.
  const options = { chainId: 31337, now: () => 150, recoverSigner: () => issuer,
    registry: { getCredential: async () => record, getIssuer: async () => trusted } };
  return { envelope, record, trusted, options };
}

test('canonical digest is independent of object key order but detects changed content', () => {
  assert.equal(digestOf({ b: 2, a: { y: 'yes', x: 1 } }), digestOf({ a: { x: 1, y: 'yes' }, b: 2 }));
  assert.notEqual(digestOf({ name: 'Alex' }), digestOf({ name: 'Alexa' }));
  assert.notEqual(idOf('one'), idOf('two'));
});
test('canonicalization safely serializes prototype-like keys and rejects unsafe values', () => {
  assert.equal(canonicalize(JSON.parse('{"__proto__":{"polluted":true}}')), '{"__proto__":{"polluted":true}}');
  assert.equal({}.polluted, undefined);
  assert.throws(() => canonicalize({ x: undefined })); assert.throws(() => canonicalize({ x: Infinity }));
});
test('schema requires DID/account and date consistency', () => {
  const f = fixture(); assert.equal(validateEnvelope(f.envelope).student.name, 'Alex Student');
  f.envelope.credential.student.did = didFor(31337, stranger); assert.throws(() => validateEnvelope(f.envelope), /DID/);
});
test('verification policy accepts all matching checks', async () => {
  const f = fixture(), result = await verifyEnvelope(f.envelope, f.options);
  assert.equal(result.valid, true); assert.equal(result.checks.length, 9);
});
test('changed degree fails the registry digest even with a favorable signature test double', async () => {
  const f = fixture(); f.envelope.credential.degree = 'Forged PhD';
  assert.equal((await verifyEnvelope(f.envelope, f.options)).status, 'TAMPERED');
});
test('incorrect signature recovery is rejected', async () => {
  const f = fixture(); f.options.recoverSigner = () => stranger;
  assert.equal((await verifyEnvelope(f.envelope, f.options)).status, 'TAMPERED');
});
test('signature verifier exceptions fail closed', async () => {
  const f = fixture(); f.options.recoverSigner = () => { throw new Error('bad signature'); };
  assert.equal((await verifyEnvelope(f.envelope, f.options)).valid, false);
});
test('revoked credential cannot pass', async () => {
  const f = fixture(); f.record.revoked = true;
  assert.equal((await verifyEnvelope(f.envelope, f.options)).status, 'REVOKED');
});
test('an unapproved institution cannot pass', async () => {
  const f = fixture(); f.trusted.approved = false;
  assert.equal((await verifyEnvelope(f.envelope, f.options)).status, 'UNTRUSTED_ISSUER');
});
test('expired credential cannot pass', async () => {
  const f = fixture(); f.options.now = () => 201;
  assert.equal((await verifyEnvelope(f.envelope, f.options)).status, 'EXPIRED_OR_NOT_YET_VALID');
});
test('wrong chain is rejected', async () => {
  const f = fixture(); f.options.chainId = 1;
  assert.equal((await verifyEnvelope(f.envelope, f.options)).status, 'WRONG_CHAIN');
});
test('missing registry record is rejected', async () => {
  const f = fixture(); f.record.exists = false;
  assert.equal((await verifyEnvelope(f.envelope, f.options)).status, 'NOT_REGISTERED');
});
test('holder mismatch is rejected even if digest matches', async () => {
  const f = fixture(); f.record.student = stranger;
  assert.equal((await verifyEnvelope(f.envelope, f.options)).status, 'MISMATCH');
});
test('malformed envelopes do not reach the registry', async () => {
  const f = fixture(); f.options.registry.getCredential = () => { throw new Error('must not reach registry'); };
  for (const value of [null, {}, [], { credential: {} }]) assert.equal((await verifyEnvelope(value, f.options)).status, 'MALFORMED');
});
