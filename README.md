# Janus

Assistente portátil para Windows: consulta de divergências e parâmetros, atalhos globais, cópia e colagem, importação de PDF e conversa opcional com agentes de IA.

## Baixar Janus

[**⬇ Baixar Janus para Windows — portátil (.zip)**](https://github.com/kawanlemesgeourbano/janus/releases/download/v1.0a.2/Janus-Windows-portatil.zip)

Extraia o ZIP em uma pasta onde você possa salvar arquivos e abra **Janus.exe**. Sem instalador e sem execução como administrador. Windows de 64 bits com Microsoft Edge WebView2 disponível.

O programa começa sem projetos cadastrados. Quem usa 1.0a precisa fechar o Janus e substituir o executável uma vez, mantendo a pasta `dados`. Depois, o atualizador verifica novas versões ao abrir, baixa o pacote assinado e aplica ao fechar. Aguarde alguns segundos antes de abrir novamente.

[Detalhes do download e verificação SHA-256](https://github.com/kawanlemesgeourbano/janus/releases/tag/v1.0a.2). Esta é uma versão alpha.

## Menu circular · plugin opcional

<img src="docs/images/menu-circular.png" alt="Prévia do menu circular opcional do Janus" width="300">

No Janus, abra **Plugins+ → Menu circular → Baixar plugin → Ativar**. O menu circular e os seletores de cópia passam a usar setores ao redor do centro, com navegação por mouse e teclado.

Use **Plugins+ → Desativar** para voltar ao painel original, ou **Remover** para excluir o pacote. Trocar o projeto ativo não altera a ativação do plugin. O download é separado do executável e não é obrigatório.

[Conheça o plugin no GitHub](plugins/menu-circular/README.md) · [Formato e funcionamento](docs/PLUGINS.md)

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

O [atualizador portátil](docs/UPDATES.md) está disponível a partir de 1.0a.1. Configurações > Geral permite verificar agora ou desativar a busca automática. Plugins+ oferece o primeiro [plugin de interface opcional](docs/PLUGINS.md). Outros tipos de integração continuam em planejamento.

Base de código: Coucou, de Louis Raillé, sob MIT; aviso preservado em `LICENSE-COUCOU`. Consulte [os créditos](CREDITS.md) e [as condições dos recursos](LICENSE-ASSETS.md).

O download inclui os avisos de licença do código original, das fontes e das bibliotecas em `THIRD-PARTY-NOTICES.txt`. Retirar os recursos gráficos do Coucou não elimina a atribuição devida ao código que serviu de base.
