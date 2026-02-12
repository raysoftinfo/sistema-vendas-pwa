const { DataTypes } = require('sequelize');
const sequelize = require('../index');
const Fornecedor = require('./Fornecedor');

const Acerto = sequelize.define('Acerto', {
  data_inicio: {
    type: DataTypes.DATE,
    allowNull: false
  },
  data_fim: {
    type: DataTypes.DATE
  },
  total_vendido: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  percentual_comissao: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  valor_comissao: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'PENDENTE'
  },
  data_recebimento: {
    type: DataTypes.DATE
  }
}, {
  tableName: 'Acertos'
});

Acerto.belongsTo(Fornecedor, { foreignKey: 'fornecedorId', as: 'Fornecedor' });
Fornecedor.hasMany(Acerto, { foreignKey: 'fornecedorId' });

module.exports = Acerto;
