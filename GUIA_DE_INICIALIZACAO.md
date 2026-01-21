# Guia de Inicialização do Projeto Mesada Online

Este documento contém os comandos necessários para instalar as dependências e iniciar os serviços do projeto (Web e Mobile).

## 1. Pré-requisitos

Certifique-se de ter instalado em sua máquina:
- **Node.js** (versão LTS recomendada)
- **NPM** (geralmente vem com o Node.js)
- **Git**

Para testar o aplicativo mobile no seu celular:
- Instale o app **Expo Go** (disponível na App Store ou Google Play).

---

## 2. Projeto Web (Painel Administrativo)

O projeto web fica na raiz do repositório.

### Instalação das dependências
Abra um terminal na pasta raiz do projeto e execute:

```bash
npm install
```

### Iniciar o servidor de desenvolvimento
Para rodar a versão web localmente:

```bash
npm run dev
```
O servidor geralmente iniciará em `http://localhost:8080` (ou outra porta indicada no terminal).

---

## 3. Projeto Mobile (App React Native)

O código do aplicativo móvel está na pasta `mobile`.

### Instalação das dependências
Abra um **novo terminal**, navegue até a pasta `mobile` e instale as dependências:

```bash
cd mobile
npm install
```

### Iniciar o servidor Expo
Para iniciar o servidor de desenvolvimento do aplicativo:

```bash
npx expo start -c --tunnel
```
*(A opção `-c` limpa o cache, evitando problemas comuns de inicialização)*

### Como rodar no celular
1. Após rodar o comando acima, um QR Code aparecerá no terminal.
2. Abra o app **Expo Go** no seu celular.
3. Escaneie o QR Code (no Android) ou use a câmera (no iOS).
4. O app será carregado no seu dispositivo.

> **Nota:** Certifique-se de que seu celular e seu computador estejam conectados na mesma rede Wi-Fi.

---

## 4. Banco de Dados (Supabase)

O projeto utiliza o Supabase como backend.

### Atualizar o banco de dados
Caso você faça alterações nas migrations (arquivos SQL na pasta `supabase/migrations`), use o comando abaixo para aplicar as mudanças no banco de dados remoto:

```bash
npx supabase db push --include-all
```

Isso garantirá que as tabelas e funções do banco estejam sincronizadas com o código do projeto.
