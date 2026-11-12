const $ = id => document.getElementById(id);
let config, issued = null, wallet = null;
const STORAGE = 'credchain-interim-credential-v1';
const json = value => JSON.stringify(value, null, 2);
function notice(text, error = false) { $('notice').textContent = text; $('notice').classList.toggle('error', error); $('notice').hidden = false; }
function showPage(name) {
  document.querySelectorAll('.page').forEach(section => { section.hidden = section.id !== name; });
  document.querySelectorAll('[data-page]').forEach(button => {
    const active = button.dataset.page === name; button.classList.toggle('active', active);
    if (active) { button.setAttribute('aria-current', 'page'); $('page-name').textContent = button.textContent.trim().slice(1).trim(); } else button.removeAttribute('aria-current');
  });
  $('notice').hidden = true;
  if (name === 'activity') refreshActivity().catch(error => notice(error.message, true));
}
async function api(path, body) {
  const response = await fetch('/api/' + path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: json(body) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Request failed'); return data;
}
function bind(id, operation) { $(id).addEventListener('click', async event => {
  const button = event.currentTarget; button.disabled = true;
  try { await operation(); } catch (error) { notice(error.message, true); } finally { button.disabled = false; }
}); }
function readDocument(value) {
  if (!value || value.length > 64000) throw new Error('Supply a credential document under 64 KB.');
  let document; try { document = JSON.parse(value); } catch { throw new Error('The credential JSON is not valid.'); }
  if (!document?.credential || typeof document.signature !== 'string') throw new Error('Include both credential and signature.'); return document;
}
function download(envelope) {
  if (!envelope) throw new Error('Create or import a credential first.');
  const url = URL.createObjectURL(new Blob([json(envelope)], { type: 'application/json' })), link = document.createElement('a');
  link.href = url; link.download = 'CredChain-credential.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function receipt(id, data) { const element = $(id); element.textContent = `Transaction: ${data.transactionHash}\nBlock: ${data.blockNumber} · Gas used: ${data.gasUsed}`; element.hidden = false; }
function renderWallet() {
  $('wallet-empty').hidden = !!wallet; $('wallet-card').hidden = !wallet;
  if (!wallet) { $('wallet-json').value = ''; return; }
  $('wallet-json').value = json(wallet); const c = wallet.credential;
  $('wallet-name').textContent = c.student?.name || 'Imported credential'; $('wallet-degree').textContent = c.degree || '';
  $('wallet-institution').textContent = c.institution || ''; $('wallet-id').textContent = c.id || '';
}
function saveWallet(document) {
  if (!config) throw new Error('Wait for the blockchain connection.');
  if (document.credential.student?.account?.toLowerCase() !== config.accounts.student.toLowerCase()) throw new Error('This document belongs to a different student account.');
  localStorage.setItem(STORAGE, json(document)); wallet = document; renderWallet();
}
function clearVerification() { $('verification-result').hidden = true; $('verification-empty').hidden = false; $('unauthorized-result').hidden = true; }
async function refreshActivity() {
  const data = await api('activity'), target = $('events'); target.replaceChildren();
  if (!data.events.length) { target.textContent = 'No events found for this deployment.'; return; }
  for (const event of data.events) {
    const row = document.createElement('div'); row.className = 'event';
    const title = document.createElement('strong'); title.textContent = event.event;
    const details = document.createElement('div'), block = document.createElement('span'), id = document.createElement('code'), tx = document.createElement('small');
    block.textContent = 'Block ' + event.block; id.textContent = event.identifier; tx.textContent = 'Transaction: ' + event.transactionHash;
    details.append(block, id, tx); row.append(title, details); target.append(row);
  }
}
document.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => showPage(button.dataset.page)));
document.querySelectorAll('[data-goto]').forEach(button => button.addEventListener('click', () => showPage(button.dataset.goto)));
$('issue-form').addEventListener('submit', async event => {
  event.preventDefault(); const button = event.target.querySelector('button'); button.disabled = true;
  try {
    const data = await api('issue', Object.fromEntries(new FormData(event.target)));
    issued = data.envelope; $('issued-json').value = json(issued); $('revoke-id').value = issued.credential.id;
    receipt('issue-receipt', data); notice('Credential signed and registered on the local Ethereum chain.');
  } catch (error) { notice(error.message, true); } finally { button.disabled = false; }
});
bind('download-issued', () => download(issued));
bind('save-issued', () => { if (!issued) throw new Error('Issue a credential first.'); saveWallet(issued); showPage('student'); notice('Credential saved in this browser.'); });
bind('import-wallet', () => { saveWallet(readDocument($('wallet-json').value)); notice('Imported locally. The employer verifier will check its authenticity and current status.'); });
bind('present-wallet', () => { if (!wallet) throw new Error('Import a credential first.'); $('verify-json').value = json(wallet); clearVerification(); showPage('verifier'); });
bind('download-wallet', () => download(wallet));
bind('forget-wallet', () => { localStorage.removeItem(STORAGE); wallet = null; renderWallet(); notice('Saved credential removed from this browser.'); });
for (const [inputId, targetId] of [['wallet-file', 'wallet-json'], ['verify-file', 'verify-json']]) $(inputId).addEventListener('change', async event => {
  try {
    const file = event.target.files[0]; if (!file) return; if (file.size > 64000) throw new Error('Choose a JSON file under 64 KB.');
    const text = await file.text(); readDocument(text); $(targetId).value = text; if (targetId === 'verify-json') clearVerification();
  } catch (error) { notice(error.message, true); }
});
$('verify-json').addEventListener('input', clearVerification);
bind('verify', async () => {
  clearVerification(); const result = await api('verify', readDocument($('verify-json').value));
  $('verification-empty').hidden = true; $('verification-result').hidden = false;
  $('verification-status').textContent = result.status + ' · ' + result.message;
  $('verification-status').classList.toggle('failure', !result.valid);
  $('checks').replaceChildren();
  for (const check of result.checks || []) {
    const line = document.createElement('div'); line.className = 'check ' + (check.passed ? 'pass' : 'fail');
    line.textContent = (check.passed ? '✓ ' : '✕ ') + check.name; $('checks').append(line);
  }
  $('verification-details').textContent = result.credential ? json({ student: result.credential.student.name, degree: result.credential.degree, institution: result.credential.institution, credentialId: result.credential.id }) : '';
});
bind('tamper', () => {
  const document = readDocument($('verify-json').value); document.credential.degree = 'PhD in Computer Science — unauthorized edit';
  $('verify-json').value = json(document); clearVerification(); notice('The degree was edited while retaining the original signature. Verify this copy to see the failed checks.');
});
bind('revoke', async () => { const data = await api('revoke', { id: $('revoke-id').value.trim() }); receipt('revoke-receipt', data); notice('Revocation confirmed. Present the original credential again to see its new status.'); });
bind('unauthorized', async () => {
  const data = await api('unauthorized-attempt', readDocument($('verify-json').value));
  $('unauthorized-result').textContent = (data.rejected ? 'Contract rejected the unapproved issuer: ' : 'Unexpected result: ') + data.message;
  $('unauthorized-result').classList.toggle('failure', !data.rejected); $('unauthorized-result').hidden = false;
});
bind('refresh-activity', refreshActivity);
(async () => {
  try {
    config = await api('config'); $('network').textContent = `LOCAL ETHEREUM · Chain ${config.chainId} · Registry ${config.contract}`;
    $('student-did').value = config.studentDid;
    try { const saved = localStorage.getItem(STORAGE); if (saved) wallet = readDocument(saved); } catch { wallet = null; }
    renderWallet();
  } catch (error) { $('network').textContent = 'BLOCKCHAIN CONNECTION UNAVAILABLE'; notice(error.message, true); }
})();
