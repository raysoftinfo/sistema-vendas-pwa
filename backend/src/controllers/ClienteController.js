const Cliente = require('../database/models/Cliente');

module.exports = {
  async create(req, res) {
    try {
      const cliente = await Cliente.create(req.body);
      return res.json(cliente);
    } catch (err) {
      return res.status(400).json({ erro: err.message });
    }
  },

  async list(req, res) {
    try {
      const clientes = await Cliente.findAll();
      return res.json(clientes);
    } catch (err) {
      return res.status(400).json({ erro: err.message });
    }
  },
  
  async update(req, res) {
    try {
      const { id } = req.params;
      const [updatedRowsCount] = await Cliente.update(req.body, {
        where: { id }
      });
      
      if (updatedRowsCount === 0) {
        return res.status(404).json({ erro: 'Cliente não encontrado' });
      }
      
      const clienteAtualizado = await Cliente.findByPk(id);
      return res.json(clienteAtualizado);
    } catch (err) {
      return res.status(400).json({ erro: err.message });
    }
  },
  
  async delete(req, res) {
    try {
      const { id } = req.params;
      const deletedRowsCount = await Cliente.destroy({
        where: { id }
      });
      
      if (deletedRowsCount === 0) {
        return res.status(404).json({ erro: 'Cliente não encontrado' });
      }
      
      return res.status(204).send();
    } catch (err) {
      return res.status(400).json({ erro: err.message });
    }
  },
  
  async limparVazios(req, res) {
    try {
      const deletedRowsCount = await Cliente.destroy({
        where: {
          nome: ''
        }
      });
      
      return res.json({ mensagem: `${deletedRowsCount} clientes vazios removidos` });
    } catch (err) {
      return res.status(400).json({ erro: err.message });
    }
  }
};