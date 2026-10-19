# Plugins opcionais

Plugins+ oferece download, ativação, desativação e remoção. Nenhum plugin é instalado automaticamente com o Janus. A escolha é salva separadamente dos projetos em `dados/plugins` e continua igual ao trocar de projeto. Não há seleção de versões na interface.

## Primeiro plugin: Menu circular

Abre um menu em leque com divergências, parâmetros, Plugins+, agente IA e configurações. O Janus continua desenhando seu próprio personagem e logo. Todas as funções permanecem no modo circular. O centro se amplia para listas, parâmetros, Plugins+, chat e configurações; o botão Menu circular retorna ao início. Ao abrir uma função, os demais setores desaparecem.

- **Ctrl + Shift + D:** abrir/recolher o menu circular.
- **1 a 5, com o menu em foco:** abrir uma das cinco funções.
- **Ctrl + Shift + número:** abrir o seletor circular da categoria de divergência; repetir fecha, outra categoria substitui a seleção.
- **Setas:** navegar. **Enter:** copiar/colar a seleção. **Esc:** voltar.
- **Home/End e Page Up/Page Down:** navegar pelas opções e páginas. Categorias com muitas opções usam páginas de até cinco setores.
- O centro exibe o texto completo, com rolagem quando necessário, e permite mostrar/ocultar a orientação.

O modo C/V e as categorias continuam vindo do Janus. O plugin muda sua apresentação e não modifica os textos ou os critérios. A janela usa uma região nativa no Windows para que os espaços fora dos setores não bloqueiem o programa atrás dela. A área central vazia permite arrastar o menu.

## Formato aceito nesta implementação

Este primeiro formato é **declarativo**, para apresentação da interface. Não carrega JavaScript, CSS arbitrário, comandos nativos ou código baixado. Outros tipos de plugin precisam de novas APIs antes de serem suportados.

O arquivo [plugin.json](../plugins/menu-circular/plugin.json) define nome, descrição, paleta e as cinco ações conhecidas pelo host. A única permissão é `interface.layout`. Não há APIs de rede, arquivos, chaves de IA, leitura ou escrita de projetos disponíveis para o pacote. O host usa seus próprios dados para apresentar as contagens e as opções que o usuário está consultando.

O pacote distribuído é um JSON com `payload` em hexadecimal e `signature` Ed25519. O host valida a assinatura, o tamanho e o esquema antes de gravar e a cada inicialização. O assinador é `scripts/sign-plugin.py`; a chave privada deve permanecer fora do repositório. A chave pública é a mesma identidade de publicação do Janus.

```sh
python scripts/sign-plugin.py --key-file CAMINHO_PRIVADO --source plugins/menu-circular/plugin.json --output plugins/menu-circular/menu-circular.janus-plugin.json
```

Publique o pacote assinado no caminho do catálogo oficial somente depois de testar seu conteúdo no host. Os testes rejeitam permissões extras, cores fora do formato hexadecimal, ações desconhecidas, pacotes alterados e geometrias inválidas.


### Comportamento do menu

- O centro tem movimento sutil. Os setores surgem suavemente ao passar o mouse pelo círculo recolhido; recolhem após sair, mesmo com o alfinete ativo. A preferência de redução de movimento do Windows é respeitada.
- O alfinete mantém o Janus sobre outras janelas. Em **Configurações → Janela → Posição habitual**, escolha um canto; ao fixar, o menu respeita esse canto. Nos cantos da esquerda, os setores abrem para a direita.
- **×** encerra; o alfinete abaixo do logo fixa sobre as outras janelas. **Ctrl + Shift + D** continua abrindo/recolhendo o círculo.
- Todas as páginas ficam no círculo ampliado, com rolagem no conteúdo e uma única cabeça do assistente. Trocar de função não desativa o plugin.
- Quem já instalou o Menu circular recebe os ajustes de apresentação ao atualizar o Janus; não precisa reinstalar o pacote do plugin.
