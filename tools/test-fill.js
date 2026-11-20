const fs=require('fs'),path=require('path'),PDFLib=require('pdf-lib'),fontkit=require('@pdf-lib/fontkit');
const F=require('../fill.js');const root=path.join(__dirname,'..');const out=process.argv[2];
const answers={fillDate:'2026-11-20',name:'ישראל ישראלי',idNum:'123456782',rank:'סרן',role:'קצין לוגיסטיקה',phone:'050-1234567',email:'israel.i@example.com',
destination:'פריז, צרפת',depDate:'2026-11-01',depTime:'08:30',retDate:'2026-11-07',retTime:'22:15',advance:'1500',advanceCurrency:'USD',
bank:'לאומי',branch:'812',account:'12345678',cardNumber:'4580 1234 5678 9012',cardType:'ויזה',cardExpiry:'08/28',cvv:'123',
expenses:{
 lodging:{paid:'yes',entries:[{from:'2026-11-01',to:'2026-11-04',desc:'Hotel Ibis Bangkok',amount:'3200',currency:'THB'},{from:'2026-11-04',to:'2026-11-07',desc:'מלון מרינה סינגפור',amount:'540',currency:'SGD'}],note:'החלפת מלון בגלל שינוי מקום הכנס'},
 car:{entries:[{date:'2026-11-03',desc:'דלק',amount:'85.5',currency:'SGD'}],note:''},
 taxiIL:{entries:[{date:'2026-11-01',desc:'מהבית לנתב״ג',amount:'180',currency:'ILS'}],note:''},
 taxiAbroad:{entries:[{date:'2026-11-01',desc:'משדה התעופה למלון',amount:'450',currency:'THB'},{date:'2026-11-04',desc:'מהמלון לשדה',amount:'380',currency:'THB'},{date:'2026-11-07',desc:'מהמלון לשדה בסינגפור',amount:'32',currency:'SGD'}],note:'יעד הנסיעות: כנס הלוגיסטיקה'},
 other:{entries:[],note:'מזוודה – באישור מראש'}}};
const sig=fs.readFileSync(path.join(__dirname,'sig.png'));
(async()=>{for(const k of ['settlement','commitment']){const b=await F.fill(k,{PDFLib,fontkit,pdfBytes:fs.readFileSync(path.join(root,F.FORMS[k].file)),fontBytes:fs.readFileSync(path.join(root,'fonts/Alef-Regular.ttf')),answers,signaturePng:sig});fs.writeFileSync(path.join(out,k+'.pdf'),b);console.log(k,b.length)}})();
