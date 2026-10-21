// ============================================================
// script.js  計算ロジック + 画面表示 + ボタン操作
//   1. 共通関数
//   2〜4. 状態(入力内容の初期値)・ステータス計算(derive)・敵の防御(defense)・
//         効果変換(buildFx)・イベント駆動シミュレーション(simulate)
//   5〜6. 画面(パネルA〜D の描画、結果、グラフ)とイベント処理(入力・クリック)
//   データ定義は database.js、保存は save.js、テストは tests.js。
// ============================================================

// ===== 1. 共通関数 =====
const nz=(v,d)=>(v===''||v==null||!isFinite(+v))?d:+v, num=v=>nz(v,0), clamp=(x,a,b)=>Math.min(b,Math.max(a,x));

// ===== 2〜4. 状態・計算・シミュレーション =====
function applyChampion(s){const d=CHAMP_DATA[s.champ.name];if(!d)return;const i=clamp(num(s.champ.star)-1,0,2),pk=v=>Array.isArray(v)?v[i]:v,c=s.champ;
 c.baseAD=String(pk(d.ad));c.baseAS=String(d.as);c.initMana=d.init==null?'':String(d.init);c.maxMana=d.max==null?'':String(d.max);
 s.skill=Object.assign(defaultState().skill,Object.fromEntries(Object.entries(d.skill||{}).map(([k,v])=>[k,typeof v==='boolean'?v:String(pk(v))])));applyRole(s,d.role)}
const clone=o=>JSON.parse(JSON.stringify(o));
const newSlot=n=>({name:n||'',variant:'normal',edits:{normal:clone((ITEM_DATA[n]||{}).normal||{}),radiant:clone((ITEM_DATA[n]||{}).radiant||{})}});
const defaultState=()=>({champ:{name:'カスタムチャンピオン',star:'1',role:'その他',memo:'',baseAD:'',bonusAD:'',ap:'',baseAS:'',crit:'25',critMult:'1.4',amp:'',back:false,nCrit:true,sCrit:false,flat:'',asCap:'',initMana:'',maxMana:'',atkMana:'',atkManaTouched:false,regen:'',regenExtra:'',cost:'',manaAfter:'reset',castMana:false,flatType:'true'},
 skill:{name:'',type:'magic',base:'',adR:'',apR:'',hits:'',hitMult:'',crit:'inherit',amp:true,dot:false,dotDmg:'',dotInt:'',dotDur:'',cast:'',rec:'',targets:'',adMul:'',apMul:'',hitsAsPer:'',dAdMul:'',dApMul:'',dDelay:'',bDur:'',bAdMul:'',bApMul:'',ohEvery:'',ohAdMul:'',ohApMul:'',altEvery:'',altCast:'',altAdMul:'',altApMul:'',altResetAS:false,asGain:'',rpN:'',rpAs:'',rpApMul:'',mixPhys:''},
 items:[newSlot(),newSlot(),newSlot()],trait:{ad:'',ap:'',asPct:'',crit:'',critDmg:'',amp:'',sCrit:false,rf:false,rfAmt:'',rfCap:''},ampMode:'add',allowDup:true,sim:{duration:30},target:{armor:'',mr:'',tough:''},ver:DATA_VER});
const hasV=o=>!!o&&Object.entries(o).some(([k,v])=>k==='status'?false:(v&&typeof v==='object')?hasV(v):(v===true||(v!==''&&v!=null&&v!==false&&!isNaN(+v)&&+v!==0)));
const eI=s=>{const seen={};return s.items.filter(x=>{if(!x.name||(s.allowDup===false&&seen[x.name]))return false;seen[x.name]=1;return true})};
const ent=(s,x)=>{const e=x.edits[x.variant]||{};return[e,(e.byRole||{})[s.champ.role]||{}]};
const sumI=(s,k)=>eI(s).reduce((a,x)=>a+ent(s,x).reduce((b,o)=>b+num(o[k])+((k==='ad'||k==='ap')&&s.champ.back?num(o.backAdAp):0),0),0);
const lbl=x=>x.name+(x.variant==='radiant'?'(レディアント)':'');
const unsetItems=s=>eI(s).filter(x=>!hasV(x.edits[x.variant])).map(lbl);
function itemWarnings(s){const W=[],seen={};s.items.forEach(x=>{if(!x.name)return;
 if(s.allowDup===false&&seen[x.name]){W.push(lbl(x)+': 重複のため無視');return}seen[x.name]=1;const e=x.edits[x.variant]||{};
 if(e.note)W.push(lbl(x)+': '+e.note);
 if(!hasV(e))W.push(lbl(x)+': 効果未設定(計算外)');else{if((e.status||'未設定')==='未設定')W.push(lbl(x)+': 数値入力あり・確認状態は未設定(入力値は計算に反映)');}});return W}
// 敵の防御。有効防御=防御×(1−貫通%)。物理=100/(有効物理防御+100)、魔法=100/(有効魔法防御+100)、確定=1。その後に全種別へ ×(100−耐久力)/100。
// 貫通はアイテムごとの最大値(同じ効果は重複しない)。
function defense(s){const t=s.target||{},pen=k=>clamp(Math.max(0,...eI(s).map(i=>num(i.edits[i.variant][k]))),0,100),
 ap=pen('armorPen'),mp=pen('mrPen'),armor=Math.max(0,num(t.armor)),mr=Math.max(0,num(t.mr)),tough=clamp(num(t.tough),0,100),
 ea=armor*(1-ap/100),em=mr*(1-mp/100),dur=(100-tough)/100;
 return{armor,mr,tough,armorPen:ap,mrPen:mp,effArmor:ea,effMR:em,phys:100/(ea+100)*dur,magic:100/(em+100)*dur,tr:dur}}
