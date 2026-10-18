# Janus

Assistente portátil para Windows: consulta de divergências e parâmetros, atalhos globais, cópia e colagem, importação de PDF e conversa opcional com agentes de IA.

## Dados dos projetos

Esta distribuição começa vazia. Não inclui projetos, critérios de contratos, documentos de clientes nem credenciais. Use **+** para cadastrar um projeto ou importar seu PDF. Revise os textos e orientações extraídos antes de utilizá-los.

Projetos e preferências ficam localmente em `dados/preferencias.json`, ao lado do executável. Essa pasta não deve ser publicada. Chaves de IA ficam no Gerenciador de Credenciais do Windows. O envio de contexto ao provedor é opcional no chat.

## Desenvolvimento

Pré-requisitos de desenvolvimento: Node.js LTS, Rust estável e ferramentas de compilação do Tauri para Windows.

```sh
npm ci
npm test
npm run build
npm run tauri build -- --no-bundle
```

O executável fica em `src-tauri/target/release/janus.exe`. Distribua somente o executável e os avisos de licença, sem preferências de testes. O usuário não precisa de instalador nem privilégios de administrador para uso normal em uma pasta gravável. WebView2 precisa estar disponível no Windows.

## Recursos e evolução

Personagem geométrico próprio em `src/avatar.ts`, sons sintetizados em `src/core/sound.ts`. Os recursos restritos do Coucou não estão incluídos. Logos Janus e GI fornecidas pelo responsável pelo projeto. Fontes com licenças em `public/fonts`.

Atualização automática e carregamento de plugins **ainda não estão implementados**. Consulte [o plano de integração](docs/ROADMAP.md). Plugins+ é uma área reservada.

Base de código: Coucou, de Louis Raillé, sob MIT; aviso preservado em `LICENSE-COUCOU`. Consulte [os créditos](CREDITS.md) e [as condições dos recursos](LICENSE-ASSETS.md).
