const $=s=>document.querySelector(s),LS=localStorage;
const today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const won=n=>Math.round(n||0).toLocaleString('ko-KR')+'원';
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const cl=n=>n>0?'up':n<0?'dn':'';
const D0=()=>({tx:[],cats:{out:['식비','교통','주거','쇼핑','여가','의료','기타'],in:['월급','기타']},bud:{},cash:[],snaps:{},cfg:{owner:'',repo:'',sample:false}});
let S;try{S=Object.assign(D0(),JSON.parse(LS.getItem('gk1')||'{}'))}catch(e){S=D0()}
S.cfg=Object.assign(D0().cfg,S.cfg);
const save=()=>LS.setItem('gk1',JSON.stringify(S));
const cached=()=>{if(S.cfg.sample)return null;try{return JSON.parse(LS.getItem('gk_stock')||'null')}catch(e){return null}};
let tab='tx',ym=today().slice(0,7),stock=cached(),msg='',range=30;
const sv=()=>stock?(stock.totals&&stock.totals.eval!=null?stock.totals.eval:(stock.holdings||[]).reduce((a,h)=>a+(h.eval||0),0)):0;
const cashTot=()=>S.cash.reduce((a,x)=>a+x.v,0)+(stock&&stock.cash||0);
const total=()=>cashTot()+sv();
const snap=()=>{if(!S.cfg.sample){S.snaps[today().slice(0,7)]=total();save()}};
const monthTx=()=>S.tx.filter(t=>t.d.startsWith(ym)).sort((a,b)=>b.d.localeCompare(a.d)||b.id-a.id);

async function load(){
  msg='';
  try{
    let r;
    if(S.cfg.sample){r=await fetch('sample-assets.json')}
    else{
      const t=LS.getItem('gk_tok'),c=S.cfg;
      if(!t||!c.owner||!c.repo){msg='소유자, 레포 이름, 토큰을 모두 입력하세요.';return}
      r=await fetch('https://api.github.com/repos/'+encodeURIComponent(c.owner)+'/'+encodeURIComponent(c.repo)+'/contents/assets.json',{headers:{Authorization:'Bearer '+t,Accept:'application/vnd.github.raw+json'},cache:'no-store'});
    }
    if(r.status==401||r.status==403){msg='토큰이 만료됐거나 권한이 없어요. 설정에서 토큰을 다시 넣어주세요.';return}
    if(r.status==404){msg='레포 이름이나 파일을 찾을 수 없어요. 설정의 소유자/레포 이름을 확인하세요.';return}
    if(!r.ok){msg='불러오지 못했어요. ('+r.status+')';return}
    stock=await r.json();
    if(!S.cfg.sample)LS.setItem('gk_stock',JSON.stringify(stock));
  }catch(e){msg=stock?'오프라인이에요. 저장된 데이터를 보여드려요.':'네트워크 오류예요. 잠시 후 다시 시도하세요.'}
}

function vTx(){
  const l=monthTx();let inc=0,out=0;
  l.forEach(t=>{if(t.k=='in')inc+=t.a;else out+=t.a});
  let h=`<div class=mn><button data-a=pm>‹</button><b>${ym.slice(0,4)}년 ${+ym.slice(5)}월</b><button data-a=nm>›</button></div><div class=sum><span class=inc>수입 ${won(inc)}</span><span>지출 ${won(out)}</span></div>`;
  if(!l.length)return h+'<p class=em>이번 달 내역이 없어요. 오른쪽 아래 ＋ 버튼으로 첫 내역을 입력해 보세요.</p>';
  let d='';
  l.forEach(t=>{
    if(t.d!=d){d=t.d;h+=`<div class=dh>${+d.slice(5,7)}월 ${+d.slice(8)}일</div>`}
    h+=`<button class=it data-a=ed data-id="${t.id}"><div><b>${esc(t.c)}</b><small>${esc(t.m||'')} ${esc(t.p||'')}</small></div><b class="${t.k=='in'?'inc':''}">${t.k=='in'?'+':'-'}${won(t.a)}</b></button>`;
  });
  return h;
}

