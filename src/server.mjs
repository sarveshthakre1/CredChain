import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCredentialService } from './credentials.mjs';
import { TITLE, didFor } from './core.mjs';

export function createApplication(chain) {
  const service = createCredentialService(chain);
  const files = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
  const server = createServer(async (req, res) => {
    const headers = {
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
    };
    const send = (status, body) => { res.writeHead(status, { ...headers, 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
    try {
      const host = req.headers.host || '';
      if (!/^(localhost|127\.0\.0\.1):\d+$/.test(host)) return send(403, { error: 'Open this local demonstration using localhost.' });
      if (req.headers.origin && req.headers.origin !== 'http://' + host || req.headers['sec-fetch-site'] === 'cross-site') return send(403, { error: 'Cross-origin requests are blocked.' });
      const path = new URL(req.url, 'http://' + host).pathname;
      if (req.method === 'GET' && files[path]) {
        const [name, type] = files[path], bytes = await readFile(new URL('../public/' + name, import.meta.url));
        res.writeHead(200, { ...headers, 'Content-Type': type + '; charset=utf-8' }); return res.end(bytes);
      }
      if (req.method === 'GET' && path === '/api/config') {
        await chain.assertDeployment();
        return send(200, { title: TITLE, mode: 'Local Ethereum development chain', contract: chain.deployment.address,
          chainId: chain.deployment.chainId, accounts: chain.deployment.accounts,
          studentDid: didFor(chain.deployment.chainId, chain.deployment.accounts.student),
          issuerName: (await chain.registry.getIssuer(chain.deployment.accounts.issuer)).name });
      }
      if (req.method === 'GET' && path === '/api/activity') {
        await chain.assertDeployment();
        const latest = Number(BigInt(await chain.provider.send('eth_blockNumber', [])));
        const logs = await chain.provider.getLogs({ address: chain.deployment.address, fromBlock: Math.max(0, latest - 2000), toBlock: latest });
        return send(200, { events: logs.slice(-50).reverse().map(log => {
          const event = chain.contract.interface.parseLog(log);
          return { event: event.name, block: log.blockNumber, transactionHash: log.transactionHash,
            identifier: event.args.id || event.args.issuer || event.args.controller || '' };
        }) });
      }
      if (req.method !== 'POST') return send(404, { error: 'Not found' });
      if (!req.headers['content-type']?.startsWith('application/json')) return send(415, { error: 'Use application/json' });
      if (Number(req.headers['content-length']) > 65536) return send(413, { error: 'Document exceeds 64 KB' });
      const chunks = []; let length = 0;
      for await (const chunk of req) { length += chunk.length; if (length > 65536) return send(413, { error: 'Document exceeds 64 KB' }); chunks.push(chunk); }
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return send(400, { error: 'Enter valid JSON' }); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return send(400, { error: 'Expected a JSON object' });
      if (path === '/api/issue') return send(201, await service.issue(body));
      if (path === '/api/verify') return send(200, await service.verify(body));
      if (path === '/api/revoke') return send(200, await service.revoke(body.id));
      if (path === '/api/unauthorized-attempt') return send(200, await service.unauthorizedAttempt(body));
      return send(404, { error: 'Not found' });
    } catch (error) {
      const message = error.reason || error.message || 'Request failed';
      const safe = /^(Enter |Validity |Credential not found|This credential|The local chain|Unexpected registry|Demo university)/.test(message);
      console.error('Request failed:', message);
      send(safe ? 400 : 503, { error: safe ? message : 'Could not reach or update the Ethereum registry. Check terminal 1 is running; if you restarted it, redeploy and restart this server.' });
    }
  });
  return { server, service };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { connectBlockchain } = await import('./blockchain.mjs');
    const chain = await connectBlockchain(), { server } = createApplication(chain);
    const port = Number(process.env.PORT || 3000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
    server.listen(port, '127.0.0.1', () => {
      console.log(TITLE); console.log(`Website: http://localhost:${port}`);
      console.log('Ethereum chain:', chain.deployment.chainId, '| Registry:', chain.deployment.address);
      console.log('Local test accounts only. Demo role selection is not production authentication.');
    });
    server.on('error', error => { console.error(error.message); chain.provider.destroy(); process.exitCode = 1; });
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { chain.provider.destroy(); process.exit(0); }));
  } catch (error) { console.error('Startup failed:', error.message); process.exitCode = 1; }
}
