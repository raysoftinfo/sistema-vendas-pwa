require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const sequelize = require('./database');
const Usuario = require('./database/models/Usuario');

require('./database/models/Fornecedor');
require('./database/models/Cliente');
require('./database/models/Produto');
require('./database/models/Venda');
require('./database/models/Acerto');
require('./database/models/Usuario');

const routes = require('./routes');

const path = require('path');

const app = express();
app.use(express.json());
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
const cloudApiUrl = 'https://sistema-vendas-pwa-production.up.railway.app';
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", cloudApiUrl],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
  }
}));
app.use(morgan('combined'));
app.use(routes);

// Qualquer erro não tratado volta como JSON com mensagem clara (nunca resposta vazia ou HTML)
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err.message || err);
  const msg = (err.message && err.message.length <= 200) ? err.message : 'Erro interno do servidor';
  res.status(res.statusCode >= 400 ? res.statusCode : 500).json({ erro: msg });
});

const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Promessa que resolve quando as tabelas existem e usuário padrão foi criado (servidor só sobe depois)
app.dbReady = sequelize.sync()
  .then(() => {
    console.log('Banco de dados sincronizado');
    return Usuario.count();
  })
  .then(async (count) => {
    if (count === 0) {
      const bcrypt = require('bcryptjs');
      const senhaHash = await bcrypt.hash('123456', 8);
      await Usuario.create({
        nome: 'Administrador',
        email: 'admin@controle.com',
        senha: senhaHash
      });
      console.log('Usuario padrão criado: admin@controle.com / 123456');
    }
  });

module.exports = app;