function vSt(){
  const l=monthTx();let inc=0,out=0,by={};
  l.forEach(t=>{if(t.k=='in')inc+=t.a;else{out+=t.a;by[t.c]=(by[t.c]||0)+t.a}});
  const names=[...new Set([...Object.keys(by),...S.cats.out.filter(c=>S.bud[c])])].sort((a,b)=>(by[b]||0)-(by[a]||0));
  let h=`<div class=mn><button data-a=pm>‹</button><b>${ym.slice(0,4)}년 ${+ym.slice(5)}월</b><button data-a=nm>›</button></div>
  <div class=cd><div class=ct><span>수입</span><b class=inc>${won(inc)}</b></div><div class=ct><span>지출</span><b>${won(out)}</b></div><div class=ct><span>남은 돈</span><b class="${cl(inc-out)}">${won(inc-out)}</b></div></div><h3>분류별 지출</h3>`;
  if(!names.length)return h+'<p class=em>지출을 입력하면 분류별 비율이 보여요.</p>';
  return h+names.map(c=>{
    const v=by[c]||0,b=S.bud[c]||0,p=b?v/b*100:0;
    return `<div class=cr><div class=ct><b>${esc(c)}</b><span>${won(v)}${out?' ('+Math.round(v/out*100)+'%)':''}</span></div>`+
      (b?`<div class="bar ${p>100?'over':''}"><i style="width:${Math.min(p,100)}%"></i></div><small>${p>100?'예산 초과! ':''}예산 ${won(b)} 중 ${Math.round(p)}% 사용</small>`:`<div class=bar><i style="width:${out?v/out*100:0}%"></i></div>`)+`</div>`;
  }).join('');
}

function chart(pts){
  if(pts.length<2)return '<p class=em>기록이 2개 이상 쌓이면 그래프가 보여요.</p>';
  const W=320,H=120,ys=pts.map(p=>p.y),mn=Math.min(...ys),r=(Math.max(...ys)-mn)||1;
  const xy=pts.map((p,i)=>(8+i*(W-16)/(pts.length-1)).toFixed(1)+','+(H-12-(p.y-mn)/r*(H-28)).toFixed(1));
  return `<svg viewBox="0 0 ${W} ${H}"><polyline points="${xy.join(' ')}"/></svg><div class="ax em"><span>${esc(pts[0].x)}</span><span>${esc(pts[pts.length-1].x)}</span></div>`;
}

function vAs(){
  const st=stock,sm=S.cfg.sample,nt=t=>`<div class=nt>${t}</div>`;
  let h='';
  if(!st&&!sm&&!LS.getItem('gk_tok'))h+=nt('설정에서 주식 계좌를 연결하세요<button data-a=go>설정으로 가기</button>');
  else if(msg)h+=nt(esc(msg)+(st?' 마지막 업데이트: '+esc(st.updated_at):''));
  if(st&&st.schema_version!==1)h+=nt('데이터 형식이 바뀌었어요. 읽을 수 있는 항목만 보여드려요.');
  if(st&&!sm&&Date.now()-Date.parse(st.updated_at)>2592e5)h+=nt('최근 업데이트가 없어요. 주말·연휴이거나 봇이 안 돌았을 수 있어요.');
  h+=`<div class=hero>총자산<b>${won(total())}</b><span>현금성 ${won(cashTot())}</span><span>주식 ${won(sv())}</span></div><h3>현금성 자산</h3>`;
  h+=S.cash.map((c,i)=>`<button class=it data-a=ce data-i="${i}"><span>${esc(c.n)}</span><b>${won(c.v)}</b></button>`).join('');
  if(st)h+=`<div class=it><span>증권 계좌 <small>자동</small></span><b>${won(st.cash)}</b></div>`;
  h+=`<button class=it data-a=ca><span class=em>＋ 계좌 추가</span></button>`;
  if(st){
    const t=st.totals||{};
    h+=`<h3>주식 자산</h3><div class=cd><div class=ct><span>평가금액</span><b>${won(sv())}</b></div><div class=ct><span>평가손익</span><b class="${cl(t.pnl)}">${t.pnl>0?'+':''}${won(t.pnl)} (${t.pnl_pct>0?'+':''}${t.pnl_pct}%)</b></div><small>기준일 ${esc(st.base_date)}, 업데이트 ${esc(st.updated_at)}</small></div>`;
    h+=(st.holdings||[]).map(x=>`<div class=it><div><b>${esc(x.name)}</b><small>${x.qty}주, 평단 ${won(x.avg_price)}, 현재가 ${won(x.price)}</small></div><div style="text-align:right"><b>${won(x.eval)}</b><small class="${cl(x.pnl_pct)}">${x.pnl_pct>0?'+':''}${x.pnl_pct}%</small></div></div>`).join('');
    const hs=(st.history||[]).map(x=>({x:x.date.slice(5),y:(x.eval||0)+(x.cash||0)}));
    h+=`<h3>주식 계좌 추이</h3><div class=cd><div class=rg><button data-a=r30 class="${range==30?'on':''}">30일</button><button data-a=rall class="${range!=30?'on':''}">전체</button></div>${chart(range==30?hs.slice(-30):hs)}</div>`;
    h+=`<button class=it data-a=rf><span class=em>새로고침</span></button>`;
  }
  const ms=Object.keys(S.snaps).sort().map(k=>({x:k,y:S.snaps[k]}));
  return h+`<h3>월별 총자산 추이</h3><div class=cd>${chart(ms)}<small>매달 마지막으로 앱을 연 시점의 총자산이에요.</small></div>`;
}

