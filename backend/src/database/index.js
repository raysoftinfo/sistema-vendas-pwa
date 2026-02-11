const path = require('path');
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Sempre usar o banco na pasta backend (não depende de onde o servidor foi iniciado)
const defaultStorage = path.join(__dirname, '..', '..', 'database.sqlite');
const storage = process.env.DATABASE_PATH || defaultStorage;

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage,
  logging: false
});

module.exports = sequelize;