const critF=(c,m,can)=>can?1+c*(m-1):1;
function selectChampion(s,n){s.champ.name=n;applyChampion(s)}
function applyRole(s,r){s.champ.role=r;if(!s.champ.atkManaTouched&&r in ROLE_MANA)s.champ.atkMana=String(ROLE_MANA[r])}
function derive(s,x={}){const c=s.champ,t=s.trait;
 const adM=1+sumI(s,'adApPct')/100; // ブルーバフ: 加算後にAD/APを割合増加
 const ad=(num(c.baseAD)+num(c.bonusAD)+sumI(s,'ad')+num(t.ad)+(x.ad||0))*adM, ap=(num(c.ap)+sumI(s,'ap')+num(t.ap)+(x.ap||0))*adM;
 const fix=Math.max(0,...eI(s).map(i=>num(i.edits[i.variant].asFix))),cap=nz(c.asCap,5);
 const asRaw=fix>0?fix:num(c.baseAS)*(1+(sumI(s,'asPct')+num(t.asPct)+(x.asPct||0))/100);
 const as=asRaw>0?Math.min(asRaw,cap):0;
 const crit=clamp(num(c.crit)+sumI(s,'critPct')+num(t.crit),0,100)/100, critMult=Math.max(1,num(c.critMult)+sumI(s,'critDmg')+num(t.critDmg));
 const amps=[num(c.amp),...eI(s).map(i=>ent(s,i).reduce((b,o)=>b+num(o.amp),0)),num(t.amp),...(x.amp||[])];
 const amp=s.ampMode==='mul'?amps.reduce((a,v)=>a*(1+v/100),1):1+amps.reduce((a,v)=>a+v,0)/100;
 const mM=1+sumI(s,'manaPct')/100; // アダプティブヘルム: 毎秒回復・攻撃ごとマナを割合増加
 const cx=eI(s).reduce((a,i)=>{const e=i.edits[i.variant];return a+(num(e.critMana)>0&&c.nCrit?crit*(num(e.critMana)-num(e.atkMana)):0)},0);
 return{asB:sumI(s,'asPct')+num(t.asPct)+(x.asPct||0),ad,ap,asRaw,as,capped:asRaw>cap,crit,critMult,amp,regen:(nz(c.regen,1)+num(c.regenExtra)+sumI(s,'manaRegen'))*mM,atkMana:(num(c.atkMana)+sumI(s,'atkMana')+cx)*mM,
  skillCrit:s.skill.crit==='inherit'?!!(c.sCrit||t.sCrit||eI(s).some(i=>ent(s,i)[0].skillCrit)):s.skill.crit==='yes'}}
// 効果ブロックを実行用の配列に変換。「有効」にチェックされ、必要な数値が入っているものだけ。
function buildFx(s){const F={ts:[],as:[],ex:[],bn:[],ca:[],cf:[]};
 eI(s).forEach(x=>{const fx=x.edits[x.variant].fx||{},n=lbl(x);
  ['ts','ts2'].forEach(i=>{const a=fx[i];if(a&&a.on&&num(a.int)>0&&num(a.amt))F.ts.push({n,stat:a.stat||'asPct',int:num(a.int),amt:num(a.amt),cap:nz(a.cap,Infinity)})});
  ['as','as2','as3'].forEach(i=>{const b=fx[i];if(b&&b.on&&num(b.amt))F.as.push({n,stat:b.stat||'asPct',every:Math.max(1,nz(b.everyN,1)),amt:num(b.amt),cap:nz(b.cap,Infinity)})});
  const e=fx.ex,d=fx.bn,m=fx.ca,f=fx.cf;
  if(e&&e.on)F.ex.push({n,trg:e.trg||'attack',dt:e.dt||'true',every:Math.max(1,nz(e.everyN,1)),dmg:num(e.dmg),adR:num(e.adR),apR:num(e.apR)});
  if(d&&d.on&&num(d.int)>0)F.bn.push({n,trg:d.trg||'attack',dt:d.dt||'true',dmg:num(d.dmg),adR:num(d.adR),apR:num(d.apR),int:num(d.int),dur:num(d.dur),act:false,nt:0,end:0,val:0});
  if(m&&m.on&&num(m.amp))F.ca.push({n,mode:m.mode||'always',amp:num(m.amp),dur:num(m.dur),until:-1});
  if(f&&f.on&&num(f.buff))F.cf.push({n,buff:num(f.buff),max:nz(f.max,Infinity),dur:num(f.dur)})});
 const t=s.trait;if(t.rf&&num(t.rfAmt))F.as.push({n:'ラピッドファイア',stat:'asPct',every:1,amt:num(t.rfAmt),cap:nz(t.rfCap,Infinity)});
 return F}