function vSe(){
  const c=S.cfg,tk=LS.getItem('gk_tok');
  return `<h3>분류</h3><div class=cd><label class=fl>지출 분류 (쉼표로 구분)<input id=co value="${esc(S.cats.out.join(', '))}"></label><label class=fl>수입 분류<input id=ci value="${esc(S.cats.in.join(', '))}"></label></div>
<h3>월 예산</h3><div class=cd>${S.cats.out.map(k=>`<label class=fl>${esc(k)}<input type=number inputmode=numeric data-b="${esc(k)}" value="${S.bud[k]||''}" placeholder="예산 없음"></label>`).join('')}</div>
<h3>주식 연동</h3><div class=cd><label class=fl>GitHub 소유자<input id=fo value="${esc(c.owner)}" autocapitalize=off></label><label class=fl>레포 이름<input id=fr value="${esc(c.repo)}" autocapitalize=off></label><label class=fl>토큰<input id=ft type=password autocomplete=off placeholder="${tk?'저장됨 (새로 입력하면 교체)':'github_pat_...'}"></label>
<div class=row><button class=pri data-a=cc>연결 확인</button><button class=del data-a=ct>토큰 지우기</button></div><label class=sw><input id=fs type=checkbox ${c.sample?'checked':''}> 샘플 데이터로 보기</label></div>
<h3>백업</h3><div class=cd><div class=row><button class=pri data-a=ex>내보내기</button><label class=pri>가져오기<input id=imp type=file accept=application/json hidden></label></div><small>토큰은 백업 파일에 들어가지 않아요.</small></div>`;
}

const V={tx:vTx,st:vSt,as:vAs,se:vSe};
function render(){
  snap();
  $('#v').innerHTML=V[tab]();
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.t==tab));
  $('#fab').hidden=tab!='tx';
}

function form(orig){
  const e=!!orig,sh=$('#sheet');
  let t=e?{...orig}:{k:'out',d:today(),a:'',c:'',m:'',p:'카드'};
  const cap=()=>{if($('#fa')){t.a=$('#fa').value;t.m=$('#fm').value;t.d=$('#fd').value;t.p=$('#fp').value}};
  const close=()=>{sh.hidden=true;sh.innerHTML=''};
  const draw=()=>{
    let cs=S.cats[t.k];if(t.c&&!cs.includes(t.c))cs=[...cs,t.c];if(!t.c)t.c=cs[0];
    sh.hidden=false;
    sh.innerHTML=`<div class=pn><div class=seg><button data-k=out class="${t.k=='out'?'on':''}">지출</button><button data-k=in class="${t.k=='in'?'on':''}">수입</button></div>
<input id=fa type=number inputmode=numeric placeholder=금액 value="${esc(t.a)}"><div class=chips>${cs.map(c=>`<button data-c="${esc(c)}" class="${c==t.c?'on':''}">${esc(c)}</button>`).join('')}</div>
<input id=fm placeholder=메모 value="${esc(t.m)}"><div class=row><input id=fd type=date value="${esc(t.d)}"><select id=fp>${['카드','현금','계좌이체'].map(p=>`<option ${p==t.p?'selected':''}>${p}</option>`).join('')}</select></div>
<div class=row>${e?'<button class=del id=fx>삭제</button>':''}<button class=pri id=fs2>저장</button></div></div>`;
    if(!e)$('#fa').focus();
  };
  sh.onclick=ev=>{
    const b=ev.target.closest('button');
    if(ev.target===sh){close();return}
    if(!b)return;
    if(b.dataset.k){cap();t.k=b.dataset.k;t.c='';draw()}
    else if(b.dataset.c){cap();t.c=b.dataset.c;draw()}
    else if(b.id=='fx'){if(confirm('이 내역을 삭제할까요?')){S.tx=S.tx.filter(x=>x!==orig);save();close();render()}}
    else if(b.id=='fs2'){
      cap();const a=+t.a;
      if(!(a>0)){alert('금액을 입력하세요.');return}
      if(!t.d){alert('날짜를 입력하세요.');return}
      t.a=a;
      if(e)Object.assign(orig,t);else S.tx.push({...t,id:Date.now()});
      save();ym=t.d.slice(0,7);close();render();
    }
  };
  draw();
}

