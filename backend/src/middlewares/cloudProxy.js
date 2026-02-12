const https = require('https');
const http = require('http');

const CLOUD_URL = 'https://sistema-vendas-pwa-production.up.railway.app';

function proxyToCloud(req, res) {
  const path = req.url || '/';
  const url = new URL(path, CLOUD_URL);
  const method = req.method;
  const headers = { ...req.headers };
  headers.host = url.hostname;
  delete headers.origin;
  delete headers.referer;

  let body = null;
  if (req.body !== undefined && req.body !== null && ['POST', 'PUT', 'PATCH'].includes(method)) {
    body = Buffer.from(JSON.stringify(req.body), 'utf8');
    headers['content-length'] = body.length;
  }

  const options = {
    hostname: url.hostname,
    port: url.port || 443,
    path: url.pathname + url.search,
    method,
    headers
  };

  const client = url.protocol === 'https:' ? https : http;
  const proxyReq = client.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy para nuvem falhou:', err.message);
    res.status(502).json({ erro: 'Não foi possível conectar à nuvem. Tente novamente.' });
  });

  proxyReq.setTimeout(60000, () => {
    proxyReq.destroy();
    if (!res.headersSent) {
      res.status(504).json({ erro: 'A nuvem demorou para responder. No plano gratuito pode levar 1 minuto — tente de novo.' });
    }
  });

  if (body) {
    proxyReq.write(body);
  }
  proxyReq.end();
}

module.exports = proxyToCloud;
