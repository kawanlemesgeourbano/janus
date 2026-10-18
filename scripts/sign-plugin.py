"""Sign an official declarative layout package, keeping the private key outside Git."""
import argparse,json
from pathlib import Path
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding,PublicFormat
from publisher_crypto import dpapi
parser=argparse.ArgumentParser();parser.add_argument('--key-file',type=Path,required=True);parser.add_argument('--source',type=Path,required=True);parser.add_argument('--output',type=Path,required=True);args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
if args.key_file.resolve().is_relative_to(root):raise SystemExit('Private key must remain outside the repository')
key=Ed25519PrivateKey.from_private_bytes(dpapi(args.key_file.read_bytes(),False))
if key.public_key().public_bytes(Encoding.Raw,PublicFormat.Raw).hex()!=(root/'src-tauri/updater-public-key.hex').read_text().strip():raise SystemExit('Signing key mismatch')
payload=(json.dumps(json.loads(args.source.read_text(encoding='utf-8')),ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n').encode()
envelope={'payload':payload.hex(),'signature':key.sign(payload).hex()}
args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(envelope,separators=(',',':'))+'\n',encoding='ascii')
print('Signed plugin:',args.output.name)
