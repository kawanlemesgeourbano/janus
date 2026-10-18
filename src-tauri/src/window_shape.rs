#[tauri::command]
pub fn radial_region(window:tauri::WebviewWindow,polygons:Option<Vec<Vec<(f64,f64)>>>)->Result<(),String>{
    if let Some(ref shapes)=polygons{validate(shapes)?;}
    #[cfg(windows)]unsafe{
        use windows::Win32::{Foundation::POINT,Graphics::Gdi::{CreatePolygonRgn,CreateRectRgn,CombineRgn,SetWindowRgn,DeleteObject,WINDING,RGN_OR}};
        let hwnd=window.hwnd().map_err(|e|e.to_string())?;
        let Some(shapes)=polygons else{if SetWindowRgn(hwnd,None,true)==0{return Err("Não foi possível restaurar a janela".into());}return Ok(());};
        let scale=window.scale_factor().map_err(|e|e.to_string())?;let region=CreateRectRgn(0,0,0,0);
        if region.0.is_null(){return Err("Não foi possível desenhar a janela circular".into());}
        for shape in shapes{
            let points:Vec<POINT>=shape.iter().map(|(x,y)|POINT{x:(x*scale).round() as i32,y:(y*scale).round() as i32}).collect();
            let part=CreatePolygonRgn(&points,WINDING);
            if part.0.is_null(){let _=DeleteObject(region.into());return Err("Não foi possível desenhar o menu".into());}
            let combined=CombineRgn(Some(region),Some(region),Some(part),RGN_OR);let _=DeleteObject(part.into());
            if combined.0==0{let _=DeleteObject(region.into());return Err("Não foi possível desenhar o menu".into());}
        }
        if SetWindowRgn(hwnd,Some(region),true)==0{let _=DeleteObject(region.into());return Err("Não foi possível aplicar o formato circular".into());}
        // Windows owns the region after SetWindowRgn succeeds.
    }
    Ok(())
}
fn validate(shapes:&[Vec<(f64,f64)>])->Result<(),String>{
    if shapes.is_empty()||shapes.len()>12||shapes.iter().any(|shape|shape.len()<3||shape.len()>128||shape.iter().any(|(x,y)|!x.is_finite()||!y.is_finite()||*x<0.0||*y<0.0||*x>1100.0||*y>1100.0)){return Err("Geometria de janela inválida".into());}Ok(())
}
#[cfg(test)]mod tests{use super::*;#[test]fn rejects_unbounded_geometry(){assert!(validate(&[]).is_err());assert!(validate(&[vec![(f64::NAN,0.0);3]]).is_err());assert!(validate(&[vec![(2000.0,0.0);3]]).is_err());assert!(validate(&[vec![(0.0,0.0),(50.0,0.0),(25.0,50.0)]]).is_ok());}}
