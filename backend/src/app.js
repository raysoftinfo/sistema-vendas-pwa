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
const cloudProxy = require('./middlewares/cloudProxy');

const path = require('path');

const app = express();
app.use(express.json());
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('combined'));
app.use('/api-cloud', cloudProxy);
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

// Servidor sobe assim que as tabelas existem; usuário padrão é criado em background (evita 7+ min no Railway).
app.dbReady = sequelize.sync()
  .then(() => {
    console.log('Banco de dados sincronizado');
    return Usuario.count();
  })
  .then((count) => {
    if (count === 0) {
      const bcrypt = require('bcryptjs');
      bcrypt.hash('123456', 8).then((senhaHash) => {
        return Usuario.create({
          nome: 'Administrador',
          email: 'admin@controle.com',
          senha: senhaHash
        });
      }).then(() => {
        console.log('Usuario padrão criado: admin@controle.com / 123456');
      }).catch((err) => console.error('Erro ao criar usuário padrão:', err.message));
    }
  });

module.exports = app;
