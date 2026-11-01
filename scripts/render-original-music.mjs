// Reproducible original scores and synthesized masters. No imported recordings, samples or melodies.
// Offline output only: never contacts Storage or a database. mp3 encoder: installed @breezystack/lamejs.
import {Mp3Encoder} from '@breezystack/lamejs';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const RATE=24000;
const pieces=[
 ['sunnat','qutlug-qadam','Қутлуғ қадам','Добрый шаг',96,50,[0,2,4,7,9], [0,2,3,2,1,0,4,3,2,1,2,0], 'plucked'],
 ['sunnat','oilaviy-shodlik','Оилавий шодлик','Семейная радость',104,55,[0,2,4,5,7,9,11],[0,2,4,3,2,1,0,4,5,4,2,0],'piano'],
 ['sunnat','duolar-sadosi','Дуолар садоси','Отзвук добрых молитв',88,48,[0,2,3,5,7,9,10],[0,3,4,2,1,0,2,4,3,1,2,0],'warm'],
 ['sunnat','navnihollar','Навниҳоллар','Юные побеги',100,53,[0,2,4,7,9],[2,3,4,2,1,0,1,3,2,4,1,0],'plucked'],
 ['sunnat','bayram-nafasi','Байрам нафаси','Дыхание праздника',112,48,[0,2,4,5,7,9,11],[0,4,2,3,1,2,0,3,4,2,1,0],'piano'],
 ['sunnat','mehr-rishtasi','Меҳр риштаси','Нить доброты',92,57,[0,2,3,5,7,8,10],[0,2,4,3,1,2,0,4,3,2,1,0],'warm'],
 ['yubiley','umr-nuri','Умр нури','Свет прожитых лет',76,48,[0,2,4,5,7,9,11],[0,2,4,5,4,2,1,3,2,1,2,0],'piano'],
 ['yubiley','ehtirom','Эҳтиром','Почтение',72,50,[0,2,3,5,7,8,10],[0,4,3,2,1,0,2,3,4,2,1,0],'warm'],
 ['yubiley','xotira-bogi','Хотира боғи','Сад воспоминаний',84,53,[0,2,4,7,9],[0,2,3,4,2,1,3,2,0,1,2,0],'plucked'],
 ['yubiley','diydor','Дийдор','Радость встречи',80,55,[0,2,4,5,7,9,11],[2,4,3,1,2,0,3,5,4,2,1,0],'piano'],
 ['yubiley','sokin-oqshom','Сокин оқшом','Тихий вечер',70,45,[0,2,3,5,7,9,10],[0,2,3,1,2,4,3,2,0,1,2,0],'warm'],
 ['yubiley','minnatdorlik','Миннатдорлик','Благодарность',86,52,[0,2,4,5,7,9,11],[0,3,2,4,5,4,2,1,3,2,1,0],'piano'],
];
const manifest=[];mkdirSync('public/audio/originals',{recursive:true});mkdirSync('music/originals',{recursive:true});
for(const [occasion,name,titleUz,titleRu,bpm,root,scale,motif,timbre] of pieces){
 const beat=60/bpm,duration=96*beat+4,length=Math.ceil(duration*RATE),left=new Float32Array(length),right=new Float32Array(length);
 const note=(degree,octave=0)=>root+12*Math.floor(degree/scale.length)+scale[((degree%scale.length)+scale.length)%scale.length]+octave*12;
 function tone(at,midi,dur,gain,voice='piano',pan=0){const hz=440*2**((midi-69)/12),n=Math.ceil((dur+1.4)*RATE),start=Math.floor(at*RATE);for(let i=0;i<n&&start+i<length;i++){const time=i/RATE,attack=voice==='warm'?.16:.008,release=time>dur?Math.exp(-(time-dur)*3.8):1,env=Math.min(1,time/attack)*Math.exp(-time/(voice==='warm'?3.6:voice==='plucked'?.8:1.8))*release;
 const phase=2*Math.PI*hz*time;const sample=(Math.sin(phase)+.28*Math.sin(2*phase)*Math.exp(-time*1.7)+.12*Math.sin(3*phase)*Math.exp(-time*3)+.045*Math.sin(4.003*phase)*Math.exp(-time*5))*env*gain;
 left[start+i]+=sample*Math.sqrt((1-pan)/2);right[start+i]+=sample*Math.sqrt((1+pan)/2);
 }}
 for(let bar=0;bar<24;bar++){const section=Math.floor(bar/8),harmonies=[0,3,4,0,5,3,4,0],h=harmonies[bar%8],at=bar*4*beat;
  tone(at,note(h,-1),3.5*beat,.105,'warm',-.12);
  for(let j=0;j<4;j++)tone(at+j*beat,note(h+[0,2,4,2][j]),beat*.9,.065,timbre,j%2?.28:-.28);
  const pattern=bar%2===0?[0,1.5,2.5]:[.5,2,3];
  for(let j=0;j<pattern.length;j++){const degree=motif[(bar*3+j)%motif.length]+(section===1?2:0);tone(at+pattern[j]*beat,note(degree,1),beat*(j===2?1.3:.8),.13,timbre,.12);if(section===2&&bar%2)tone(at+(pattern[j]+.25)*beat,note(degree-2,1),beat*.6,.035,'warm',-.25)}
  if(occasion==='sunnat'&&section>0){for(const off of [0,2]){const start=Math.floor((at+off*beat)*RATE);for(let i=0;i<RATE*.12&&start+i<length;i++){const time=i/RATE,drum=Math.sin(2*Math.PI*(85-100*time)*time)*Math.exp(-time*34)*.028;left[start+i]+=drum;right[start+i]+=drum}}}
 }
 // Three quiet, deterministic reflections are rendered once, not synthesized on the guest's device.
 for(const [delay,gain] of [[.117,.12],[.251,.08],[.389,.045]]){const off=Math.floor(delay*RATE);for(let i=length-1;i>=off;i--){left[i]+=right[i-off]*gain;right[i]+=left[i-off]*gain}}
 let peak=0;for(let i=0;i<length;i++)peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));const normalize=.82/peak,pcmL=new Int16Array(length),pcmR=new Int16Array(length);let energy=0,clipped=0;
 for(let i=0;i<length;i++){const fade=Math.min(1,i/(RATE*.4),(length-i)/(RATE*2.8));const a=left[i]*normalize*fade,b=right[i]*normalize*fade;pcmL[i]=Math.round(a*32767);pcmR[i]=Math.round(b*32767);energy+=(a*a+b*b)/2;if(Math.abs(a)>=1||Math.abs(b)>=1)clipped++}
 const encoder=new Mp3Encoder(2,RATE,128),chunks=[];for(let i=0;i<length;i+=1152){const chunk=encoder.encodeBuffer(pcmL.subarray(i,i+1152),pcmR.subarray(i,i+1152));if(chunk.length)chunks.push(Buffer.from(chunk))}chunks.push(Buffer.from(encoder.flush()));const bytes=Buffer.concat(chunks),id=`inviteizi-${occasion}-${name}`,file=`public/audio/originals/${id}.mp3`;writeFileSync(file,bytes);
 manifest.push({id,occasion,titleUz,titleRu,bpm,root,scale,motif,timbre,form:'24 bars: A / B / varied A',durationSeconds:Number(duration.toFixed(3)),file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),rms:Number(Math.sqrt(energy/length).toFixed(4)),clippedSamples:clipped,license:'CC0-1.0',provenance:'Original score and additive synthesis created for InviteIZI; no imported recordings or third-party samples.'});console.log(id,Math.round(duration)+'s',bytes.length);
}
writeFileSync('music/originals/manifest.json',JSON.stringify(manifest,null,2)+'\n');
