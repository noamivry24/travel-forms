// node montage.js out.png cellW cols img1.png img2.png ...  (box-filter downscale)
const fs=require('fs'),{PNG}=require('pngjs');const [,,out,cw,cols,...files]=process.argv;const CW=+cw,C=+cols;
const imgs=files.map(f=>PNG.sync.read(fs.readFileSync(f)));const CH=Math.max(...imgs.map(i=>Math.round(i.height*CW/i.width)));
const R=Math.ceil(imgs.length/C),o=new PNG({width:C*CW,height:R*CH});o.data.fill(200);
imgs.forEach((im,k)=>{const s=im.width/CW,ox=(k%C)*CW,oy=Math.floor(k/C)*CH,h=Math.round(im.height/s);
for(let y=0;y<h;y++)for(let x=0;x<CW;x++){let r=0,g=0,b=0,n=0;for(let yy=Math.floor(y*s);yy<Math.floor((y+1)*s);yy++)for(let xx=Math.floor(x*s);xx<Math.floor((x+1)*s);xx++){const i=(yy*im.width+xx)*4;const a=im.data[i+3]/255;r+=im.data[i]*a+255*(1-a);g+=im.data[i+1]*a+255*(1-a);b+=im.data[i+2]*a+255*(1-a);n++}
const j=((oy+y)*o.width+ox+x)*4;o.data[j]=r/n;o.data[j+1]=g/n;o.data[j+2]=b/n;o.data[j+3]=255}
for(let y=0;y<CH;y++){const j=((oy+y)*o.width+ox)*4;o.data[j]=o.data[j+1]=0;o.data[j+2]=0}});
fs.writeFileSync(out,PNG.sync.write(o));