// 同時刻の処理順: 詠唱終了(ダメージ) → 硬直終了 → ASスタック変化 → DoT tick → 毎秒マナ回復 → 通常攻撃。
// マナが満タンになった直後にスキル発動判定。スタックは「その時刻までに得たもの」を参照(攻撃スタックは当該攻撃を含まない)。
function simulate(s){const T=nz(s.sim.duration,30),k=s.skill,c=s.champ,FX=buildFx(s);
 let asAcc=0,repl=0,bUntil=-1,curAlt=false,skillEnd=0;
 const DF=defense(s),sdt=k.type||'magic',mixP=clamp(nz(k.mixPhys,50),0,100)/100,
  mult=dt=>dt==='phys'?DF.phys:dt==='magic'?DF.magic:dt==='mix'?mixP*DF.phys+(1-mixP)*DF.magic:DF.tr; // 通常攻撃=物理、スキル=スキルの種別、追加固定/アイテム=各欄の種別(既定は確定)
 const put=(x,st,v)=>{if(st==='amp')x.amp.push(v);else x[st]+=v};
 const dyn=(t,a)=>{const x={ad:0,ap:0,asPct:asAcc+(repl>0?num(k.rpAs):0),amp:[]};
  FX.ts.forEach(f=>put(x,f.stat,Math.min(f.cap,Math.floor(t/f.int+1e-9))*f.amt));
  FX.as.forEach(f=>put(x,f.stat,Math.min(f.cap,Math.floor(a/f.every))*f.amt));
  FX.ca.forEach(f=>{if(f.mode==='always'||(f.mode==='start'&&t<f.dur-1e-9)||((f.mode==='attack'||f.mode==='skill')&&t<f.until-1e-9))x.amp.push(f.amp)});
  if(FX.cf.length){const d1=derive(s,x);FX.cf.forEach(f=>x.amp.push(Math.min(f.max,d1.as*d1.crit*f.dur)*f.buff))} // ストライカー型: スタック=AS×クリ率×持続(上限あり)
  return derive(s,x)};
 const d0=dyn(0,0),max=num(c.maxMana),mn=sumI(s,'minMana'),cutPct=sumI(s,'castCut'),castT=Math.max(0,num(k.cast)),rec=Math.max(0,num(k.rec)),tg=nz(k.targets,1);
 const ev=[],casts=[];let mx=max>0?Math.max(mn,max-sumI(s,'manaCut')):0,attacks=0,skills=0,mana=0;mana=clamp(num(c.initMana),0,mx);
 let t=0,ce=Infinity,fr=Infinity,rg=1,at=d0.as>0?1/d0.as:Infinity,curAS=d0.as,casting=false,busy=false,g=0;
 const nextStk=tt=>{let m=Infinity;FX.ts.forEach(f=>{if(f.stat!=='asPct')return;const n=Math.floor(tt/f.int+1e-9)+1;if(n<=f.cap)m=Math.min(m,n*f.int)});return m};
 let stk=nextStk(0);
 const add=(tm,cat,amt,label,dt)=>{if(tm<=T+1e-9&&amt>0)ev.push({t:tm,cat,amt:amt*mult(dt),raw:amt,label})}; // amt=防御適用後、raw=防御適用前
 const trig=(kind,D)=>{const cnt=kind==='attack'?attacks:skills;
  FX.ex.forEach(f=>{if(f.trg===kind&&cnt%f.every===0)add(t,'item',(f.dmg+D.ad*f.adR+D.ap*f.apR)*D.amp,f.n,f.dt)});
  FX.bn.forEach(b=>{if(b.trg!==kind)return;b.val=(b.dmg+D.ad*b.adR+D.ap*b.apR)*D.amp;b.end=t+b.dur;if(!b.act&&t+b.int<=b.end+1e-9){b.act=true;b.nt=t+b.int}});
  FX.ca.forEach(f=>{if(f.mode===kind)f.until=t+f.dur})};
 // 「(AD)/(AP)」型 = 基礎値×(1+増加AD/100) 等。増加AD=最終AD−基礎AD、増加AP=AP。
 const comp=(D,a,p)=>(num(a)?num(a)*(1+(D.ad-num(c.baseAD))/100):0)+(num(p)?num(p)*(1+D.ap/100):0);
 const sAmp=D=>(k.amp?D.amp:1)*tg*critF(D.crit,D.critMult,D.skillCrit);
 const skillHit=(tm,alt)=>{const D=dyn(tm,attacks),af=k.amp?D.amp:1,cf=critF(D.crit,D.critMult,D.skillCrit);
  const hits=nz(k.hits,1)+(num(k.hitsAsPer)>0?Math.floor(D.asB/num(k.hitsAsPer)+1e-9):0);
  const raw=(alt?comp(D,k.altAdMul,k.altApMul):num(k.base)+D.ad*num(k.adR)+D.ap*num(k.apR)+comp(D,k.adMul,k.apMul))*nz(k.hitMult,1);
  add(tm,'skill',raw*cf*af*hits*tg,'スキル',sdt);
  if(!alt&&(num(k.dAdMul)||num(k.dApMul)))add(tm+num(k.dDelay),'skill',comp(D,k.dAdMul,k.dApMul)*cf*af*tg,'追撃',sdt);
  if(num(k.bDur)>0)bUntil=tm+num(k.bDur)*(1+D.ap/100);
  if(num(k.asGain)>0){if(alt&&k.altResetAS)asAcc=0;else asAcc+=num(k.asGain)*(1+D.ap/100)}
  if(num(k.rpN)>0)repl=num(k.rpN);
  if(k.dot&&num(k.dotInt)>0)for(let i=1;i*num(k.dotInt)<=num(k.dotDur)+1e-9;i++)add(tm+i*num(k.dotInt),'dot',num(k.dotDmg)*af*tg,'DoT',sdt);
  skills++;trig('skill',D)};
 const tryCast=()=>{const cst=num(c.cost)||mx;if(!(mx>0&&cst>0&&mana>=mx-1e-9&&!busy))return;
  casts.push(t);mana=c.manaAfter==='reset'?0:Math.max(0,mana-cst);if(cutPct>0)mx=Math.max(mn,mx*(1-cutPct/100));const n=casts.length,alt=num(k.altEvery)>0&&n%num(k.altEvery)===0;curAlt=alt;casting=busy=true;ce=t+(alt&&num(k.altCast)>0?num(k.altCast):castT);const dl=!alt&&(num(k.dAdMul)||num(k.dApMul))?num(k.dDelay):0;skillEnd=ce+dl;fr=ce+dl+rec;at=Infinity}; // 追撃の遅延もスキル中(通常攻撃なし)
 tryCast();
 while(g++<200000){const dt=Math.min(Infinity,...FX.bn.filter(b=>b.act).map(b=>b.nt));
  const tm=Math.min(ce,fr,stk,dt,rg,at);if(!(tm<=T+1e-9))break;t=tm;
  if(tm===ce){ce=Infinity;casting=false;skillHit(t,curAlt)}
  else if(tm===fr){fr=Infinity;busy=false;const n=dyn(t,attacks).as;curAS=n;at=n>0?t+1/n:Infinity;tryCast()}
  else if(tm===stk){stk=nextStk(t);const n=dyn(t,attacks).as;if(at<Infinity&&n>0){at=t+(at-t)*curAS/n;curAS=n}}
  else if(tm===dt){FX.bn.forEach(b=>{if(b.act&&b.nt===tm){add(tm,'dot',b.val,b.n,b.dt);b.nt+=b.int;if(b.nt>b.end+1e-9)b.act=false}})}
  else if(tm===rg){rg+=1;if(!(t<skillEnd-1e-9&&!c.castMana)&&repl===0)mana=Math.min(mx,mana+d0.regen);tryCast()}
  else{const D=dyn(t,attacks),lock=repl>0;
   if(repl>0){add(t,'skill',comp(D,0,k.rpApMul)*sAmp(D),'置換攻撃',sdt);repl--}
   else{add(t,'normal',num(c.baseAD)*(1+(D.ad-num(c.baseAD))/100)*critF(D.crit,D.critMult,c.nCrit)*D.amp,'通常攻撃','phys');add(t,'extra',num(c.flat),'追加固定',c.flatType||'true');
    if(t<bUntil-1e-9&&(num(k.bAdMul)||num(k.bApMul)))add(t,'skill',comp(D,k.bAdMul,k.bApMul)*sAmp(D),'強化中の追加',sdt)}
   attacks++;if(num(k.ohEvery)>0&&attacks%num(k.ohEvery)===0)add(t,'skill',comp(D,k.ohAdMul,k.ohApMul)*sAmp(D),'通常攻撃追加',sdt);
   trig('attack',D);if(!lock)mana=Math.min(mx,mana+D.atkMana);const n=dyn(t,attacks).as;curAS=n;at=n>0?t+1/n:Infinity;tryCast()}}
 ev.sort((a,b)=>a.t-b.t);const totals={normal:0,skill:0,extra:0,item:0,dot:0},raws={normal:0,skill:0,extra:0,item:0,dot:0};ev.forEach(e=>{totals[e.cat]+=e.amt;raws[e.cat]+=e.raw});raws.all=raws.normal+raws.skill+raws.extra+raws.item+raws.dot;
 totals.all=totals.normal+totals.skill+totals.extra+totals.item+totals.dot;
 return{d:d0,dEnd:dyn(T,attacks),T,ev,casts,attacks,skills,totals,raws,DF,finalMana:mana}}

