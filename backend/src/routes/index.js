const express = require('express');
const routes = express.Router();

const FornecedorController = require('../controllers/FornecedorController');
const ClienteController = require('../controllers/ClienteController');
const ProdutoController = require('../controllers/ProdutoController');
const VendaController = require('../controllers/VendaController');
const AcertoController = require('../controllers/AcertoController');
const DashboardController = require('../controllers/DashboardController');
const AuthController = require('../controllers/AuthController');
const auth = require('../middlewares/auth');

// auth (público)
routes.post('/register', AuthController.register);
routes.post('/login', AuthController.login);
routes.put('/usuarios/senha', auth, AuthController.updatePassword);

// rotas protegidas (clientes primeiro, mesma lógica de fornecedores)
routes.post('/clientes', auth, ClienteController.create);
routes.get('/clientes', auth, ClienteController.list);
routes.put('/clientes/:id', auth, ClienteController.update);
routes.delete('/clientes/limpar-vazios', auth, ClienteController.limparVazios);
routes.delete('/clientes/:id', auth, ClienteController.delete);

routes.post('/fornecedores', auth, FornecedorController.create);
routes.get('/fornecedores', auth, FornecedorController.list);
routes.put('/fornecedores/:id', auth, FornecedorController.update);
routes.delete('/fornecedores/:id', auth, FornecedorController.delete);

routes.post('/produtos', auth, ProdutoController.create);
routes.get('/produtos', auth, ProdutoController.list);
routes.put('/produtos/:id', auth, ProdutoController.update);
routes.delete('/produtos/:id', auth, ProdutoController.delete);

routes.get('/vendas', auth, VendaController.list);
routes.post('/vendas', auth, VendaController.create);
routes.put('/vendas/:id', auth, VendaController.update);
routes.delete('/vendas/:id', auth, VendaController.delete);

routes.get('/acertos', auth, AcertoController.list);
routes.post('/acertos/:id/receber', auth, AcertoController.receber);
routes.post('/acertos/:id/reabrir', auth, AcertoController.reabrir);
routes.get('/dashboard/resumo', auth, DashboardController.resumo);

module.exports = routes;
