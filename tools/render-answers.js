// node tools/render-answers.js answers.json outdir  -> settlement.pdf + page PNGs via Quick Look
const fs=require('fs'),path=require('path'),P=require('pdf-lib'),fk=require('@pdf-lib/fontkit'),F=require('../fill.js');
const [,,json,out]=process.argv;const a=JSON.parse(fs.readFileSync(json,'utf8'));const root=path.join(__dirname,'..');
(async()=>{const b=await F.fill('settlement',{PDFLib:P,fontkit:fk,pdfBytes:fs.readFileSync(path.join(root,'forms/form1.pdf')),fontBytes:fs.readFileSync(path.join(root,'fonts/Alef-Regular.ttf')),answers:a,signaturePng:fs.readFileSync(path.join(__dirname,'sig.png'))});
fs.writeFileSync(path.join(out,'settlement.pdf'),b);const d=await P.PDFDocument.load(b);
for(let i=0;i<d.getPageCount();i++){const n=await P.PDFDocument.create();const [p]=await n.copyPages(d,[i]);n.addPage(p);fs.writeFileSync(path.join(out,`p${i+1}.pdf`),await n.save());}
console.log('pages',d.getPageCount());})();
