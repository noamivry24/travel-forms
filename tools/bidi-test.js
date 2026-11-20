// Renders sample Hebrew strings the same way the forms do. node tools/bidi-test.js out.pdf
const fs=require('fs'),P=require('pdf-lib'),fk=require('@pdf-lib/fontkit'),F=require('../fill.js');
const samples=['נועם עברי','סגן','פריז, צרפת','דיסקונט','רחוב הרצל 5 (דירה 3)','1,500 $','קצין לוגיסטיקה / סרן','ת"ז 123456782'];
(async()=>{const d=await P.PDFDocument.create();d.registerFontkit(fk);const f=await d.embedFont(fs.readFileSync(__dirname+'/../fonts/Alef-Regular.ttf'),{subset:true});
const p=d.addPage([420,40+samples.length*40]);samples.forEach((t,i)=>{const v=F.toVisual(t);const w=f.widthOfTextAtSize(v,22);F.drawVisual(p,v,400-w,p.getHeight()-40-i*40,22,f,P.rgb(0,0,0));});
fs.writeFileSync(process.argv[2],await d.save());})();