// ===== 5〜6. 画面とイベント処理 =====
const $=i=>document.getElementById(i),g=(o,p)=>p.split('.').reduce((a,k)=>a&&a[k],o);
const st=(o,p,v)=>{const k=p.split('.'),l=k.pop();k.reduce((a,x)=>a[x]||(a[x]={}),o)[l]=v};
let S=loadState();const save=()=>saveState(S);
const F=(p,l,t='n',o=[])=>{const v=g(S,p);
 if(t==='b')return `<label class="f ck"><input type="checkbox" data-p="${p}"${v?' checked':''}>${l}</label>`;
 if(t==='s')return `<label class="f">${l}<select data-p="${p}">${o.map(x=>`<option value="${x[0]}"${x[0]==v?' selected':''}>${x[1]}</option>`).join('')}</select></label>`;
 return `<label class="f">${l}<input data-p="${p}" ${t==='n'?'type="number" step="any" inputmode="decimal"':'type="text"'} value="${v==null?'':v}"></label>`};
const ROLES=['タンク','ファイター','アサシン','マークスマン','キャスター','スペシャリスト','その他'].map(x=>[x,x]);
function renderA(){const c=S.champ,d=CHAMP_DATA[c.name],star=num(c.star),custom=!d;
 const sm=d?`${c.role} / 基礎AD ${c.baseAD} / 基礎AS ${c.baseAS} / マナ ${c.maxMana?`${c.initMana||0}→${c.maxMana}`:'なし'}`:'カスタム: 詳細を開いて数値を入力してください';
 const sk=[['base','基礎ダメージ'],['adR','AD倍率'],['apR','AP倍率'],['hits','ヒット数(空=1)'],['hitMult','1ヒット倍率(空=1)'],['targets','対象数(空=1)'],['cast','詠唱時間(秒)'],['rec','後硬直(秒)']];
 const sp=[['adMul','(AD)型の基礎値'],['apMul','(AP)型の基礎値'],['hitsAsPer','追加ヒット: 増加ASが何%ごとに+1'],['dAdMul','追撃(AD)'],['dApMul','追撃(AP)'],['dDelay','追撃の遅延(秒)'],['bDur','強化持続(秒・AP乗算)'],['bAdMul','強化中の通常攻撃追加(AD)'],['bApMul','強化中の通常攻撃追加(AP)'],['ohEvery','通常攻撃N回ごとに追加(N)'],['ohAdMul','その追加(AD)'],['ohApMul','その追加(AP)'],['altEvery','N回目の発動で特殊スキル(N)'],['altCast','特殊の詠唱(秒・空=通常)'],['altAdMul','特殊(AD)'],['altApMul','特殊(AP)'],['asGain','発動でAS獲得(%・AP乗算)'],['rpN','通常攻撃を置換する回数'],['rpAs','置換中のAS増加(%)'],['rpApMul','置換ダメージ(AP)']];
 $('pA').innerHTML=`<h2>A. チャンピオン</h2><div class="cg">${CHAMPS.map(n=>{const on=n==='カスタムチャンピオン'?custom:n===c.name;return `<button class="cc${on?' on':''}" data-champ="${n}">${CHAMP_IMG[n]?`<img src="${CHAMP_IMG[n]}" alt="">`:'<span class="ph">＋</span>'}<span>${n==='カスタムチャンピオン'?'カスタム':n}</span></button>`}).join('')}</div>
<div class="seg">${[1,2,3].map(i=>`<button class="sg${star===i?' on':''}" data-star="${i}">${i}★</button>`).join('')}</div>
<div class="sm">${sm}${d&&d.note?`<br>${d.note}`:''}</div>
<div class="g">${F('champ.bonusAD','追加AD')}${F('champ.ap','AP')}${F('champ.role','役割','s',ROLES)}${F('champ.back','後衛配置(ヘルム効果用)','b')}</div>
<details><summary>ステータス詳細</summary><div class="g">${custom?F('champ.name','名前','t'):''}${F('champ.baseAD','基礎AD')}${F('champ.baseAS','基礎AS')}${F('champ.asCap','AS上限(空=5)')}${F('champ.crit','クリ率(%)')}${F('champ.critMult','クリ倍率(1.4等)')}${F('champ.amp','ダメージ増幅(%)')}${F('champ.flat','攻撃毎の追加固定ダメ')}${F('champ.flatType','追加固定ダメの種別','s',DT_OPT)}${F('champ.nCrit','通常攻撃クリ可','b')}${F('champ.sCrit','スキルクリ可','b')}${F('champ.memo','メモ','t')}</div></details>
<details><summary>マナ詳細</summary><div class="g">${F('champ.initMana','初期マナ')}${F('champ.maxMana','必要マナ(最大)')}${F('champ.cost','消費マナ(空=必要マナ)')}${F('champ.atkMana','攻撃毎マナ')}${F('champ.regen','毎秒回復(空=1)')}${F('champ.regenExtra','追加の毎秒回復')}${F('champ.manaAfter','発動後のマナ','s',[['reset','0にリセット'],['carry','残量を引き継ぐ']])}${F('champ.castMana','スキル中もマナ回復','b')}</div></details>
<details><summary>スキル詳細</summary><div class="g">${F('skill.name','名前','t')}${F('skill.type','種別','s',[['phys','物理'],['magic','魔法'],['true','確定'],['mix','混合']])}${F('skill.mixPhys','混合: 物理の割合(%)(空=50)')}${sk.map(([k,l])=>F('skill.'+k,l)).join('')}${F('skill.crit','スキルクリ','s',[['inherit','チャンピオン設定'],['yes','可'],['no','不可']])}${F('skill.amp','増幅の対象','b')}${F('skill.dot','DoTあり','b')}${F('skill.dotDmg','DoT1tick')}${F('skill.dotInt','DoT間隔(秒)')}${F('skill.dotDur','DoT持続(秒)')}</div>
<h3>特殊挙動</h3><div class="g">${sp.map(([k,l])=>F('skill.'+k,l)).join('')}${F('skill.altResetAS','特殊発動でAS獲得を全消費','b')}</div></details>`}
const SL=Object.fromEntries(STAT_OPT);
function summ(e){const a=ITEM_KEYS.filter(([k])=>num(e[k])).map(([k,l])=>`${l} ${e[k]}`),f=e.fx||{};if(e.skillCrit)a.push('スキルがクリ可能');
 ['ts','ts2'].forEach(i=>f[i]&&f[i].on&&a.push(`${f[i].int}秒ごと ${SL[f[i].stat]}+${f[i].amt}`));
 ['as','as2','as3'].forEach(i=>f[i]&&f[i].on&&a.push(`攻撃${f[i].everyN||1}回ごと ${SL[f[i].stat]}+${f[i].amt}(上限${f[i].cap||'なし'})`));
 if(f.cf&&f.cf.on)a.push(`クリ連動増幅 ${f.cf.buff}%/スタック(最大${f.cf.max}, スタック=AS×クリ率×${f.cf.dur})`);
 ['ex','bn','ca'].forEach(i=>f[i]&&f[i].on&&a.push({ex:'追加ダメージ',bn:'燃焼/DoT',ca:'条件付き増幅'}[i]));return a.join(' / ')||'(効果なし)'}
