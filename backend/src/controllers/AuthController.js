const Usuario = require('../database/models/Usuario');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'segredo_super_seguro';

// Função para validar força da senha
function validarForcaSenha(senha) {
  if (senha.length < 6) {
    return 'A senha deve ter pelo menos 6 caracteres';
  }
  if (!/[A-Z]/.test(senha)) {
    return 'A senha deve conter pelo menos uma letra maiúscula';
  }
  if (!/[a-z]/.test(senha)) {
    return 'A senha deve conter pelo menos uma letra minúscula';
  }
  if (!/\d/.test(senha)) {
    return 'A senha deve conter pelo menos um número';
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(senha)) {
    return 'A senha deve conter pelo menos um caractere especial';
  }
  return null;
}

module.exports = {
  async register(req, res) {
    try {
      const nome = (req.body.nome || '').trim();
      const email = (req.body.email || '').trim();
      const senha = (req.body.senha || '').trim();
      
      if (!nome || !email || !senha) {
        return res.status(400).json({ erro: 'Preencha nome, email e senha' });
      }
      
      // Validar força da senha
      const erroSenha = validarForcaSenha(senha);
      if (erroSenha) {
        return res.status(400).json({ erro: erroSenha });
      }

      const hash = await bcrypt.hash(senha, 8);

      const user = await Usuario.create({
        nome,
        email,
        senha: hash
      });

      const { senha: _, ...userSemSenha } = user.toJSON();
      res.json(userSemSenha);
    } catch (err) {
      console.error('Erro ao cadastrar:', err.message || err);
      if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ erro: 'Email já cadastrado' });
      }
      if (err.name === 'SequelizeValidationError' && err.errors?.length) {
        const msg = err.errors.map(e => e.message).join('. ');
        return res.status(400).json({ erro: msg });
      }
      if (err.name === 'SequelizeDatabaseError' || err.message?.includes('SQLITE')) {
        return res.status(500).json({ erro: 'Erro no banco de dados. O servidor pode estar iniciando — tente novamente em instantes.' });
      }
      const mensagem = err.message && err.message.length < 120 ? err.message : 'Erro ao cadastrar. Verifique os dados e tente novamente.';
      return res.status(500).json({ erro: mensagem });
    }
  },

  async login(req, res) {
    try {
      const email = (req.body.email || '').trim();
      const senha = (req.body.senha || '').trim();

      if (!email || !senha) {
        return res.status(400).json({ erro: 'Informe email e senha' });
      }

      const user = await Usuario.findOne({ where: { email } });
      if (!user) {
        return res.status(401).json({ erro: 'Usuário não encontrado. Verifique o email ou cadastre-se.' });
      }

      const ok = await bcrypt.compare(senha, user.senha);
      if (!ok) {
        return res.status(401).json({ erro: 'Senha incorreta. Tente novamente ou use "Mudar Senha".' });
      }

      const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: '1d' });
      return res.json({ token, userId: user.id });
    } catch (err) {
      console.error('Erro no login:', err.message || err);
      if (err.name === 'SequelizeDatabaseError' || (err.message && err.message.includes('SQLITE'))) {
        return res.status(500).json({ erro: 'Erro no banco de dados. Aguarde alguns segundos e tente novamente.' });
      }
      const mensagem = err.message && err.message.length < 120 ? err.message : 'Erro ao entrar. Tente novamente.';
      return res.status(500).json({ erro: mensagem });
    }
  },

  async updatePassword(req, res) {
    const { senha } = req.body;
    
    // Validar força da senha
    const erroSenha = validarForcaSenha(senha);
    if (erroSenha) {
      return res.status(400).json({ erro: erroSenha });
    }
    
    const usuario = await Usuario.findByPk(req.userId);
    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }
    
    const hash = await bcrypt.hash(senha, 8);
    usuario.senha = hash;
    await usuario.save();
    
    res.json({ sucesso: true });
  }
};
