# Evolução planejada

Os mecanismos abaixo são propostas e ainda não estão implementados.

## Atualizações portáteis

Destino: Releases de `kawanlemesgeourbano/janus`.

1. Consultar versão estável por HTTPS ao abrir, com intervalo mínimo e botão manual.
2. Comparar versões estruturadas e canais. Nunca ordenar nomes de arquivos para escolher a versão.
3. Baixar o pacote para uma pasta temporária e validar assinatura com chave pública incorporada ao Janus. SHA-256 detecta corrupção; a assinatura autentica o pacote.
4. Preparar a atualização para o próximo fechamento normal.
5. Um auxiliar compilado aguarda o encerramento real do processo, preserva `dados`, substitui somente arquivos distribuídos e mantém backup.
6. Restaurar a versão anterior se a primeira inicialização falhar. Falhas de conexão não impedem o uso local.

Chave privada fora do repositório e aplicativo, em segredo de publicação. A primeira versão com esse mecanismo precisa ser entregue manualmente. O atualizador de instaladores MSI/NSIS não será utilizado como se atualizasse um executável portátil.

## Plugins

Definir API estável: comandos, páginas, leitores e exportadores, preferências por plugin e acesso explícito ao projeto selecionado.

Manifesto com identificador, versão, compatibilidade, ponto de entrada e permissões. Validar pacotes, impedir caminhos fora da pasta do plugin e permitir desativação/remoção. Não expor processo nativo ou chaves de IA diretamente aos plugins.

Documentação para IA deve incluir API, limites, exemplos executáveis, modelo de pacote e validador. Código gerado exige validação e testes antes da instalação. Alterações no núcleo continuam sendo atualizações do Janus.
