use ed25519_dalek::{Signature, VerifyingKey};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{collections::HashSet, io::{Cursor, Read}};

pub const FEED: &str = "https://raw.githubusercontent.com/kawanlemesgeourbano/janus/main/updates/latest.json";
pub const FILES: [&str; 7] = ["CREDITS.md", "LICENSE-ASSETS.md", "LICENSE-COUCOU", "LICENSE-FONTS.txt", "THIRD-PARTY-NOTICES.txt", "LEIA-ME.txt", "Janus.exe"];
pub const MAX_PACKAGE: u64 = 100 * 1024 * 1024;
pub const MAX_EXPANDED: u64 = 200 * 1024 * 1024;
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Manifest { pub schema:u32, pub version:String, pub url:String, pub size:u64, pub sha256:String }
pub fn digest(bytes:&[u8])->String { hex::encode(Sha256::digest(bytes)) }
pub fn verify_with_key(bytes:&[u8], signature:&str, key:&[u8;32])->Result<Manifest,String>{
    if bytes.len()>16384 || signature.trim().len()!=128 {return Err("Descrição de atualização inválida".into());}
    let public=VerifyingKey::from_bytes(key).map_err(|_|"Chave pública inválida")?;
    let sig=Signature::from_slice(&hex::decode(signature.trim()).map_err(|_|"Assinatura inválida")?).map_err(|_|"Assinatura inválida")?;
    public.verify_strict(bytes,&sig).map_err(|_|"A assinatura da atualização não é válida")?;
    let manifest:Manifest=serde_json::from_slice(bytes).map_err(|_|"Descrição de atualização inválida")?;
    let version=semver::Version::parse(&manifest.version).map_err(|_|"Versão inválida")?;
    let url=reqwest::Url::parse(&manifest.url).map_err(|_|"Endereço inválido")?;
    let prefix="/kawanlemesgeourbano/janus/releases/download/";
    if manifest.schema!=1 || manifest.size==0 || manifest.size>MAX_PACKAGE || version.major>1000
        || manifest.sha256.len()!=64 || hex::decode(&manifest.sha256).is_err()
        || url.scheme()!="https" || url.host_str()!=Some("github.com") || url.port().is_some()
        || !url.username().is_empty() || url.password().is_some() || url.query().is_some() || url.fragment().is_some()
        || !url.path().starts_with(prefix) || !url.path().ends_with("/Janus-Windows-portatil.zip")
        || url.path().contains('%') || url.path()[prefix.len()..].split('/').count()!=2 {
        return Err("Pacote incompatível ou endereço não permitido".into());
    }
    Ok(manifest)
}
pub fn verify(bytes:&[u8],signature:&str)->Result<Manifest,String>{
    let public: [u8;32]=hex::decode(include_str!("../updater-public-key.hex").trim()).map_err(|_|"Chave pública inválida")?.try_into().map_err(|_|"Chave pública inválida")?;
    verify_with_key(bytes,signature,&public)
}
pub fn newer(candidate:&str,current:&str)->bool{
    match (semver::Version::parse(candidate),semver::Version::parse(current)) {(Ok(a),Ok(b))=>a.cmp_precedence(&b).is_gt(),_=>false}
}
pub fn unpack(manifest:&Manifest,bytes:&[u8])->Result<Vec<(String,Vec<u8>)>,String>{
    if bytes.len() as u64!=manifest.size || digest(bytes)!=manifest.sha256 {return Err("O pacote baixado não corresponde à assinatura".into());}
    let mut archive=zip::ZipArchive::new(Cursor::new(bytes)).map_err(|_|"ZIP inválido")?;
    if archive.len()!=FILES.len(){return Err("Conteúdo inesperado no pacote".into());}
    let mut seen=HashSet::new();let mut expanded=0u64;let mut files=Vec::new();
    for index in 0..archive.len(){
        let mut file=archive.by_index(index).map_err(|_|"Não foi possível ler o ZIP")?;
        let name=file.name().to_string();
        if !FILES.contains(&name.as_str()) || !seen.insert(name.clone()) || file.is_dir()
            || file.unix_mode().is_some_and(|mode|mode & 0o170000==0o120000) {
            return Err("Arquivo não permitido no pacote".into());
        }
        expanded=expanded.checked_add(file.size()).ok_or("Pacote muito grande")?;
        if expanded>MAX_EXPANDED{return Err("Pacote descompactado muito grande".into());}
        let expected=file.size();let mut content=Vec::new();
        (&mut file).take(expected+1).read_to_end(&mut content).map_err(|_|"ZIP corrompido")?;
        if content.len() as u64!=expected || (name=="Janus.exe" && !content.starts_with(b"MZ")){return Err("Arquivo inválido no pacote".into());}
        files.push((name,content));
    }
    // The entry executable is replaced last, after all notices have been written.
    files.sort_by_key(|(name,_)|FILES.iter().position(|f|f==name).unwrap());
    Ok(files)
}

