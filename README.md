# PAI

PAI é um web app social com foco em conversas, grupos, jogos rápidos, ranking por patentes, moedas, diamantes, loja, inventário e clãs.

## Stack inicial

- React + Vite
- Supabase para autenticação, banco, realtime e storage
- GitHub Pages para publicação do frontend

## Identidade visual

- Fundo: `#0B1020`
- Azul neon: `#2563EB`
- Roxo neon: `#7C3AED`
- Ciano: `#06B6D4`

## Rodar localmente

```bash
npm install
npm run dev
```

## Supabase

Copie `.env.example` para `.env` e preencha:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Nunca coloque senha de administrador, service role key ou outro segredo no GitHub.

## Estado atual

Primeira base visual criada com:

- animação de entrada do PAI;
- identidade neon azul/roxo;
- lista de conversas;
- alternância Amigos/Grupos;
- patentes junto aos usuários;
- busca;
- moedas e diamantes no cabeçalho;
- barra inferior com Início, Jogos, Conversas, Ranking e Perfil;
- deploy preparado para GitHub Pages.

## Próximas etapas

1. Configurar Supabase.
2. Criar autenticação de usuário e owner.
3. Implementar login/cadastro.
4. Criar chat real e grupos.
5. Implementar perfil, ranking e 67 patentes.
6. Criar jogos, loja, inventário e clãs.
7. Criar painel administrativo protegido.
