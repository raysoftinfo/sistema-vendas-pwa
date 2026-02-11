const Acerto = require('../database/models/Acerto');
const Fornecedor = require('../database/models/Fornecedor');

async function obterOuCriarAcerto(fornecedorId) {
  if (!fornecedorId) return null;

  let acerto = await Acerto.findOne({
    where: { fornecedorId, status: 'PENDENTE' }
  });

  if (!acerto) {
    const fornecedor = await Fornecedor.findByPk(fornecedorId);
    if (!fornecedor) return null;

    acerto = await Acerto.create({
      fornecedorId,
      data_inicio: new Date(),
      percentual_comissao: fornecedor.percentual_comissao
    });
  }

  return acerto;
}

async function atualizarAcerto(acerto, valorVenda) {
  acerto.total_vendido += valorVenda;
  acerto.valor_comissao =
    acerto.total_vendido * (acerto.percentual_comissao / 100);

  await acerto.save();
}

async function reverterAcerto(acerto, valorVenda) {
  acerto.total_vendido = Math.max(0, acerto.total_vendido - valorVenda);
  acerto.valor_comissao =
    acerto.total_vendido * (acerto.percentual_comissao / 100);

  await acerto.save();
}

module.exports = { obterOuCriarAcerto, atualizarAcerto, reverterAcerto };
