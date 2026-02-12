const Produto = require('../database/models/Produto');
const Fornecedor = require('../database/models/Fornecedor');
const Venda = require('../database/models/Venda');

function erroResposta(err, res, fallback) {
  console.error('Erro Produto:', err.message || err);
  const msg = err.message && err.message.length <= 200 ? err.message : fallback;
  res.status(500).json({ erro: msg });
}

module.exports = {
  async create(req, res) {
    try {
      const produto = await Produto.create(req.body);
      return res.json(produto);
    } catch (err) {
      return erroResposta(err, res, 'Erro ao cadastrar produto.');
    }
  },

  async list(req, res) {
    try {
      const produtos = await Produto.findAll({
        include: [{ model: Fornecedor, as: 'Fornecedor' }]
      });
      return res.json(produtos);
    } catch (err) {
      return erroResposta(err, res, 'Erro ao listar produtos.');
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const produto = await Produto.findByPk(id);
      if (!produto) return res.status(404).json({ erro: 'Produto não encontrado' });
      await produto.update(req.body);
      return res.json(produto);
    } catch (err) {
      return erroResposta(err, res, 'Erro ao atualizar produto.');
    }
  },

  async delete(req, res) {
    try {
      const { id } = req.params;
      const produto = await Produto.findByPk(id);
      if (!produto) return res.status(404).json({ erro: 'Produto não encontrado' });
      const vendasCount = await Venda.count({ where: { produtoId: id } });
      if (vendasCount > 0) {
        return res.status(400).json({
          erro: 'Não é possível excluir: existem vendas vinculadas a este produto. Exclua as vendas primeiro.'
        });
      }
      await produto.destroy();
      return res.json({ ok: true });
    } catch (err) {
      console.error('Erro ao excluir produto:', err);
      return res.status(500).json({
        erro: err.message || 'Erro ao excluir produto'
      });
    }
  }
};
