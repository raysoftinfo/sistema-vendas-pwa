const Fornecedor = require('../database/models/Fornecedor');

function erroResposta(err, res, fallback) {
  console.error('Erro Fornecedor:', err.message || err);
  const msg = err.message && err.message.length <= 200 ? err.message : fallback;
  res.status(500).json({ erro: msg });
}

module.exports = {
  async create(req, res) {
    try {
      const fornecedor = await Fornecedor.create(req.body);
      return res.json(fornecedor);
    } catch (err) {
      return erroResposta(err, res, 'Erro ao cadastrar fornecedor.');
    }
  },

  async list(req, res) {
    try {
      const fornecedores = await Fornecedor.findAll({ order: [['nome', 'ASC']] });
      return res.json(fornecedores);
    } catch (err) {
      return erroResposta(err, res, 'Erro ao listar fornecedores.');
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const fornecedor = await Fornecedor.findByPk(id);
      if (!fornecedor) return res.status(404).json({ erro: 'Fornecedor não encontrado' });
      await fornecedor.update(req.body);
      return res.json(fornecedor);
    } catch (err) {
      return erroResposta(err, res, 'Erro ao atualizar fornecedor.');
    }
  },

  async delete(req, res) {
    try {
      const { id } = req.params;
      const fornecedor = await Fornecedor.findByPk(id);
      if (!fornecedor) return res.status(404).json({ erro: 'Fornecedor não encontrado' });
      await fornecedor.destroy();
      return res.json({ ok: true });
    } catch (err) {
      return erroResposta(err, res, 'Erro ao excluir fornecedor.');
    }
  }
};
