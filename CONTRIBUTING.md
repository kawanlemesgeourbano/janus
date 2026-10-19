# Contribuir com o Janus

Repositório oficial: <https://github.com/kawanlemesgeourbano/janus>.

Para criar plugins, comece pelo [Guia para desenvolvedores e IA](docs/CRIAR-PLUGINS.md). Ele pode ser baixado como um único Markdown e enviado junto ao pedido para uma IA. O [guia de uso dos plugins](docs/PLUGINS.md) descreve instalação e operação.

## Contribuir pelo GitHub

1. Consulte as [Issues](https://github.com/kawanlemesgeourbano/janus/issues) para evitar trabalho duplicado. Para uma função nova, abra uma Issue com o problema, o resultado esperado, um exemplo fictício e os acessos necessários.
2. Faça um **Fork** do repositório para sua conta. Crie uma branch a partir de `main`, por exemplo `plugin/meu-recurso`.
3. Para documentação ou um JSON pequeno, é possível editar pelo próprio GitHub. Para TypeScript, Rust ou comportamento de interface, clone seu fork e valide localmente.
4. Faça as alterações e envie commits para seu fork. Na página do fork, use **Contribute → Open pull request**, com destino à branch `main` do repositório oficial.
5. Descreva o problema, o que mudou, como testar e quais limitações existem. Informe se usou uma IA e revise o resultado antes de enviar. O modelo de PR ajuda nessa descrição.
6. Aguarde revisão. A contribuição será publicada pelo responsável pelo projeto quando aprovada; abrir um PR não instala o plugin nos computadores dos usuários.

Você não precisa de acesso de escrita ao repositório oficial nem da chave de publicação para contribuir. Não envie alterações diretamente para `main` sem autorização do mantenedor.

## Preparar o ambiente

O uso do Janus é portátil. **A compilação**, por outro lado, exige ferramentas de desenvolvimento: Node.js com Web Crypto/Ed25519 (22 ou posterior), npm, Rust estável, toolchain MSVC no Windows, ferramentas de compilação C++ e Windows SDK, além do WebView2. O destino distribuído é Windows de 64 bits.

```sh
git clone https://github.com/SEU-USUARIO/janus.git
cd janus
git switch -c plugin/meu-recurso
npm ci
npm test
npm run build
```

Para conferir a interface no navegador: `npm run dev`. Funções nativas, atalhos globais, colagem em outros aplicativos, armazenamento portátil e conexão de IA precisam do aplicativo Windows: `npm run tauri dev`.

Para alterações no Rust, execute também:

```sh
cargo test --manifest-path src-tauri/Cargo.toml --release
npm run tauri build -- --no-bundle
```

O executável fica em `src-tauri/target/release/janus.exe`, salvo se você tiver configurado outro `CARGO_TARGET_DIR`. Faça testes em uma pasta isolada, com dados fictícios e atualização automática desativada. Não use a instalação de trabalho como bancada.

## Antes de abrir o PR

- Mantenha o escopo da contribuição claro. Para correções de documentação ou exemplos, valide links e JSON; não é necessário recompilar o aplicativo se o código não mudou.
- Para um layout, execute `node scripts/validate-plugin.mjs plugins/examples/meu-layout.json` e confira a importação pela interface.
- Para uma função nova, teste instalação, ativação, desativação, remoção, reabertura e troca de projeto. Desativar deve desfazer os efeitos sem apagar as escolhas; remover só pode apagar os dados do próprio plugin.
- Confira o painel clássico e, quando afetado, o circular; atalhos, foco, navegação por teclado, opacidade, sons e redução de movimento devem continuar funcionando.
- Inclua testes úteis para lógica nova e registre os comandos executados. Não declare que testou algo que não executou.
- Não publique `dados/`, `.janus-update/`, chaves, tokens, arquivos de clientes, PDFs, CSVs ou planilhas reais. Screenshots e exemplos devem usar projetos fictícios.
- Preserve `LICENSE-COUCOU`, licenças de fontes, créditos e avisos de terceiros. Identifique a origem e a licença de qualquer recurso novo. As marcas Janus e GI têm condições próprias em `LICENSE-ASSETS.md`.
- Não altere chaves de publicação, pacotes assinados, o feed de atualização ou versões de lançamento para fazer um PR comum. Assinatura, lançamento e publicação são tarefas do mantenedor.

## Como propor um tipo novo de plugin

Hoje não existe um carregador geral de código externo. O JSON importável só configura o layout circular; Fontes é um módulo opcional implementado no host. Consulte as duas rotas no [guia completo](docs/CRIAR-PLUGINS.md).

Uma função nova deve chegar como alteração revisável no código do Janus, com um contrato de dados definido, permissões mínimas, estado isolado, interface de ativação/desativação e validação correspondente. Não remova validadores para aceitar o pacote desejado e não crie carregamento por `eval`, scripts remotos ou execução de comandos arbitrários.