function shift(n){const[y,m]=ym.split('-').map(Number),d=new Date(y,m-1+n,1);ym=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}
function syncCfg(){
  const c=S.cfg;if($('#fo'))c.owner=$('#fo').value.trim();if($('#fr'))c.repo=$('#fr').value.trim();
  const t=$('#ft');if(t&&t.value.trim()){LS.setItem('gk_tok',t.value.trim());t.value=''}
  save();
}
const num=s=>+String(s).replace(/,/g,'');

document.addEventListener('click',async e=>{
  const n=e.target.closest('nav button');if(n){tab=n.dataset.t;render();return}
  const b=e.target.closest('[data-a]');if(!b)return;
  const a=b.dataset.a;
  if(a=='pm'||a=='nm'){shift(a=='pm'?-1:1);render()}
  else if(a=='add')form();
  else if(a=='ed')form(S.tx.find(t=>t.id==b.dataset.id));
  else if(a=='go'){tab='se';render()}
  else if(a=='r30'||a=='rall'){range=a=='r30'?30:0;render()}
  else if(a=='rf'){await load();render()}
  else if(a=='ca'){
    const nm=prompt('계좌 이름 (예: 월급통장)');if(!nm||!nm.trim())return;
    const s=prompt('잔액(원)','0');if(s===null||isNaN(num(s)))return;
    S.cash.push({n:nm.trim(),v:num(s)});save();render();
  }
  else if(a=='ce'){
    const c=S.cash[+b.dataset.i],s=prompt(c.n+' 잔액(원). 비우면 삭제돼요.',c.v);if(s===null)return;
    if(s.trim()==='')S.cash.splice(+b.dataset.i,1);else if(!isNaN(num(s)))c.v=num(s);else return;
    save();render();
  }
  else if(a=='cc'){syncCfg();await load();render();alert(msg||(stock?'연결됐어요. 기준일 '+stock.base_date:'연결하지 못했어요.'))}
  else if(a=='ct'){LS.removeItem('gk_tok');render()}
  else if(a=='ex'){
    const bl=new Blob([JSON.stringify(S)],{type:'application/json'}),l=document.createElement('a');
    l.href=URL.createObjectURL(bl);l.download='gagyebu-'+today()+'.json';l.click();
  }
});

document.addEventListener('change',async e=>{
  const t=e.target;
  if(t.dataset.b!==undefined){const v=num(t.value);if(v>0)S.bud[t.dataset.b]=v;else delete S.bud[t.dataset.b];save()}
  else if(t.id=='co'||t.id=='ci'){
    const l=t.value.split(',').map(s=>s.trim()).filter(Boolean);
    if(l.length){S.cats[t.id=='co'?'out':'in']=[...new Set(l)];save()}
    render();
  }
  else if(t.id=='fo'||t.id=='fr'||t.id=='ft'){syncCfg();if(t.id=='ft')render()}
  else if(t.id=='fs'){S.cfg.sample=t.checked;save();stock=cached();await load();render()}
  else if(t.id=='imp'&&t.files[0]){
    const r=new FileReader();
    r.onload=()=>{
      try{
        const d=JSON.parse(r.result);if(!Array.isArray(d.tx))throw 0;
        S=Object.assign(D0(),d);S.cfg=Object.assign(D0().cfg,S.cfg);save();stock=cached();render();alert('백업을 불러왔어요.');
      }catch(x){alert('백업 파일을 읽을 수 없어요.')}
    };
    r.readAsText(t.files[0]);
  }
});

render();
load().then(render);
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
