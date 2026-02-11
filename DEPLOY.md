# Colocar o sistema online (acessar de qualquer lugar)

Para usar o **Controle de Doces** de forma profissional (PC, celular, qualquer rede), é preciso subir o sistema para um servidor na nuvem. Assim você acessa por uma URL (ex.: `https://controle-doces.up.railway.app`) com HTTPS.

---

## O que você precisa

1. **Conta** em um provedor de nuvem (Railway ou Render – ambos têm plano gratuito).
2. **Projeto no GitHub** (recomendado) com o código do `controle-doces`, ou fazer deploy manual.

O servidor na nuvem vai rodar o **backend** (Node.js) e servir o **frontend** (Vue) que já está na pasta `frontend/dist`. Tudo em um único app.

---

## Opção 1 – Railway (recomendado)

1. **Crie uma conta** em [railway.app](https://railway.app) (pode usar Google/GitHub).

2. **Novo projeto**  
   - “New Project” → “Deploy from GitHub repo” (conecte o GitHub e escolha o repositório do `controle-doces`).  
   - Ou “Empty Project” e depois “Deploy from GitHub” ou upload do código.

3. **Configuração do serviço**  
   - **Root Directory:** deixe em branco (raiz do repositório).  
   - **Build Command:**  
     ```bash
     cd frontend && npm ci && npm run build && cd ../backend && npm ci
     ```  
   - **Start Command:**  
     ```bash
     node backend/server.js
     ```  
   - **Watch Paths:** pode deixar em branco.

4. **Variáveis de ambiente** (Settings → Variables):  
   - `JWT_SECRET` = uma frase longa e aleatória (ex.: `minhaChaveSecretaMuitoForte2024`).  
   - Não é obrigatório definir `PORT`; o Railway define automaticamente.

5. **Banco de dados**  
   - Por padrão o SQLite usa o arquivo `backend/database.sqlite`.  
   - No plano gratuito o disco pode ser efêmero (dados podem ser apagados ao redeployar).  
   - Para **produção com dados permanentes**:  
     - Crie um **Volume** no Railway e monte em um caminho (ex.: `/data`).  
     - Defina a variável: `DATABASE_PATH=/data/database.sqlite`.

6. **Deploy**  
   - Após o primeiro deploy, o Railway gera uma URL pública (ex.: `https://controle-doces-production.up.railway.app`).  
   - Use essa URL no PC e no celular; tudo sincronizado (mesmo backend, mesmo banco).

7. **Primeiro acesso**  
   - Abra a URL no navegador → tela de login.  
   - Cadastre um usuário e use o sistema normalmente.  
   - No celular: abra a mesma URL e use “Adicionar à tela inicial” para instalar como app (PWA).

---

## Opção 2 – Render

1. **Conta** em [render.com](https://render.com).

2. **New → Web Service** → conecte o repositório do GitHub (repositório do `controle-doces`).

3. **Configuração:**  
   - **Root Directory:** em branco.  
   - **Build Command:**  
     ```bash
     cd frontend && npm ci && npm run build && cd ../backend && npm ci
     ```  
   - **Start Command:**  
     ```bash
     node backend/server.js
     ```  
   - **Instance Type:** Free (se disponível).

4. **Environment:**  
   - Adicione `JWT_SECRET` com um valor forte e aleatório.

5. **Deploy**  
   - Após o deploy, Render fornece uma URL como `https://controle-doces.onrender.com`.  
   - Use essa URL em qualquer lugar (PC e celular).

**Observação:** no plano gratuito do Render o servidor “dorme” após um tempo sem acesso; o primeiro acesso pode demorar alguns segundos.

---

## Resumo

| Onde roda      | Acesso                          |
|----------------|----------------------------------|
| Só no seu PC   | `http://localhost:3333` ou `http://IP_DO_PC:3333` na sua rede |
| Na nuvem       | `https://sua-url.railway.app` ou `.onrender.com` de qualquer lugar |

Depois que estiver na nuvem, você pode ainda:

- **Domínio próprio:** no painel do Railway/Render, configure um domínio (ex.: `app.controledoces.com`) apontando para o serviço.
- **HTTPS:** já vem ativo nas URLs que eles fornecem.
- **PWA no celular:** abrir a URL no celular e usar “Adicionar à tela inicial” para usar como app.

Se quiser, na próxima etapa dá para detalhar só Railway ou só Render no seu repositório (por exemplo com arquivos de configuração prontos para cada um).
