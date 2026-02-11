const Venda = require('../database/models/Venda');
const Produto = require('../database/models/Produto');
const Fornecedor = require('../database/models/Fornecedor');
const Cliente = require('../database/models/Cliente');
const Acerto = require('../database/models/Acerto');

module.exports = {
  async resumo(req, res) {
    try {
      // Contar registros (sem dependência de include)
      const [totalFornecedores, totalClientes, totalProdutos, totalVendas] = await Promise.all([
        Fornecedor.count(),
        Cliente.count(),
        Produto.count(),
        Venda.count()
      ]);

      // Total vendido: só somar valor_total (evita include que pode falhar)
      const vendas = await Venda.findAll({ attributes: ['valor_total'] });
      const totalVendido = vendas.reduce((sum, v) => sum + (Number(v.valor_total) || 0), 0);

      // Acertos recentes e comissão pendente
      const acertosRecentes = await Acerto.findAll({
        include: [{ model: Fornecedor, as: 'Fornecedor' }],
        order: [['data_inicio', 'DESC']],
        limit: 5
      });
      const acertosPendentes = await Acerto.findAll({
        where: { status: 'PENDENTE' },
        order: [['id', 'DESC']]
      });
      // Um acerto por fornecedor; comissão sempre recalculada: total_vendido * (percentual/100)
      const porFornecedor = new Map();
      for (const a of acertosPendentes) {
        if (!porFornecedor.has(a.fornecedorId)) porFornecedor.set(a.fornecedorId, a);
      }
      const acertosUnicos = [...porFornecedor.values()];
      let totalComissaoPendente = 0;
      let acertoPendenteId = null;
      for (const a of acertosUnicos) {
        const total = Number(a.total_vendido) || 0;
        const pct = Number(a.percentual_comissao) || 0;
        totalComissaoPendente += total * (pct / 100);
        if (!acertoPendenteId) acertoPendenteId = a.id;
      }
      const temAcertoPendente = totalComissaoPendente > 0;

      // Quando não há pendente, retornar id do último acerto recebido (para botão "Reabrir")
      let ultimoAcertoRecebidoId = null;
      if (!temAcertoPendente) {
        const ultimoRecebido = await Acerto.findOne({
          where: { status: 'RECEBIDO' },
          order: [['data_recebimento', 'DESC']],
          attributes: ['id']
        });
        if (ultimoRecebido) ultimoAcertoRecebidoId = ultimoRecebido.id;
      }

      return res.json({
        totalFornecedores: Number(totalFornecedores),
        totalClientes: Number(totalClientes),
        totalProdutos: Number(totalProdutos),
        totalVendas: Number(totalVendas),
        totalVendido: Number(totalVendido),
        totalComissaoPendente: Number(Math.round(totalComissaoPendente * 100) / 100),
        statusAcertos: temAcertoPendente ? 'PENDENTE' : 'NENHUM_PENDENTE',
        acertoPendenteId: temAcertoPendente ? acertoPendenteId : null,
        ultimoAcertoRecebidoId,
        acertosRecentes
      });
    } catch (err) {
      console.error('Dashboard resumo:', err);
      return res.status(500).json({ erro: err.message || 'Erro ao carregar resumo' });
    }
  }
};