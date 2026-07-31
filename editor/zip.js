import { state, setStatus } from './utils.js';
import { dbGet } from './storage.js';

function publicWork(work) {
  const media = {};
  for (const section of ['before','after','gallery']) media[section] = (work.assets?.[section] || []).map(a=>a.path);
  const out = { id: work.id, order: Number(work.order)||1, published: work.published !== false, featured: work.featured !== false, title: work.title || '', type: work.type || '', location: work.location || '', area: work.area === '' ? '' : Number(work.area), duration: work.duration || '', team: work.team || '', summary: work.summary || '', description: work.description || '', challenge: work.challenge || '', result: work.result || '', tasks: work.tasks || [], note: work.note || '', cover: work.cover || media.after[0] || media.before[0] || media.gallery[0] || '', media };
  if (work.video?.url) out.video = { type: work.video.type || 'iframe', url: work.video.url, poster: work.video.poster || '' };
  return out;
}
function crcTable() { const table = new Uint32Array(256); for (let n=0;n<256;n++) { let c=n; for(let k=0;k<8;k++) c=(c&1)?0xedb88320^(c>>>1):c>>>1; table[n]=c>>>0; } return table; }
const CRC_TABLE = crcTable();
function crc32(bytes) { let c=0xffffffff; for (const b of bytes) c=CRC_TABLE[(c^b)&0xff]^(c>>>8); return (c^0xffffffff)>>>0; }
function u16(n) { return Uint8Array.of(n&255,(n>>>8)&255); }
function u32(n) { return Uint8Array.of(n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255); }
function concat(parts) { const length=parts.reduce((sum,p)=>sum+p.length,0); const out=new Uint8Array(length); let offset=0; for(const p of parts){out.set(p,offset);offset+=p.length;} return out; }
function dosDateTime(date = new Date()) { const time=((date.getHours()&31)<<11)|((date.getMinutes()&63)<<5)|((Math.floor(date.getSeconds()/2))&31); const dosDate=(((date.getFullYear()-1980)&127)<<9)|(((date.getMonth()+1)&15)<<5)|(date.getDate()&31); return {time,date:dosDate}; }
function buildZip(files) {
  const enc=new TextEncoder(); const locals=[]; const centrals=[]; let offset=0; const dt=dosDateTime();
  for(const file of files){ const name=enc.encode(file.name.replace(/^\.\//,'')); const data=file.data instanceof Uint8Array?file.data:new Uint8Array(file.data); const crc=crc32(data); const local=concat([u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(dt.time),u16(dt.date),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),name,data]); locals.push(local); const central=concat([u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(dt.time),u16(dt.date),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]); centrals.push(central); offset+=local.length; }
  const centralBlock=concat(centrals); const end=concat([u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(centralBlock.length),u32(offset),u16(0)]); return new Blob([...locals,centralBlock,end],{type:'application/zip'});
}

export async function exportZip() {
  if (!state.works.length) return setStatus('Нет объектов для экспорта.', 'error');
  const data = { version: 1, updatedAt: new Date().toISOString().slice(0,10), works: state.works.slice().sort((a,b)=>(a.order||999)-(b.order||999)).map(publicWork) };
  const json = JSON.stringify(data,null,2); const js = `window.PROCHISTKA_WORKS = ${json};\n`; const enc = new TextEncoder();
  const files = [{name:'data/works.json',data:enc.encode(json+'\n')},{name:'data/works-data.js',data:enc.encode(js)},{name:'EDITOR_EXPORT_README.txt',data:enc.encode('Скопируйте содержимое архива в корень репозитория с заменой data/works.json и data/works-data.js. Новые изображения находятся в папке media. Существующие файлы по ссылкам архив не дублирует.\n')}];
  for (const work of state.works) for (const section of ['before','after','gallery']) for (const asset of work.assets?.[section] || []) if (asset.source === 'blob') { const blob=await dbGet(asset.blobKey); if(blob) files.push({name:asset.path.replace(/^\.\//,''),data:new Uint8Array(await blob.arrayBuffer())}); }
  const blob = buildZip(files); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`prochistka-portfolio-${new Date().toISOString().slice(0,10)}.zip`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),2000); setStatus(`ZIP готов: ${files.length} файлов.`, 'success');
}
