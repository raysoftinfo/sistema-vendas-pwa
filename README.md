# Controle de Doces

Sistema de controle de doces em consignação: fornecedores, produtos, vendas e comissão automática.

## O que o sistema faz

- **Fornecedores**: cadastro com percentual de comissão
- **Produtos**: cadastro vinculado ao fornecedor e preço de venda
- **Vendas**: registro de venda por produto e quantidade; cálculo automático do total e da comissão
- **Acertos**: total vendido e sua comissão por fornecedor; botão "Marcar como recebido"
- **Login**: cadastro e login de usuário (JWT)

A comissão é **sua**: você vende para o fornecedor e recebe o percentual configurado sobre as vendas.

## Como rodar (mais fácil)

### Opção 1 – Duplo clique (recomendado)

1. Na pasta do projeto, dê **dois cliques** em:
   - **`ABRIR-CONTROLE-DOCES.bat`**
2. Vai abrir uma **janela preta** (servidor) e o **navegador** em http://localhost:3000.
3. **Não feche a janela preta** enquanto estiver usando o sistema.

### Opção 2 – Pelo terminal

1. Abra o **Prompt de Comando** ou **PowerShell**.
2. Digite:
   ```bash
   cd d:\xampp\htdocs\controle-doces\backend
   npm install
   node server.js
   ```
3. Deixe essa janela aberta e acesse no navegador: **http://localhost:3000**

(Crie o arquivo `.env` na pasta `backend` se ainda não existir.)

### Importante

- Use **sempre** a porta **3000** (http://localhost:3000). A porta 5173 não é mais usada.
- Se aparecer "conexão recusada", o servidor não está rodando: execute o `.bat` de novo ou rode `node server.js` na pasta `backend` e **não feche a janela**.

### 3. Primeiro uso

1. Na tela de Login, clique em **Cadastrar** e crie um usuário (nome, email, senha).
2. Depois faça login com esse email e senha.
3. Cadastre um **Fornecedor** (nome e % comissão).
4. Cadastre **Produtos** (nome, preço, fornecedor).
5. Em **Vendas**, registre vendas; a comissão é atualizada automaticamente.
6. No **Dashboard**, veja os acertos e use "Marcar como recebido" quando receber a comissão.

## Estrutura

```
controle-doces/
├── backend/          # API Node.js + Express + Sequelize + SQLite
│   ├── src/
│   │   ├── controllers/
│   │   ├── database/models/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── app.js
│   ├── server.js
│   └── package.json
├── frontend/         # Vue 3 + Vite + PWA
│   ├── src/
│   │   ├── views/
│   │   ├── services/
│   │   ├── App.vue
│   │   └── main.js
│   └── package.json
└── GUIA.md
```

## Modo híbrido (online + offline)

O app funciona **online e offline**:
- **Online:** leitura e escrita normais; as respostas de leitura (produtos, clientes, vendas, etc.) são guardadas em cache local.
- **Offline:** você pode consultar os dados em cache e **registrar vendas** (e outras alterações); elas entram numa fila e são enviadas automaticamente quando a conexão voltar.
- Ao reconectar, aparece "Sincronizando..." e as telas atualizam sozinhas após a sincronização.

## PWA (app instalável)

O frontend está configurado como PWA. Para ícones personalizados, coloque em `frontend/public/`:

- `icon-192.png` (192x192)
- `icon-512.png` (512x512)

Depois, no celular ou no navegador, use "Adicionar à tela inicial" / "Instalar app".

## Produção – acessar de qualquer lugar

Para usar o sistema na nuvem (PC, celular, qualquer rede) com HTTPS e URL fixa, siga o guia **[DEPLOY.md](DEPLOY.md)**. Ele explica como subir o app no **Railway** ou **Render** em poucos passos.

- **Backend**: use variáveis de ambiente reais (`JWT_SECRET` forte; na nuvem, `PORT` é definido pelo provedor).
- **Banco**: SQLite já funciona; para dados permanentes na nuvem, use um Volume (Railway) ou defina `DATABASE_PATH`.

Projeto criado conforme o **GUIA.md**.