function blk(i,x,b){const [id,l,fs]=b,p=`items.${i}.edits.${x.variant}`,fx=x.edits[x.variant].fx||{};
 const body=id==='rl'?ITEM_KEYS.slice(0,8).map(([k,t])=>F(`${p}.byRole.${S.champ.role}.${k}`,t)).join(''):(id==='sh'?'':F(`${p}.fx.${id}.on`,'有効','b'))+fs.map(([k,t,ty,o])=>F(`${p}.fx.${id}.${k}`,t,ty||'n',o||[])).join('');
 return `<details${fx[id]&&fx[id].on?' open':''}><summary>${l}${id==='rl'?`(現在の役割: ${S.champ.role})`:''}</summary><div class="g">${body}</div></details>`}
let PICK=-1;
const itemImg=(n,v)=>{const o=ITEM_IMG[n];return o?(o[v]||o.normal||''):''};
const ICON=(n,v)=>itemImg(n,v)?`<img src="${itemImg(n,v)}" alt="">`:'<span class="ph">＋</span>';
function renderB(){$('pB').innerHTML=`<h2>B. アイテム(3枠)</h2><div class="g" style="grid-template-columns:1fr">${F('allowDup','同一アイテムの重複を許可','b')}</div><div class="sm">枠をタップするとアイテム一覧が開きます。選ぶと数値と効果が自動で入ります。変えたい時だけ「数値を編集」を開いてください。</div>`+S.items.map((x,i)=>{const p=`items.${i}.edits.${x.variant}`,e=x.edits[x.variant]||{};
 return `<div class="sl"><button class="cc sb${PICK===i?' on':''}" data-pick="${i}">${ICON(x.name,x.variant)}<span>${x.name||'アイテムを選ぶ'}</span></button>${x.name?`<div class="seg">${[['normal','通常'],['radiant','レディアント']].map(([v,l])=>`<button class="sg${x.variant===v?' on':''}" data-var="${v}" data-slot="${i}">${l}</button>`).join('')}</div>`:''}</div>`
 +(PICK===i?`<div class="cg ip"><button class="cc" data-item="" data-slot="${i}"><span class="ph">✕</span><span>なし</span></button>${ITEM_NAMES.map(n=>`<button class="cc${n===x.name?' on':''}" data-item="${n}" data-slot="${i}">${ICON(n,x.variant)}<span>${n}</span></button>`).join('')}</div>`:'')
 +(x.name?`<div class="sm">${hasV(e)?`[${e.status||'未設定'}] ${summ(e)}`:'効果未設定(この版のデータなし。計算に含まれません)'}${e.note?`<br>注: ${e.note}`:''}</div><details><summary>数値を編集</summary><div class="g">${F(p+'.status','確認状態','s',[['未設定','未設定'],['仮','仮'],['確認済み','確認済み']])}${ITEM_KEYS.map(([k,l])=>F(`${p}.${k}`,l)).join('')}${F(p+'.skillCrit','スキルがクリ可能になる','b')}${F(p+'.note','メモ','t')}</div>${BLOCKS.map(b=>blk(i,x,b)).join('')}</details>`:'')}).join('')}
