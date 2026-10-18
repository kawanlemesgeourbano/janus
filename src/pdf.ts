import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc=workerUrl;
export async function readPdf(file:File):Promise<string[]> {
  if(file.size>20*1024*1024)throw Error('Escolha um PDF de até 20 MB.');
  const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),useSystemFonts:true});
  try {
    const doc=await task.promise;
    if(doc.numPages>100)throw Error('Escolha um documento com até 100 páginas.');
    const pages:string[]=[];
    for(let n=1;n<=doc.numPages;n++) {
      const page=await doc.getPage(n), content=await page.getTextContent();
      const lines:{y:number;x:number;text:string}[]=[];
      for(const item of content.items) {
        if(!('str' in item)||!item.str.trim())continue;
        const y=item.transform[5],x=item.transform[4];
        let line=lines.find(l=>Math.abs(l.y-y)<2);
        if(line)line.text+=' '+item.str;else lines.push({y,x,text:item.str});
      }
      pages.push(lines.sort((a,b)=>b.y-a.y||a.x-b.x).map(l=>l.text.trim()).join('\n'));
    }
    if(pages.join('').trim().length<30)throw Error('Este PDF não contém texto extraível. Use uma versão com OCR ou cadastre os textos manualmente.');
    return pages;
  } finally {await task.destroy();}
}
