const { DataTypes } = require('sequelize');
const sequelize = require('../index');

const Fornecedor = sequelize.define('Fornecedor', {
  nome: {
    type: DataTypes.STRING,
    allowNull: false
  },
  telefone: {
    type: DataTypes.STRING
  },
  contato: {
    type: DataTypes.STRING
  },
  percentual_comissao: {
    type: DataTypes.FLOAT,
    defaultValue: 30
  }
}, {
  tableName: 'Fornecedores'
});

module.exports = Fornecedor;
