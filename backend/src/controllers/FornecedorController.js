const Fornecedor = require('../database/models/Fornecedor');

module.exports = {
  async create(req, res) {
    const fornecedor = await Fornecedor.create(req.body);
    return res.json(fornecedor);
  },

  async list(req, res) {
    const fornecedores = await Fornecedor.findAll({ order: [['nome', 'ASC']] });
    return res.json(fornecedores);
  },

  async update(req, res) {
    const { id } = req.params;
    const fornecedor = await Fornecedor.findByPk(id);
    if (!fornecedor) return res.status(404).json({ erro: 'Fornecedor não encontrado' });
    await fornecedor.update(req.body);
    return res.json(fornecedor);
  },

  async delete(req, res) {
    const { id } = req.params;
    const fornecedor = await Fornecedor.findByPk(id);
    if (!fornecedor) return res.status(404).json({ erro: 'Fornecedor não encontrado' });
    await fornecedor.destroy();
    return res.json({ ok: true });
  }
};
