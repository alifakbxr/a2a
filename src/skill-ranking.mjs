const STOP=new Set(['a','an','and','are','as','at','be','by','do','for','from','how','i','in','into','is','it','me','my','of','on','or','our','please','the','this','to','we','with','you','your','yang','dan','atau','untuk','dari','dengan','pada','di','ke','ini','itu','saya','aku','tolong','bisa','agar','supaya','buat','mohon','sebuah','semua','lebih','saat','ketika','dalam','jadi','nya']);
const MAX_TASK_CHARS=4000,MAX_SKILLS=200,MAX_RESULTS=2;
const GROUPS=[
 ['auth','authentication','authorization','authorize','login','signin','permission','access','akses','hakakses','izin','masuk','otentikasi','otorisasi'],
 ['user','users','pengguna','guna','akun','account','accounts','customer','pelanggan'],
 ['database','databases','db','basisdata','basis','sql','postgres','postgresql','mysql','migration','migrations','schema','skema','migrasi'],
 ['frontend','ui','interface','tampilan','antarmuka','view','component','components','komponen','halaman','panel'],
 ['backend','server','api','endpoint','controller','controllers','layanan','service','services'],
 ['validation','validate','validator','validasi','form','forms','input'],
 ['security','secure','vulnerability','vulnerabilities','keamanan','aman','audit','threat','ancaman'],
 ['testing','test','tests','pengujian','ujian','uji','tes','e2e','browser','playwright','otomatis','automatic','automation'],
 ['documentation','docs','document','readme','dokumentasi','panduan','petunjuk'],
 ['deploy','deployment','release','hosting','publishing','rilis','terbitkan','produksi'],
 ['performance','optimize','optimization','optimasi','performa','kinerja','latency','cache'],
 ['bug','fix','debug','debugging','error','issue','masalah','perbaiki','baiki','memperbaiki'],
 ['file','files','berkas','dokumen','document','documents','upload','unggah'],
 ['image','images','gambar','foto','photo','media'],
 ['workflow','pipeline','automation','automate','otomatisasi','otomatis','alur','ci','cd','actions']
];
const ALIAS=new Map();for(const g of GROUPS)for(const w of g)ALIAS.set(w,g);
function norm(t){let x=t.toLowerCase().normalize('NFKC');if(x.length>6){for(const p of ['meng','men','mem','ber','per','peng'])if(x.startsWith(p)&&x.length>p.length+2){x=x.slice(p.length);break}if(x.endsWith('kan')&&x.length>7)x=x.slice(0,-3);else if(x.endsWith('nya')&&x.length>6)x=x.slice(0,-3);else if(x.endsWith('an')&&x.length>6)x=x.slice(0,-2)}return x}
function terms(v){return(String(v||'').toLowerCase().normalize('NFKC').match(/[\p{L}\p{N}]+(?:[+#]+)?/gu)||[]).map(norm).filter(x=>x.length>1&&!STOP.has(x))}
function match(q,set){for(const t of ALIAS.get(q)||[q])if(set.has(t))return t===q?1:.72;return 0}
function fieldScore(query,set,weight){let score=0,matched=0,exact=0;for(const q of query){const m=match(q,set);if(m){score+=weight*m;matched++;if(m===1)exact++}}return{score,matched,exact}}
export function rankSkills({task,skills=[],usage={},maxResults=MAX_RESULTS,threshold=1.2,allowRoutine=false}={}){
 if(typeof task!=='string'||task.length>MAX_TASK_CHARS)throw Error('task must be a string up to 4000 characters');
 if(!Array.isArray(skills)||skills.length>MAX_SKILLS)throw Error('skills must contain at most 200 entries');
 if(!usage||typeof usage!=='object'||Array.isArray(usage)||(Object.getPrototypeOf(usage)!==Object.prototype&&Object.getPrototypeOf(usage)!==null))throw Error('usage must be a plain object');
 if(!Number.isSafeInteger(maxResults)||maxResults<1||maxResults>MAX_RESULTS)throw Error('maxResults must be 1 or 2');
 if(typeof threshold!=='number'||!Number.isFinite(threshold)||threshold<1||threshold>20)throw Error('threshold must be between 1 and 20');
 const query=[...new Set(terms(task))];if(!allowRoutine&&query.length<3)return{status:'skipped',reason:'Task description is too short for reliable Skill matching.',recommendations:[]};if(!query.length)return{status:'skipped',reason:'No meaningful task terms were found.',recommendations:[]};
 const ranked=[];
 for(const skill of skills){
  if(!skill||typeof skill.name!=='string'||skill.name.length>64||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skill.name)||typeof skill.description!=='string'||skill.description.length>1024)continue;
  const names=new Set(terms(skill.name.replaceAll('-',' '))),desc=new Set(terms(skill.description)),n=fieldScore(query,names,4.2),d=fieldScore(query,desc,1.35),matched=new Set(query.filter(q=>match(q,names)||match(q,desc))),coverage=matched.size/query.length,raw=n.score+d.score;
  const count=Number.isSafeInteger(usage[skill.name.toLowerCase()])&&usage[skill.name.toLowerCase()]>0?Math.min(usage[skill.name.toLowerCase()],1000):0,boost=Math.min(.6,Math.log1p(count)*.12)+(skill.source==='workspace'?.2:0),score=Math.min(10,raw/Math.max(2,Math.sqrt(query.length))*2+boost);
  if(score<threshold||matched.size<2)continue;
  ranked.push({name:skill.name,description:skill.description,source:skill.source||'unknown',score:Number(score.toFixed(3)),matched_terms:matched.size,coverage:Number(coverage.toFixed(3)),match_basis:{name_terms:n.matched,description_terms:d.matched,exact_name_terms:n.exact,usage_count:count}});
 }
 ranked.sort((a,b)=>b.score-a.score||b.matched_terms-a.matched_terms||a.name.localeCompare(b.name));
 const recommendations=ranked.slice(0,maxResults);if(!recommendations.length)return{status:'no_match',reason:'No Skill met the deterministic relevance and coverage thresholds.',recommendations};
 const first=recommendations[0],second=recommendations[1],margin=second?first.score-second.score:first.score,confidence=first.matched_terms>=3&&first.coverage>=.3&&margin>=.45?'high':first.matched_terms>=2&&first.coverage>=.2?'medium':'low';
 if(confidence==='low')return{status:'ambiguous',reason:'Matches are too weak to recommend a Skill confidently.',recommendations:[]};
 return{status:'recommended',confidence,reason:'Matched normalized English/Indonesian terms and bounded domain synonyms; usage is a small tie-breaker only.',recommendations};
}