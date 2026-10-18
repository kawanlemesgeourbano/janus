# Atualizações portáteis

Implementado a partir do Janus **1.0a.1** (`1.0.1-alpha.1`). Quem usa 1.0a precisa substituir o executável manualmente uma vez, preservando a pasta `dados`.

## Para quem usa

O Janus consulta o manifesto público ao abrir, com intervalo mínimo de seis horas. Configurações > Geral > Atualizações oferece **Verificar agora** e um controle para desativar a busca automática. Sem conexão, continua funcionando localmente.

O pacote é baixado e validado enquanto o aplicativo está aberto. Ao fechar normalmente, um auxiliar compilado aguarda o encerramento real do processo e troca apenas os sete arquivos distribuídos. Não há instalador, elevação de privilégios, execução de scripts baixados ou alteração da pasta `dados`. Aguarde alguns segundos antes de abrir novamente.

O auxiliar é uma cópia do próprio executável em `.janus-update/JanusUpdater.exe`, iniciada em modo de manutenção antes de qualquer inicialização de interface ou IA. Não existe um segundo instalador a manter.

Os arquivos anteriores ficam em `.janus-update/backup`. Após a troca, o auxiliar inicia a nova versão com janela oculta e aguarda a confirmação da interface: se o processo falhar ou não confirmar em 90 segundos, restaura a versão anterior. Essa verificação não registra atalhos, não consulta agentes de IA nem salva preferências. O Janus permanece fechado ao terminar; na próxima abertura você usa a versão validada. Uma transação interrompida é recuperada na próxima abertura. Migrações irreversíveis de preferências não são suportadas por esse mecanismo; precisam de planejamento próprio antes de serem introduzidas.

## Autenticidade

Uma versão que falhou fica registrada e não é oferecida repetidamente. Uma publicação corrigida deve ter um número de versão maior.

O manifesto e sua assinatura estão em `updates/latest.json` e `updates/latest.json.sig` no ramo `main`. O manifesto assinado contém versão semântica, endereço, tamanho e SHA-256 do ZIP. A chave pública Ed25519 está incorporada ao executável. Alterar os arquivos no GitHub sem a chave privada não produz uma atualização aceita.

O auxiliar verifica novamente a assinatura e o pacote antes de instalar. Somente os sete nomes permitidos são aceitos; duplicações, caminhos, links e tamanhos excessivos são rejeitados. A assinatura do protocolo de atualização é diferente de uma assinatura Authenticode do executável Windows.

## Publicar uma próxima versão

1. Ajustar versões em `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json` e os textos da interface. Manter a mesma chave pública para que versões já instaladas aceitem o pacote.
2. Executar os testes JavaScript e Rust. Compilar com `npm run tauri build -- --no-bundle` e atualizar os avisos com `python scripts/third-party-notices.py`.
3. Criar o ZIP com `python scripts/package-portable.py --exe src-tauri/target/release/janus.exe --output CAMINHO_DE_SAIDA`.
4. Assinar com `python scripts/sign-update.py --key-file CAMINHO_PRIVADO --package CAMINHO_DO_ZIP --version VERSAO_SEMANTICA --url URL_DO_ZIP_NA_RELEASE --output updates/latest.json`.
5. Criar a release e enviar o ZIP e o SHA-256. Conferir o download público. Só então publicar os dois arquivos do manifesto juntos em um commit no `main`.

O assinador usa Python `cryptography`. A chave privada é protegida com Windows DPAPI, fora do repositório, dos pacotes e das preferências. Somente a conta Windows que a criou consegue abrir o arquivo protegido. Proteja essa conta e planeje uma cópia de recuperação segura antes de trocar de computador; copiar apenas o arquivo DPAPI para outro Windows não basta. Nunca publique a chave privada nem substitua a chave pública de versões existentes sem um plano de transição.

Atualizações usam HTTPS e não enviam projetos, nomes de usuário ou credenciais de IA. Verificação e download podem falhar por políticas de rede ou gravação do ambiente corporativo; nesse caso, a atualização manual continua disponível.
