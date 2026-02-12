<template>
  <div class="login">
    <h2>Login</h2>
    <p class="hint">Use o sistema de controle de doces em consignação.</p>
    <p v-if="isUsingCloudApi()" class="hint-cloud">Usando dados da nuvem — use o mesmo email e senha do site na web.</p>

    <div class="form">
      <input v-model="email" type="email" placeholder="Email" />
      <input v-model="senha" type="password" placeholder="Senha" />
      <button @click="login" :disabled="loading">Entrar</button>
    </div>

    <p v-if="erro" class="erro">{{ erro }}</p>
    <p v-if="sucesso" class="sucesso">{{ sucesso }}</p>

    <p class="cadastro">
      Primeira vez? <a href="#" @click.prevent="mostrarCadastro = true">Cadastrar</a>
      <template v-if="erro && erro.includes('Mudar Senha')">
        &nbsp;&middot;&nbsp;
        <a href="#" @click.prevent="mostrarMudancaSenha = true">Mudar Senha</a>
      </template>
    </p>

    <div v-if="mostrarCadastro" class="cadastro-form">
      <h3>Cadastrar usuário</h3>
      <input v-model="nome" placeholder="Nome" />
      <input v-model="emailCadastro" type="email" placeholder="Email" />
      <input v-model="senhaCadastro" type="password" placeholder="Senha" />
      <button @click="cadastrar" :disabled="loading">Cadastrar</button>
      <button class="sec" @click="mostrarCadastro = false">Voltar</button>
    </div>

    <div v-if="mostrarMudancaSenha" class="mudar-senha-form">
      <h3>Mudar Senha</h3>
      <input v-model="novaSenha" type="password" placeholder="Nova senha" />
      <input v-model="confirmarNovaSenha" type="password" placeholder="Confirmar nova senha" />
      <button @click="mudarSenha" :disabled="loading">Alterar Senha</button>
      <button class="sec" @click="mostrarMudancaSenha = false">Voltar</button>
    </div>
  </div>
</template>

<script setup>
import api, { apiAuth, isUsingCloudApi } from '../services/api';
import { ref } from 'vue';

const emit = defineEmits(['entrou']);

function mensagemAmigavel(msg) {
  if (!msg || typeof msg !== 'string') return 'Erro inesperado. Recarregue a página e tente novamente.';
  if (/is not a function|não é uma função|undefined is not/i.test(msg)) return 'Erro interno. Recarregue a página (F5) e tente novamente.';
  if (msg.length > 120) return 'Erro inesperado. Recarregue a página e tente novamente.';
  return msg;
}

const email = ref('');
const senha = ref('');
const loading = ref(false);
const erro = ref('');
const sucesso = ref('');
const mostrarCadastro = ref(false);
const nome = ref('');
const emailCadastro = ref('');
const senhaCadastro = ref('');
const mostrarMudancaSenha = ref(false);
const novaSenha = ref('');
const confirmarNovaSenha = ref('');

async function login() {
  erro.value = '';
  sucesso.value = '';
  if (!email.value || !senha.value) {
    erro.value = 'Preencha email e senha';
    return;
  }
  loading.value = true;
  try {
    const res = await apiAuth.post('/login', {
      email: email.value,
      senha: senha.value
    });
    localStorage.setItem('token', res.data.token || 'ok');
    emit('entrou');
  } catch (e) {
    const data = e.response?.data;
    let errorMsg = null;
    if (data && typeof data === 'object') {
      errorMsg = data.erro || data.message || data.error || (data.detalhe ? String(data.detalhe) : null);
    } else if (data && typeof data === 'string') {
      errorMsg = data;
    }
    if (!errorMsg) {
      if (e.response) {
        errorMsg = `Servidor respondeu ${e.response.status}. Tente novamente.`;
      } else if (e.request) {
        errorMsg = isUsingCloudApi()
          ? 'Sem conexão com a nuvem. Verifique a internet e se o site na web abre em outra aba.'
          : 'Sem conexão com o servidor. Verifique a internet.';
      } else {
        errorMsg = mensagemAmigavel(e.message);
      }
    }
    const senhaFraca = data?.senhaFraca;
    const textoFinal = mensagemAmigavel(errorMsg);
    if (senhaFraca) {
      erro.value = `${textoFinal} - Clique em "Mudar Senha" para fortalecê-la.`;
    } else {
      erro.value = textoFinal;
    }
    console.error('Login falhou:', e.response?.status, e.response?.data, e.message, e);
  } finally {
    loading.value = false;
  }
}

