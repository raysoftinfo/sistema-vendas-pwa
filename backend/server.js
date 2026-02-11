require('dotenv').config();
const os = require('os');
const app = require('./src/app');

const PORT = process.env.PORT || process.env.APP_PORT || 3333;

function ipLocal() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return null;
}

app.listen(PORT, '0.0.0.0', () => {
  const ip = ipLocal();
  console.log('');
  console.log('  ============================================');
  console.log('   CONTROLE DE DOCES - Servidor no ar');
  console.log('  ============================================');
  console.log('');
  console.log('   No PC:     http://localhost:' + PORT);
  if (ip) console.log('   No celular (mesma rede Wi-Fi):  http://' + ip + ':' + PORT);
  console.log('');
  console.log('   NAO FECHE ESTA JANELA enquanto usar o sistema.');
  console.log('');
});
