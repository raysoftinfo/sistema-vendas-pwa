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
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));
app.use(routes);

const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Desativar sincronização automática para evitar conflitos
// sequelize.sync({ alter: true }).then(async () => {
//   console.log('Banco de dados sincronizado');
//   const count = await Usuario.count();
//   if (count === 0) {
//     const bcrypt = require('bcryptjs');
//     const senhaHash = await bcrypt.hash('123456', 8);
//     await Usuario.create({
//       nome: 'Administrador',
//       email: 'admin@controle.com',
//       senha: senhaHash
//     });
//     console.log('Usuario padrão criado: admin@controle.com / 123456');
//   }
// }).catch(err => {
//   console.error('Erro na sincronização do banco de dados:', err);
//   // Tenta continuar mesmo com erro de sincronização
//   console.log('Continuando com o servidor...');
// });

// Simples verificação de conexão
sequelize.authenticate()
  .then(() => {
    console.log('Conexão com banco de dados estabelecida com sucesso');
    // Verificar se o usuário padrão existe e criar se necessário
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
  })
  .catch(err => {
    console.error('Erro ao conectar ao banco de dados:', err);
  });

module.exports = app;
