const Acerto = require('../database/models/Acerto');
const Fornecedor = require('../database/models/Fornecedor');

module.exports = {
  async list(req, res) {
    // Um card por fornecedor: só acertos PENDENTE; se houver mais de um por fornecedor, pega o mais recente
    const todos = await Acerto.findAll({
      where: { status: 'PENDENTE' },
      include: [{ model: Fornecedor, as: 'Fornecedor' }],
      order: [['id', 'DESC']]
    });
    const porFornecedor = new Map();
    for (const a of todos) {
      const fid = a.fornecedorId;
      if (!porFornecedor.has(fid)) porFornecedor.set(fid, a);
    }
    const acertos = Array.from(porFornecedor.values());
    return res.json(acertos);
  },

  async receber(req, res) {
    const acerto = await Acerto.findByPk(req.params.id);

    if (!acerto) {
      return res.status(404).json({ erro: 'Acerto não encontrado' });
    }

    acerto.status = 'RECEBIDO';
    acerto.data_fim = new Date();
    acerto.data_recebimento = new Date();

    await acerto.save();

    return res.json(acerto);
  },

  async reabrir(req, res) {
    const acerto = await Acerto.findByPk(req.params.id);

    if (!acerto) {
      return res.status(404).json({ erro: 'Acerto não encontrado' });
    }

    if (acerto.status !== 'RECEBIDO') {
      return res.status(400).json({ erro: 'Só é possível reabrir um acerto já marcado como recebido' });
    }

    acerto.status = 'PENDENTE';
    acerto.data_fim = null;
    acerto.data_recebimento = null;

    await acerto.save();

    return res.json(acerto);
  }
};