async function cadastrar() {
  erro.value = '';
  sucesso.value = '';
  if (!nome.value || !emailCadastro.value || !senhaCadastro.value) {
    erro.value = 'Preencha todos os campos';
    return;
  }
  loading.value = true;
  try {
    await apiAuth.post('/register', {
      nome: nome.value,
      email: emailCadastro.value,
      senha: senhaCadastro.value
    });
    email.value = emailCadastro.value;
    senha.value = senhaCadastro.value;
    mostrarCadastro.value = false;
    erro.value = '';
    sucesso.value = 'Cadastro feito. Clique em Entrar para acessar.';
  } catch (e) {
    // Mostrar sempre a mensagem que o servidor enviou; se não tiver, explicar o que deu
    const data = e.response?.data;
    let msg = null;
    if (data && typeof data === 'object') {
      msg = data.erro || data.message || data.error || (data.detalhe ? String(data.detalhe) : null);
    } else if (data && typeof data === 'string') {
      msg = data;
    }
    if (!msg) {
      if (e.response) {
        msg = `Servidor respondeu ${e.response.status}. Tente novamente.`;
      } else if (e.request) {
        msg = 'Sem conexão com o servidor. Verifique a internet ou se o app está no ar.';
      } else {
        msg = mensagemAmigavel(e.message);
      }
    }
    erro.value = mensagemAmigavel(msg);
    console.error('Cadastro falhou:', e.response?.status, e.response?.data, e.message, e);
  } finally {
    loading.value = false;
  }
}

async function mudarSenha() {
  erro.value = '';
  if (!novaSenha.value || !confirmarNovaSenha.value) {
    erro.value = 'Preencha todos os campos';
    return;
  }
  if (novaSenha.value !== confirmarNovaSenha.value) {
    erro.value = 'As senhas não coincidem';
    return;
  }
  
  loading.value = true;
  try {
    // Atualizar a senha do usuário
    await apiAuth.put('/usuarios/senha', {
      senha: novaSenha.value
    });
    
    mostrarMudancaSenha.value = false;
    erro.value = 'Senha alterada com sucesso!';
    
    // Limpar os campos de mudança de senha
    novaSenha.value = '';
    confirmarNovaSenha.value = '';
  } catch (e) {
    const msg = e.response?.data?.erro || e.response?.data?.message || 'Erro ao alterar senha';
    erro.value = mensagemAmigavel(msg);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login {
  max-width: 360px;
  margin: 60px auto;
  padding: 24px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
}
h2 { margin-top: 0; color: #2d5a27; }
.hint { color: #666; font-size: 14px; margin-bottom: 20px; }
.hint-cloud { color: #1565c0; font-size: 13px; margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; }
.form { display: flex; flex-direction: column; gap: 12px; }
.form input {
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 16px;
}
.form button {
  padding: 12px;
  background: #2d5a27;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
}
.form button:disabled { opacity: 0.7; cursor: not-allowed; }
.erro { color: #c00; font-size: 14px; margin-top: 12px; }
.cadastro { margin-top: 16px; font-size: 14px; }
.cadastro a { color: #2d5a27; }
.cadastro-form {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.mudar-senha-form {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cadastro-form h3 { margin: 0 0 8px 0; font-size: 16px; }
.cadastro-form input { padding: 8px 12px; border: 1px solid #ccc; border-radius: 6px; }
.cadastro-form button.sec { background: #666; }
</style>
