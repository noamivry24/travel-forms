const fs=require('fs'),path=require('path'),PDFLib=require('pdf-lib'),fontkit=require('@pdf-lib/fontkit');
const F=require('../fill.js');const root=path.join(__dirname,'..');const out=process.argv[2];
const answers={fillDate:'2026-11-20',name:'ישראל ישראלי',idNum:'123456782',rank:'סרן',role:'קצין לוגיסטיקה',phone:'050-1234567',email:'israel.i@example.com',
destination:'פריז, צרפת',depDate:'2026-11-01',depTime:'08:30',retDate:'2026-11-07',retTime:'22:15',advance:'1500',advanceCurrency:'$',
bank:'לאומי',branch:'812',account:'12345678',cardNumber:'4580 1234 5678 9012',cardType:'ויזה',cardExpiry:'08/28',cvv:'123',
expenses:{food:{date:'1-7/11',breakfast:'2',lunch:'1',dinner:'3',sum:'420'},lodging:{date:'1-7/11',sum:'1260'},car:{date:'3/11',sum:'85.5'},taxiIL:{date:'1/11',sum:'50'},taxiAbroad:{date:'2/11',sum:'40'},other:{date:'5/11',sum:'30'}}};
const sig=fs.readFileSync(path.join(__dirname,'sig.png'));
(async()=>{for(const k of ['settlement','commitment']){const b=await F.fill(k,{PDFLib,fontkit,pdfBytes:fs.readFileSync(path.join(root,F.FORMS[k].file)),fontBytes:fs.readFileSync(path.join(root,'fonts/Alef-Regular.ttf')),answers,signaturePng:sig});fs.writeFileSync(path.join(out,k+'.pdf'),b);console.log(k,b.length)}})();
