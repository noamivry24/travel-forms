// Crop image region and overlay grid. node crop.js img x0 y0 x1 y1 out.png [step]
const fs=require('fs'),PNG=require('pngjs').PNG,jpeg=require('jpeg-js');
const [,,f,x0,y0,x1,y1,o,st]=process.argv.map((v,i)=>i>2&&i<7?+v:v);const step=+(st||50);
const buf=fs.readFileSync(f);const img=f.endsWith('.png')?PNG.sync.read(buf):jpeg.decode(buf);
const w=x1-x0,h=y1-y0,out=new PNG({width:w,height:h});
for(let y=0;y<h;y++)for(let x=0;x<w;x++){const si=((y+y0)*img.width+(x+x0))*4,di=(y*w+x)*4;
 let r=img.data[si],g=img.data[si+1],b=img.data[si+2];const a=img.data[si+3]??255;if(a<128){r=g=b=255}
 const gx=(x+x0)%step===0,gy=(y+y0)%step===0,big=((x+x0)%(step*5)===0)||((y+y0)%(step*5)===0);
 if(gx||gy){if(big){r=0;g=0;b=255}else{r=255;g=120;b=120}}
 out.data[di]=r;out.data[di+1]=g;out.data[di+2]=b;out.data[di+3]=255}
fs.writeFileSync(o,PNG.sync.write(out));
