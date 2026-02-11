const Venda = require('../database/models/Venda');
const Produto = require('../database/models/Produto');
const Fornecedor = require('../database/models/Fornecedor');
const Cliente = require('../database/models/Cliente');
const { obterOuCriarAcerto, atualizarAcerto, reverterAcerto } = require('../services/AcertoService');

module.exports = {
  async list(req, res) {
    const vendas = await Venda.findAll({
      include: [
        { model: Produto, as: 'Produto', include: [{ model: Fornecedor, as: 'Fornecedor' }] },
        { model: Cliente, as: 'Cliente' }
      ],
      order: [['data_venda', 'DESC']]
    });
    return res.json(vendas);
  },

  async create(req, res) {
    const { produtoId, quantidade } = req.body;

    const produto = await Produto.findByPk(produtoId, {
      include: [{ model: Fornecedor, as: 'Fornecedor' }]
    });

    if (!produto) {
      return res.status(400).json({ erro: 'Produto não encontrado' });
    }

    const valorTotal = produto.preco_venda * quantidade;

    const venda = await Venda.create({
      produtoId,
      quantidade,
      valor_total: valorTotal,
      clienteId: req.body.clienteId || null
    });

    let fornecedor = produto.Fornecedor;
    if (!fornecedor && produto.fornecedorId) {
      fornecedor = await Fornecedor.findByPk(produto.fornecedorId);
    }

    let acerto = null;
    if (fornecedor) {
      acerto = await obterOuCriarAcerto(fornecedor.id);
      if (acerto) {
        await atualizarAcerto(acerto, valorTotal);
      }
    }

    return res.json({
      venda,
      acerto_atualizado: acerto
    });
  },

  async update(req, res) {
    const { id } = req.params;
    const { produtoId, quantidade, clienteId } = req.body;

    const venda = await Venda.findByPk(id, {
      include: [{ model: Produto, as: 'Produto', include: [{ model: Fornecedor, as: 'Fornecedor' }] }]
    });
    if (!venda) return res.status(404).json({ erro: 'Venda não encontrada' });

    const produtoNovo = await Produto.findByPk(produtoId || venda.produtoId, {
      include: [{ model: Fornecedor, as: 'Fornecedor' }]
    });
    if (!produtoNovo) return res.status(400).json({ erro: 'Produto não encontrado' });

    // Fornecedor do produto novo (fallback se include não trouxer)
    let fornecedorNovo = produtoNovo.Fornecedor;
    if (!fornecedorNovo && produtoNovo.fornecedorId) {
      fornecedorNovo = await Fornecedor.findByPk(produtoNovo.fornecedorId);
    }

    const qtd = quantidade != null ? quantidade : venda.quantidade;
    const valorNovo = produtoNovo.preco_venda * qtd;

    // Fornecedor da venda antiga (fallback se include não trouxer)
    let fornecedorAntigo = venda.Produto && venda.Produto.Fornecedor;
    if (!fornecedorAntigo && venda.Produto && venda.Produto.fornecedorId) {
      fornecedorAntigo = await Fornecedor.findByPk(venda.Produto.fornecedorId);
    }

    // Reverter valor da venda antiga no acerto do fornecedor antigo (se existir)
    if (fornecedorAntigo) {
      const acertoAntigo = await obterOuCriarAcerto(fornecedorAntigo.id);
      if (acertoAntigo) {
        await reverterAcerto(acertoAntigo, venda.valor_total);
      }
    }

    // Adicionar novo valor no acerto do fornecedor novo (só se o produto tiver fornecedor)
    if (fornecedorNovo) {
      const acertoNovo = await obterOuCriarAcerto(fornecedorNovo.id);
      if (acertoNovo) {
        await atualizarAcerto(acertoNovo, valorNovo);
      }
    }

    await venda.update({
      produtoId: produtoId || venda.produtoId,
      quantidade: qtd,
      valor_total: valorNovo,
      clienteId: clienteId !== undefined ? (clienteId || null) : venda.clienteId
    });

    return res.json(venda);
  },

  async delete(req, res) {
    try {
      const { id } = req.params;
      const venda = await Venda.findByPk(id, {
        include: [{ model: Produto, as: 'Produto', include: [{ model: Fornecedor, as: 'Fornecedor' }] }]
      });
      
      if (!venda) return res.status(404).json({ erro: 'Venda não encontrada' });
      
      // Tentar reverter o acerto mesmo que o fornecedor não esteja mais disponível
      if (venda.Produto && venda.Produto.Fornecedor) {
        const acerto = await obterOuCriarAcerto(venda.Produto.Fornecedor.id);
        await reverterAcerto(acerto, venda.valor_total);
      }
      
      await venda.destroy();
      
      return res.json({ ok: true });
    } catch (error) {
      console.error('Erro ao excluir venda:', error);
      return res.status(500).json({ erro: 'Erro interno ao excluir venda' });
    }
  }
};
