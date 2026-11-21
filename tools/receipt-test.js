// node tools/receipt-test.js outdir  -> renders a receipt page from a generated JPEG
const fs=require('fs'),path=require('path'),P=require('pdf-lib'),fk=require('@pdf-lib/fontkit'),jpeg=require('jpeg-js'),F=require('../fill.js');
const out=process.argv[2];const W=900,H=1600,data=Buffer.alloc(W*H*4);
for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*4;const stripe=(y%120<8)||(x<20||x>W-20||y<20||y>H-20);data[i]=data[i+1]=stripe?40:235;data[i+2]=stripe?40:220;data[i+3]=255;}
const jpg=jpeg.encode({data,width:W,height:H},85).data;
(async()=>{const doc=await P.PDFDocument.create();doc.registerFontkit(fk);const font=await doc.embedFont(fs.readFileSync(path.join(__dirname,'../fonts/Alef-Regular.ttf')),{subset:true});
const b=await F.fill('commitment',{PDFLib:P,fontkit:fk,pdfBytes:fs.readFileSync(path.join(__dirname,'../forms/form2.pdf')),fontBytes:fs.readFileSync(path.join(__dirname,'../fonts/Alef-Regular.ttf')),answers:{},receipts:[{type:'jpg',bytes:jpg,caption:'מונית מהשדה 1/11'}]});
const d=await P.PDFDocument.load(b);const n=await P.PDFDocument.create();const [p]=await n.copyPages(d,[1]);n.addPage(p);fs.writeFileSync(path.join(out,'r.pdf'),await n.save());console.log('pages',d.getPageCount());})();
