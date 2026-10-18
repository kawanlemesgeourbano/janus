"""Publisher-only Ed25519 signing. Private key is protected by Windows DPAPI.

Never put --key-file inside the repository or a release package.
Requires Python cryptography. There is no private signing key in the application.
"""
import argparse, ctypes, hashlib, json, os
from pathlib import Path
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PrivateFormat, PublicFormat, NoEncryption

class Blob(ctypes.Structure):
    _fields_=[('length',ctypes.c_uint32),('data',ctypes.POINTER(ctypes.c_ubyte))]

def dpapi(data, encrypt):
    if os.name!='nt': raise RuntimeError('The publishing key uses Windows DPAPI')
    buffer=(ctypes.c_ubyte*len(data)).from_buffer_copy(data)
    source=Blob(len(data),buffer);target=Blob()
    crypto=ctypes.WinDLL('crypt32',use_last_error=True)
    if encrypt:
        ok=crypto.CryptProtectData(ctypes.byref(source),None,None,None,None,1,ctypes.byref(target))
    else:
        ok=crypto.CryptUnprotectData(ctypes.byref(source),None,None,None,None,1,ctypes.byref(target))
    if not ok: raise ctypes.WinError(ctypes.get_last_error())
    try: return ctypes.string_at(target.data,target.length)
    finally:
        kernel=ctypes.WinDLL('kernel32');kernel.LocalFree.argtypes=[ctypes.c_void_p]
        kernel.LocalFree(target.data)

parser=argparse.ArgumentParser()
parser.add_argument('--key-file',required=True,type=Path)
parser.add_argument('--init',action='store_true')
parser.add_argument('--package',type=Path)
parser.add_argument('--version')
parser.add_argument('--url')
parser.add_argument('--output',type=Path)
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
key_path=args.key_file.resolve()
if key_path.is_relative_to(root): raise SystemExit('Private key must be outside the repository')
public_file=root/'src-tauri/updater-public-key.hex'
if args.init:
    if key_path.exists() or public_file.exists(): raise SystemExit('Refusing to replace an existing signing identity')
    key=Ed25519PrivateKey.generate()
    key_path.parent.mkdir(parents=True,exist_ok=True)
    with key_path.open('xb') as handle:
        handle.write(dpapi(key.private_bytes(Encoding.Raw,PrivateFormat.Raw,NoEncryption()),True))
    public_file.write_text(key.public_key().public_bytes(Encoding.Raw,PublicFormat.Raw).hex()+'\n',encoding='ascii')
    print('Signing identity created. Private key remains protected outside the repository.')
else:
    if not all([args.package,args.version,args.url,args.output]): parser.error('package, version, url and output required')
    key=Ed25519PrivateKey.from_private_bytes(dpapi(key_path.read_bytes(),False))
    if key.public_key().public_bytes(Encoding.Raw,PublicFormat.Raw).hex()!=public_file.read_text().strip():
        raise SystemExit('Private key does not match the application public key')
    data=args.package.read_bytes()
    manifest={'schema':1,'version':args.version,'url':args.url,'size':len(data),'sha256':hashlib.sha256(data).hexdigest()}
    payload=(json.dumps(manifest,sort_keys=True,separators=(',',':'))+'\n').encode()
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_bytes(payload)
    args.output.with_suffix(args.output.suffix+'.sig').write_text(key.sign(payload).hex()+'\n',encoding='ascii')
    print('Manifest signed:',args.output.name)
