# Evolução do Janus

## Atualizações portáteis

Implementadas na versão 1.0a.1. Consulte [funcionamento, assinatura, recuperação e publicação](UPDATES.md).

## Plugins

O primeiro formato já permite instalar, ativar, desativar e remover um plugin declarativo de interface. Consulte [o funcionamento e o formato aceito](PLUGINS.md). A expansão abaixo continua planejada.

Definir API estável: comandos, páginas, leitores e exportadores, preferências por plugin e acesso explícito ao projeto selecionado.

Manifesto com identificador, versão, compatibilidade, ponto de entrada e permissões. Validar pacotes, impedir caminhos fora da pasta do plugin e permitir desativação/remoção. Não expor processo nativo ou chaves de IA diretamente aos plugins.

Documentação para IA deve incluir API, limites, exemplos executáveis, modelo de pacote e validador. Código gerado exige validação e testes antes da instalação. Alterações no núcleo continuam sendo atualizações do Janus.
