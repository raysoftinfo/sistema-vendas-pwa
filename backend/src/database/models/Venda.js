const { DataTypes } = require('sequelize');
const sequelize = require('../index');
const Produto = require('./Produto');
const Cliente = require('./Cliente');

const Venda = sequelize.define('Venda', {
  quantidade: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  valor_total: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  data_venda: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  produtoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Produtos',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT'
  },
  clienteId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Clientes',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  }
});

Venda.belongsTo(Produto, { foreignKey: 'produtoId', as: 'Produto' });
Produto.hasMany(Venda, { foreignKey: 'produtoId' });
Venda.belongsTo(Cliente, { foreignKey: 'clienteId', as: 'Cliente' });
Cliente.hasMany(Venda, { foreignKey: 'clienteId' });

module.exports = Venda;
