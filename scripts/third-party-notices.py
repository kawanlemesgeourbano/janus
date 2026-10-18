"""Collect license texts from the locked Windows dependency graph, without local paths."""
import json
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[1]
metadata = json.loads(subprocess.check_output([
    'cargo', 'metadata', '--manifest-path', str(root / 'src-tauri/Cargo.toml'),
    '--format-version', '1', '--locked', '--filter-platform', 'x86_64-pc-windows-msvc'
], cwd=root, text=True, encoding='utf-8'))
reachable = {node['id'] for node in metadata['resolve']['nodes']}
packages = []
for package in metadata['packages']:
    if package['id'] in reachable and package['source']:
        packages.append((f"Rust: {package['name']} {package['version']}", package.get('license') or 'See included texts',
                         Path(package['manifest_path']).parent, package.get('license_file')))
for directory in [root/'node_modules/@tauri-apps/api', root/'node_modules/pdfjs-dist']:
    package = json.loads((directory/'package.json').read_text(encoding='utf-8'))
    packages.append((f"JavaScript: {package['name']} {package['version']}", package.get('license', 'See included texts'), directory, None))

out = ['# Third-party notices', '',
       'Notices for the locked Windows dependency graph (including build dependencies) and frontend runtime libraries.',
       'Each component retains its own license. Janus branding and original assets are described separately in LICENSE-ASSETS.md.', '']
missing = []
for label, license_name, directory, explicit in sorted(packages):
    paths = {p for p in directory.iterdir() if p.is_file() and p.name.lower().startswith(('license', 'licence', 'copying', 'notice', 'copyright'))}
    if explicit and (directory/explicit).is_file(): paths.add(directory/explicit)
    for subdirectory in directory.iterdir():
        if subdirectory.is_dir() and subdirectory.name.lower() in ['licenses', 'licences']:
            paths.update(p for p in subdirectory.rglob('*') if p.is_file())
    supplementary = root/'licenses/third-party'/directory.name
    extra = sorted(p for p in supplementary.iterdir() if p.is_file()) if supplementary.is_dir() else []
    out.extend([f'## {label}', '', f'License expression: {license_name}', ''])
    if not paths and not extra: missing.append(label)
    for path in sorted(paths):
        out.extend([f'### {path.relative_to(directory).as_posix()}', '', path.read_text(encoding='utf-8', errors='replace'), ''])
    for path in extra:
        out.extend([f'### Supplementary: {path.name}', '', path.read_text(encoding='utf-8', errors='replace'), ''])
(root/'THIRD-PARTY-NOTICES.txt').write_text('\n'.join(out), encoding='utf-8')
print(f'Collected notices for {len(packages)} packages.')
if missing:
    print('Packages requiring manual license review:')
    print('\n'.join(missing))
    raise SystemExit(1)