function renderC(){$('pC').innerHTML=`<h2>C. 特性・追加補正</h2><div class="sm">特性の補正値を入れる場合だけ開いてください(未入力なら影響なし)。</div><details><summary>特性・追加補正を入力</summary><div class="g">${F('trait.ad','追加AD')}${F('trait.ap','追加AP')}${F('trait.asPct','追加AS(%)')}${F('trait.crit','追加クリ率(%)')}${F('trait.critDmg','追加クリ倍率')}${F('trait.amp','ダメージ増幅(%)')}${F('trait.sCrit','スキルがクリ可能になる','b')}${F('trait.rf','ラピッドファイア','b')}${F('trait.rfAmt','1攻撃ごとAS増加(%)')}${F('trait.rfCap','最大スタック(空=無制限)')}${F('ampMode','増幅の合成','s',[['add','加算'],['mul','乗算']])}</div></details>`}
function renderD(){$('pD').innerHTML=`<h2>D. シミュレーション</h2><h3>敵のステータス(0・空欄=軽減なし)</h3><div class="g">${F('target.armor','物理防御')}${F('target.mr','魔法防御')}${F('target.tough','耐久力(%)')}</div><h3>実行</h3><div class="g">${F('sim.duration','戦闘時間(秒)')}<button id="run">計算実行</button><button id="reset" class="s">初期値に戻す</button><button id="tst" class="s">テスト実行</button></div><div id="out"></div>
<details><summary>計算の前提</summary><ul><li>最初の通常攻撃は開始から1/AS秒後。以降は攻撃ごとに、その時点のASで次回攻撃時刻を再計算。</li><li>同時刻の処理順: 詠唱終了→硬直終了→ASスタック変化→DoT tick→毎秒回復→通常攻撃。毎秒回復は1秒ごと。</li><li>詠唱中は通常攻撃なし。ダメージは詠唱終了時に発生。後硬直後、1/AS秒で通常攻撃を再開。</li><li>時間経過スタック=floor(経過秒/間隔)個。攻撃スタック=その攻撃の直前までの攻撃回数÷N(当該攻撃は含まない)。</li><li>時間スタックでASが変わる時刻に、攻撃までの残り時間を新旧ASの比で再計算。</li><li>追加ダメージ=N回ごと(固定+AD倍率+AP倍率)×増幅。クリなし。『アイテム追加』として別集計。</li><li>燃焼/DoT=契機で付与。再付与は持続を延長(同一効果は重複しない)。1tick値は付与時点のステータスで固定し、増幅を適用。</li><li>条件付き増幅=常時/開始からX秒/契機後X秒(契機が続く間は延長)。</li><li>追加固定ダメージは増幅・クリ対象外。</li><li>スキル1ヒット=(基礎+AD×倍率+AP×倍率)×1ヒット倍率。ヒット数は合計。DoTはクリなし。</li><li>増加ステータスは加算。例外: ブルーバフはAD/AP(スタック分含む)を加算した後に割合増加、アダプティブヘルムは毎秒回復と攻撃ごとマナ(ショウジン・ナッシャー分含む)を割合増加。割合効果が複数ある場合は割合を合算。</li><li>ASは基礎AS×(1+加算分の合計)。グインソー等の毎秒スタックは同じ加算に入る。</li><li>ストライカー系は スタック=min(最大, AS×クリ率×持続) の小数のまま増幅に反映。</li><li>ナッシャーは通常攻撃クリ可能なら期待値(基本マナ×(1−クリ率)+クリ時マナ×クリ率)。</li><li>「計算しない」とされた効果(燃焼・重症・回復)は含めず、アイテム欄の注に表示。ダメージ増加(DamageAmp)は常時の増幅として計算。ジャイアントスレイヤーはタンク特攻が常時発動する前提で、ダメージ増加を2倍(通常30%/レディアント60%)で入力済み。</li><li>後衛配置のチェックでアダプティブヘルムのAD/AP加算を適用(既定はオフ)。</li><li>基礎クリ率25%・クリ倍率1.4を既定値として入力済み(ユーザー指定)。スキルはIE/ジュエルガントレット等でのみクリ可能。</li><li>通常攻撃のダメージ=基礎AD×(1+増加AD/100)(増加AD=最終AD−基礎AD)。この値にクリティカル期待値とダメージ増加を掛ける。</li><li>スキルの「(AD)/(AP)」表記=基礎値×(1+増加AD/100)(APなら×(1+AP/100))。増加AD=最終AD−基礎AD。スキル発動でマナは0になる。</li><li>チャンピオン選択で★に応じた数値が入る(基礎APは0、毎秒マナ1、クリ25%は既定)。マナなしの者は最大マナ空欄で、通常攻撃N回ごとの追加ダメージを『スキル』として集計。</li><li>スキル中(詠唱+追撃などの遅延が終わるまで)は通常攻撃をせず、マナ回復もしない(設定でマナ回復は可)。特殊挙動の近似はチャンピオン欄の注を参照。</li><li>敵の防御: 種別ごとに 物理=100/(有効物理防御+100)、魔法=100/(有効魔法防御+100)、確定=軽減なし。その後、全種別に×(100−耐久力)/100。通常攻撃は物理、スキルはスキルの種別(混合は物理割合で按分)。追加固定ダメ・アイテム追加・燃焼は各欄の種別(既定は確定)。</li><li>防御貫通: ラストウィスパーは物理防御、ヴォイドスタッフは魔法防御を30%貫通(戦闘開始から常時)。有効防御=防御×(1−貫通%)。同じ貫通は複数装備しても重ならない。</li><li>未入力は0(ヒット数・倍率・対象数は1、毎秒回復は1、AS上限は5)。</li></ul></details>`}
const NAMES={all:['合計','--tx',2.5],normal:['通常攻撃','--ac',1.5],skill:['スキル','--c2',1.5],extra:['追加固定','--c3',1.5],item:['アイテム追加','--c5',1.5],dot:['DoT','--c4',1.5]};
function draw(r){const cv=$('cv');if(!cv)return;const dpr=devicePixelRatio||1,w=cv.clientWidth,h=260;cv.width=w*dpr;cv.height=h*dpr;const x=cv.getContext('2d');x.scale(dpr,dpr);
 const cs=getComputedStyle(document.documentElement),col=n=>cs.getPropertyValue(n).trim(),L=52,B=22,P=8,pw=w-L-P,ph=h-P-B,mx=Math.max(1,r.totals.all),T=r.T;
 const X=t=>L+pw*t/T,Y=v=>P+ph-ph*v/mx;x.font='11px sans-serif';x.fillStyle=col('--mu');x.strokeStyle=col('--ln');x.lineWidth=1;
 for(let i=0;i<=4;i++){const v=mx*i/4;x.beginPath();x.moveTo(L,Y(v));x.lineTo(w-P,Y(v));x.stroke();x.fillText(Math.round(v),2,Y(v)+4)}
 const stp=Math.max(1,Math.round(T/6));for(let t=0;t<=T;t+=stp)x.fillText(t+'s',X(t)-8,h-6);
 for(const k in NAMES){let c=0;x.beginPath();x.moveTo(X(0),Y(0));r.ev.forEach(e=>{if(k!=='all'&&e.cat!==k)return;x.lineTo(X(e.t),Y(c));c+=e.amt;x.lineTo(X(e.t),Y(c))});x.lineTo(X(T),Y(c));x.strokeStyle=col(NAMES[k][1]);x.lineWidth=NAMES[k][2];x.stroke()}}
