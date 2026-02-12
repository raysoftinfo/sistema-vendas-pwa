const { DataTypes } = require('sequelize');
const sequelize = require('../index');
const Fornecedor = require('./Fornecedor');

const Produto = sequelize.define('Produto', {
  nome: {
    type: DataTypes.STRING,
    allowNull: false
  },
  preco_venda: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  fornecedorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Fornecedores',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL'
  }
}, {
  tableName: 'Produtos'
});

Produto.belongsTo(Fornecedor, { foreignKey: 'fornecedorId', as: 'Fornecedor' });
Fornecedor.hasMany(Produto, { foreignKey: 'fornecedorId' });

module.exports = Produto;
