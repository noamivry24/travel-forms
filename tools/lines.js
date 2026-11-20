// Finds horizontal underline segments in a page image. Usage: node lines.js img pdfW pdfH
const fs=require('fs'),PNG=require('pngjs').PNG,jpeg=require('jpeg-js');
const [,,f,pw,ph]=process.argv;const buf=fs.readFileSync(f);
const img=f.endsWith('.png')?PNG.sync.read(buf):jpeg.decode(buf);
const {width:W,height:H,data}=img;const sx=pw/W, sy=ph/H;
const dark=(x,y)=>{const i=(y*W+x)*4;const a=data[i+3]??255;if(a<128)return false;return (data[i]+data[i+1]+data[i+2])/3<110};
const segs=[];
for(let y=0;y<H;y++){let s=-1,gap=0;for(let x=0;x<=W;x++){const d=x<W&&dark(x,y);
 if(d){if(s<0)s=x;gap=0}else if(s>=0){gap++;if(gap>3||x==W){const e=x-gap;if(e-s>W*0.03)segs.push([s,e,y]);s=-1;gap=0}}}}
// merge segments on adjacent rows
const out=[];for(const g of segs){const m=out.find(o=>Math.abs(o[2]-g[2])<=3&&Math.abs(o[0]-g[0])<15&&Math.abs(o[1]-g[1])<15);if(m){m[3]=g[2]}else out.push([g[0],g[1],g[2],g[2]])}
for(const [a,b,y1,y2] of out){if(y2-y1>8)continue;console.log(`x ${(a*sx).toFixed(0)}-${(b*sx).toFixed(0)}  y ${(ph-(y1+y2)/2*sy).toFixed(1)}  (px y ${y1})`)}