const f1=v=>(Math.round(v*100)/100).toLocaleString();
function run(){const r=simulate(S),d=r.d,T=r.T,c=S.champ,out=[];
 const W=[];if(!num(c.baseAD)&&!num(c.baseAS))W.push('基礎AD・基礎ASが未入力です。');if(!num(c.maxMana))W.push('必要マナが未入力のためスキルは発動しません。');
 if(d.capped)W.push(`ASが上限を超えたため ${f1(d.as)} に制限しました(元の値 ${f1(d.asRaw)})。`);
 if(S.skill.type==='mix'&&S.skill.mixPhys==='')W.push('混合ダメージの物理割合が未入力のため50%として計算しています。');
 itemWarnings(S).forEach(n=>W.push(n+'。'));
 $('out').innerHTML=`${W.map(x=>`<div class="w">${x}</div>`).join('')}<div class="k">
<div><b>${f1(r.totals.all)}</b><span>${T}秒時点の累積ダメージ(防御適用後)</span></div><div><b>${f1(r.totals.all/T)}</b><span>平均DPS</span></div><div><b>${f1(r.raws.all)}</b><span>防御適用前の合計</span></div><div><b>${f1(r.DF.effArmor)}</b><span>有効物理防御(貫通${f1(r.DF.armorPen)}%)</span></div><div><b>${f1(r.DF.effMR)}</b><span>有効魔法防御(貫通${f1(r.DF.mrPen)}%)</span></div><div><b>${f1(r.DF.tough)}%</b><span>耐久力</span></div>
<div><b>${r.attacks}</b><span>通常攻撃回数</span></div><div><b>${r.casts.length}</b><span>スキル発動回数</span></div>
<div><b>${f1(r.totals.normal)}</b><span>通常攻撃合計</span></div><div><b>${f1(r.totals.skill)}</b><span>スキル合計</span></div>
<div><b>${f1(r.totals.extra)}</b><span>追加固定合計</span></div><div><b>${f1(r.totals.item)}</b><span>アイテム追加合計</span></div><div><b>${r.skills}</b><span>スキルダメージ発生回数</span></div><div><b>${f1(r.totals.dot)}</b><span>DoT合計</span></div>
<div><b>${f1(r.dEnd.as)}</b><span>終了時AS(開始時 ${f1(d.as)})${r.dEnd.capped||d.capped?'・上限到達':''}</span></div><div><b>${f1(d.regen)}</b><span>毎秒マナ回復</span></div>
<div><b>${c.nCrit&&d.crit>0?'適用':'なし'}/${d.skillCrit&&d.crit>0?'適用':'なし'}</b><span>クリ期待値(通常/スキル)</span></div></div>
<h3>発動時刻</h3><div>${r.casts.length?r.casts.map(x=>f1(x)+'s').join(', '):'なし'}</div>
<canvas id="cv"></canvas><div class="lg">${Object.values(NAMES).map(n=>`<span style="color:var(${n[1]})">━ ${n[0]}</span>`).join('')}</div>
<h3>イベントログ(先頭300件)</h3><pre>${r.ev.slice(0,300).map(e=>`${e.t.toFixed(2)}s ${e.label} +${f1(e.amt)}${Math.abs(e.amt-e.raw)>1e-9?`(防御前 ${f1(e.raw)})`:''}`).join('\n')}</pre>`;draw(r)}
function all(){renderA();renderB();renderC();renderD();run()}
document.addEventListener('input',e=>{const el=e.target,p=el.dataset&&el.dataset.p;if(!p)return;
 const v=el.type==='checkbox'?el.checked:el.value;
 if(/^items\.\d\.name$/.test(p)){S.items[+p.split('.')[1]]=newSlot(v);save();renderB();run();return}
 st(S,p,v);if(p==='champ.atkMana')S.champ.atkManaTouched=true;
 if(p==='champ.name'&&CHAMP_DATA[v]){applyChampion(S);renderA()}
 if(p==='champ.role'){applyRole(S,v);const a=document.querySelector('[data-p="champ.atkMana"]');if(a)a.value=S.champ.atkMana;renderB()}
 save();if(/^items\.\d\.variant$/.test(p))renderB();run()});
