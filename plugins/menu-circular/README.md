# Menu circular

Plugin opcional de interface para o Janus, inspirado em um menu em leque. Oferece acessos a divergências, parâmetros, Plugins+, agente IA e configurações. Os seletores de cópia também passam a usar setores circulares, com o texto completo no centro e paginação para muitas opções.

<img src="../../docs/images/menu-circular.png" alt="Prévia do menu circular" width="300">

No Janus com suporte a plugins, abra **Plugins+ → Menu circular → Baixar plugin → Ativar**. Para voltar ao painel original, use **Plugins+ → Desativar**. Remover o plugin não remove projetos.

O estado de ativação é independente do projeto. A apresentação dos textos e parâmetros continua sendo responsabilidade do Janus: este plugin não recebe APIs de leitura ou escrita de projetos, acesso à rede, arquivos, chaves de IA ou execução de código.

`plugin.json` é a descrição editável. `menu-circular.janus-plugin.json` é o pacote assinado distribuído. O Janus verifica a assinatura antes de instalar. O host fornece o renderizador e aceita somente as ações e cores declaradas nesse formato; este primeiro formato não carrega JavaScript ou CSS arbitrário.

Não há seleção de versões na interface do plugin. O campo técnico `schema` identifica o formato de dados aceito pelo host.

Personagem, animações e sons continuam sendo os próprios do Janus. A imagem de referência não é incorporada ao plugin.