#[cfg(test)] mod tests {
    use super::*;use ed25519_dalek::{Signer, SigningKey};use std::io::Write;
    fn manifest()->Manifest{Manifest{schema:1,version:"1.0.1-alpha.1".into(),url:"https://github.com/kawanlemesgeourbano/janus/releases/download/v1.0a.1/Janus-Windows-portatil.zip".into(),size:1,sha256:"0".repeat(64)}}
    #[test]fn signature_tampering_and_wrong_sources_are_rejected(){
        let key=SigningKey::from_bytes(&[7;32]);let m=manifest();let data=serde_json::to_vec(&m).unwrap();let sig=hex::encode(key.sign(&data).to_bytes());
        assert!(verify_with_key(&data,&sig,&key.verifying_key().to_bytes()).is_ok());
        assert!(verify(&data,&sig).is_err());let mut corrupt=data.clone();corrupt[2]^=1;assert!(verify_with_key(&corrupt,&sig,&key.verifying_key().to_bytes()).is_err());
        for url in ["http://github.com/x", "https://github.com/other/repo/releases/download/v1/Janus-Windows-portatil.zip", "https://github.com/kawanlemesgeourbano/janus/releases/download/v1/Janus-Windows-portatil.zip?x=1"]{
            let mut bad=m.clone();bad.url=url.into();let bytes=serde_json::to_vec(&bad).unwrap();assert!(verify_with_key(&bytes,&hex::encode(key.sign(&bytes).to_bytes()),&key.verifying_key().to_bytes()).is_err());
        }
    }
    #[test]fn versions_are_semantic_and_do_not_downgrade(){assert!(newer("1.0.10-alpha.1","1.0.2-alpha.1"));assert!(!newer("1.0.0-alpha.1","1.0.1-alpha.1"));assert!(!newer("bad","1.0.0"));assert!(!newer("1.0.0","1.0.0"));assert!(!newer("1.0.0+build.2","1.0.0+build.1"));}
    fn package(names:&[&str])->Vec<u8>{let mut writer=zip::ZipWriter::new(Cursor::new(Vec::new()));for name in names{writer.start_file(*name,zip::write::SimpleFileOptions::default()).unwrap();writer.write_all(if *name=="Janus.exe"{b"MZfixture"}else{b"fixture"}).unwrap();}writer.finish().unwrap().into_inner()}
    #[test]fn zip_integrity_paths_and_duplicates_are_checked(){
        let bytes=package(&FILES);let mut m=manifest();m.size=bytes.len() as u64;m.sha256=digest(&bytes);let files=unpack(&m,&bytes).unwrap();assert_eq!(files.last().unwrap().0,"Janus.exe");
        let mut corrupt=bytes.clone();corrupt[0]^=1;assert!(unpack(&m,&corrupt).is_err());
        for bad in ["../dados/preferencias.json","dados/preferencias.json","C:/Janus.exe"]{let mut names=FILES;names[0]=bad;let data=package(&names);m.size=data.len() as u64;m.sha256=digest(&data);assert!(unpack(&m,&data).is_err());}
        let mut names=FILES;names[0]="Januz.exe";let mut duplicate=package(&names);
        for offset in (0..duplicate.len()-8).collect::<Vec<_>>(){if &duplicate[offset..offset+9]==b"Januz.exe"{duplicate[offset..offset+9].copy_from_slice(b"Janus.exe");}}
        m.size=duplicate.len() as u64;m.sha256=digest(&duplicate);assert!(unpack(&m,&duplicate).is_err());
    }
}
