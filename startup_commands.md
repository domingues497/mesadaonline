# Comandos de Inicialização do Projeto

Este documento lista os comandos necessários para iniciar os serviços e servidores do projeto Mesada Online.

## 1. Banco de Dados e Backend (Supabase)

O projeto utiliza Supabase localmente para banco de dados e funções.

Para iniciar o Supabase:

```bash
supabase start
```

Para parar o Supabase:

```bash
supabase stop
```

## 2. Servidor Web (Dashboard Administrativo / Landing Page)

O projeto possui uma interface web (React + Vite) na raiz do repositório.

Para iniciar o servidor de desenvolvimento web:

```bash
# Na raiz do projeto (c:\projetos\projeto_lovable\mesadaonline-main)
npm run dev
```

O servidor geralmente inicia em `http://localhost:8080` ou porta similar indicada no terminal.

## 3. Aplicativo Móvel (Expo / React Native)

O aplicativo móvel está na pasta `mobile`.

Para iniciar o servidor de desenvolvimento do Expo:

```bash
# Navegue para a pasta mobile
cd mobile

# Inicie o servidor (com limpeza de cache recomendada)
npx expo start --clear --tunnel
```

Ou simplesmente:

```bash
cd mobile
npx expo start
```

### Opções do Expo:
- Pressione `a` para abrir no emulador Android (se configurado/aberto).
- Pressione `w` para abrir no navegador web.
- Digitalize o QR Code com o aplicativo Expo Go no seu celular (Android/iOS) para testar no dispositivo físico.

## Resumo de Sequência Recomendada

1. Abra um terminal e rode `supabase start`.
2. Abra um segundo terminal e rode `npm run dev` (se for trabalhar no web).
3. Abra um terceiro terminal, entre em `cd mobile` e rode `npx expo start`.