document.addEventListener('click',e=>{const ib=e.target.closest&&e.target.closest('[data-pick],[data-item],[data-var]');
 if(ib){const d=ib.dataset,i=+(d.slot||d.pick||0);
  if(d.pick!==undefined)PICK=PICK===i?-1:i;
  else if(d.item!==undefined){const v=S.items[i].variant;S.items[i]=newSlot(d.item);if(v==='radiant'&&hasV(S.items[i].edits.radiant))S.items[i].variant='radiant';PICK=-1}
  else S.items[i].variant=d.var;
  save();renderB();run();return}
 const cb=e.target.closest&&e.target.closest('[data-champ],[data-star]');
 if(cb){if(cb.dataset.champ)S.champ.name=cb.dataset.champ;else S.champ.star=cb.dataset.star;applyChampion(S);renderA();renderB();save();run();return}
 const i=e.target.id;
 if(i==='run')run();
 if(i==='reset'){S=defaultState();save();all()}
 if(i==='tst'){const R=runTests();$('out').insertAdjacentHTML('afterbegin',`<pre>${R.filter(x=>x.ok).length}/${R.length} 合格\n`+R.map(x=>`${x.ok?'PASS':'FAIL'} ${x.n} 期待:${JSON.stringify(x.e)} 実際:${JSON.stringify(x.a)}`).join('\n')+'</pre>')}});
addEventListener('resize',()=>{try{run()}catch(e){}});all();
