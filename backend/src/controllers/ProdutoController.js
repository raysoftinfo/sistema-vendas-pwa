const Produto = require('../database/models/Produto');
const Fornecedor = require('../database/models/Fornecedor');
const Venda = require('../database/models/Venda');

module.exports = {
  async create(req, res) {
    const produto = await Produto.create(req.body);
    return res.json(produto);
  },

  async list(req, res) {
    const produtos = await Produto.findAll({
      include: [{ model: Fornecedor, as: 'Fornecedor' }]
    });
    return res.json(produtos);
  },

  async update(req, res) {
    const { id } = req.params;
    const produto = await Produto.findByPk(id);
    if (!produto) return res.status(404).json({ erro: 'Produto não encontrado' });
    await produto.update(req.body);
    return res.json(produto);
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
