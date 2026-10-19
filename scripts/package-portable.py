"""Create a portable ZIP from an explicit executable, never from a build directory."""
import argparse,hashlib,json,zipfile
from pathlib import Path
parser=argparse.ArgumentParser()
parser.add_argument('--exe',type=Path,required=True)
parser.add_argument('--output',type=Path,required=True)
args=parser.parse_args();root=Path(__file__).resolve().parents[1]
version=json.loads((root/'package.json').read_text())['version']
if not args.exe.read_bytes().startswith(b'MZ'):raise SystemExit('Expected Windows executable')
args.output.mkdir(parents=True,exist_ok=True)
archive=args.output/'Janus-Windows-portatil.zip'
instructions=f'''Janus {version} — Windows 64 bits — versão alpha

Extraia este ZIP em uma pasta gravável e abra Janus.exe.
Não precisa de instalador ou privilégios de administrador. WebView2 precisa
estar disponível no Windows. O programa começa sem projetos cadastrados.

Para instalar pela primeira vez o atualizador: feche sua versão antiga e
substitua Janus.exe e os avisos de licença. Preserve sua pasta dados.

Atualizações seguintes: o Janus verifica o GitHub ao abrir, no máximo a
cada seis horas, baixa o pacote assinado e o aplica ao fechar normalmente.
Aguarde alguns segundos depois de fechar antes de abrir novamente.
Configurações > Geral permite verificar manualmente ou desativar a busca.
Quando o pacote estiver pronto, Atualizar e reabrir aplica a atualização e
abre o Janus automaticamente após a verificação. Fechar normalmente também
continua aplicando o pacote sem reabrir.
Uma verificação oculta valida a nova interface, sem consultar IA nem salvar
preferências. Se a inicialização não for confirmada em até 90 segundos, o
auxiliar restaura a versão anterior. O backup não inclui migrações de dados;
esta versão não migra o formato dos projetos.

Projetos: dados/preferencias.json. Chaves de IA: Credenciais do Windows.
Atualizações: .janus-update. Não distribua essas pastas com o aplicativo.
Plugins+ oferece Menu circular e Fontes como downloads opcionais.
Fontes adiciona uma aba nas configurações para título, subtítulo e texto.
Os arquivos TTF/OTF/WOFF/WOFF2 ficam nos dados locais, sem instalar no Windows.
Desativar preserva as escolhas; remover apaga apenas os dados desse plugin.

Código, versões e licenças: https://github.com/kawanlemesgeourbano/janus
'''
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as zip:
 zip.write(args.exe,'Janus.exe')
 for name in ['CREDITS.md','LICENSE-ASSETS.md','LICENSE-COUCOU','LICENSE-FONTS.txt','THIRD-PARTY-NOTICES.txt']:zip.write(root/name,name)
 zip.writestr('LEIA-ME.txt',instructions)
with zipfile.ZipFile(archive) as zip:
 assert zip.testzip() is None
 assert len(zip.namelist())==7
(args.output/'Janus-SHA256.txt').write_text(f'{hashlib.sha256(archive.read_bytes()).hexdigest()}  {archive.name}\n{hashlib.sha256(args.exe.read_bytes()).hexdigest()}  Janus.exe\n',encoding='ascii')
print('Portable package:',archive.name,archive.stat().st_size,'bytes')
