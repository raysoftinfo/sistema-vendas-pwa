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
      const { nome, email, senha } = req.body;
      
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
      if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ erro: 'Email já cadastrado' });
      }
      res.status(500).json({ erro: 'Erro ao cadastrar' });
    }
  },

  async login(req, res) {
    const { email, senha } = req.body;

    const user = await Usuario.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ erro: 'Usuário não encontrado' });
    }

    // Somente se o usuário existir, verificar se a senha é fraca
    const erroSenha = validarForcaSenha(senha);
    if (erroSenha && senha) {
      return res.status(400).json({ erro: erroSenha, senhaFraca: true });
    }

    const ok = await bcrypt.compare(senha, user.senha);
    if (!ok) {
      return res.status(401).json({ erro: 'Senha inválida' });
    }

    const token = jwt.sign({ id: user.id }, SECRET, { expiresIn: '1d' });

    res.json({ token, userId: user.id });
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
