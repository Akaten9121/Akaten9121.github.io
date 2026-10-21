// ============================================================
// tests.js  検証テスト(画面の「テスト実行」ボタンから実行)
//   仕様書10章の12項目 + 詠唱時間・アイテム効果・チャンピオン・敵の防御などの追加テスト
// ============================================================
function runTests(){const R=[];const S=f=>{const s=defaultState();s.champ.crit='0';s.champ.critMult='';f(s);return s}; // テストは既定のクリ25%/1.4を中立化して開始
 const ck=(n,e,a)=>R.push({n,e,a,ok:typeof e==='number'?Math.abs(e-a)<1e-9:JSON.stringify(e)===JSON.stringify(a)});
 const slot=(n,f)=>{const x={name:n,variant:'normal',edits:{normal:{},radiant:{}}};f(x.edits.normal);return x}; // 効果ブロック単体の検証用(プリセットなし)
 let r=simulate(S(s=>{s.champ.baseAD='100';s.champ.baseAS='1'}));ck('1 AS1/AD100: 攻撃回数',30,r.attacks);ck('1 累積ダメージ',3000,r.totals.all);
 r=simulate(S(s=>{s.champ.baseAD='100';s.champ.baseAS='10'}));ck('2 AS10→実効AS',5,r.d.as);ck('2 攻撃回数(5/秒×30)',150,r.attacks);
 r=simulate(S(s=>{s.champ.baseAD='100';s.champ.baseAS='0'}));ck('3 AS0: 攻撃回数',0,r.attacks);ck('3 ダメージ',0,r.totals.all);
 ck('4 クリ25%/1.4の期待倍率',1.1,critF(0.25,1.4,true));
 r=simulate(S(s=>{s.champ.baseAD='100';s.champ.baseAS='1';s.champ.crit='25';s.champ.critMult='1.4'}));ck('4 30秒累積(3300)',3300,r.totals.all);
 ck('5 ブルーバフ装備の毎秒マナ',6,derive(S(s=>{s.items[0]=newSlot('ブルーバフ')})).regen);
 r=simulate(S(s=>{applyRole(s,'キャスター');s.champ.baseAS='1';s.champ.regen='0';s.champ.maxMana='100';s.sim.duration=3}));ck('6 キャスター攻撃マナ(3回×7)',21,r.finalMana);
 const s7=S(s=>selectChampion(s,'マスター・イー'));ck('7 マスター・イー選択でマナなし(最大マナ空欄)',0,simulate(s7).casts.length);ck('7 役割はキャスターだがスキル用マナは使わない',[true,'2000'],[s7.champ.maxMana==='',String(Math.round(simulate(s7).totals.skill))]);
 r=simulate(S(s=>{s.items[0]=newSlot('ブルーバフ');s.champ.maxMana='60';s.skill.base='10'}));ck('8 満タンで発動(10,20,30秒)',[10,20,30],r.casts);
 r=simulate(S(s=>{s.champ.initMana='10';s.champ.maxMana='10';s.champ.regen='0';s.skill.dot=true;s.skill.dotDmg='10';s.skill.dotInt='2';s.skill.dotDur='6'}));
 ck('9 DoTのtick時刻',[2,4,6],r.ev.filter(e=>e.cat==='dot').map(e=>e.t));ck('9 DoT合計',30,r.totals.dot);
 r=simulate(S(s=>{s.champ.maxMana='29';s.skill.base='500';s.skill.cast='2'}));ck('10 29秒発動',[29],r.casts);ck('10 31秒着弾は30秒時点に含まれない',0,r.totals.skill);
 const s11=S(s=>{s.champ.baseAD='100';s.champ.baseAS='1';s.items[0]=newSlot('フリッカーブレード');s.items[0].variant='radiant'});
 ck('11 未設定アイテムは計算に影響しない',3000,simulate(s11).totals.all);ck('11 レディアント未定義は未設定として一覧化',['フリッカーブレード(レディアント)'],unsetItems(s11));
 const s12=S(s=>{s.items[0]=newSlot('ジャイアントスレイヤー')});
 ck('12 通常版AD(プリセット)',15,derive(s12).ad);s12.items[0].variant='radiant';ck('12 レディアント版AD(プリセット)',30,derive(s12).ad);
 r=simulate(S(s=>{s.champ.baseAD='100';s.champ.baseAS='1';s.champ.initMana='10';s.champ.maxMana='10';s.champ.regen='0';s.skill.base='50';s.skill.cast='3'}));
 ck('13 詠唱中(0〜3秒)は通常攻撃なし',true,r.ev.filter(e=>e.cat==='normal').every(e=>e.t>=3));
 ck('13 スキルダメージは詠唱後(3秒)',[3],r.ev.filter(e=>e.cat==='skill').map(e=>e.t));ck('13 詠唱後の攻撃回数(4〜30秒)',27,r.attacks);
 // ===== フェーズ2 =====
 r=simulate(S(s=>{s.champ.maxMana='15';s.skill.apR='1';s.items[0]=slot('アークエンジェルスタッフ',e=>e.fx={ts:{on:true,stat:'ap',int:'10',amt:'10',cap:'3'}})}));
 ck('P2-1 時間経過AP: 発動時刻',[15,30],r.casts);ck('P2-1 スキル合計(AP10+AP30)',40,r.totals.skill);
 r=simulate(S(s=>{s.champ.baseAD='100';s.champ.baseAS='1';s.items[0]=slot('クラーケンの怒り',e=>e.fx={as:{on:true,stat:'ad',everyN:'1',amt:'10',cap:'3'}})}));
 ck('P2-2 攻撃スタックAD(100,110,120,130×27)',3840,r.totals.all);
 r=simulate(S(s=>{s.champ.baseAD='100';s.champ.baseAS='1';s.items[0]=slot('クラーケンの怒り',e=>e.fx={ex:{on:true,trg:'attack',everyN:'3',dmg:'50'}})}));
 ck('P2-3 3回ごと追加ダメ合計(10回×50)',500,r.totals.item);ck('P2-3 通常攻撃は別集計',3000,r.totals.normal);
 r=simulate(S(s=>{s.champ.baseAD='100';s.champ.baseAS='1';s.items[0]=slot('レッドバフ',e=>e.fx={bn:{on:true,trg:'attack',dmg:'5',int:'1',dur:'3'}})}));
 ck('P2-4 燃焼: 最初のtickは2秒',2,r.ev.find(e=>e.cat==='dot').t);ck('P2-4 燃焼合計(2〜30秒の29tick×5)',145,r.totals.dot);
 r=simulate(S(s=>{s.champ.baseAD='100';s.champ.baseAS='1';s.items[0]=slot('ジャイアントスレイヤー',e=>e.fx={ca:{on:true,mode:'always',amp:'20'}})}));ck('P2-5 常時増幅+20%',3600,r.totals.all);
 r=simulate(S(s=>{s.champ.baseAD='100';s.champ.baseAS='1';s.items[0]=slot('ストライカーフレイル',e=>e.fx={ca:{on:true,mode:'start',amp:'100',dur:'10'}})}));ck('P2-5 開始10秒間+100%(1〜9秒の9回)',3900,r.totals.all);
 ck('P2-6 アイテムでスキルがクリ可能',[false,true],[derive(S(()=>{})).skillCrit,derive(S(s=>{s.items[0]=slot('インフィニティ・エッジ',e=>e.skillCrit=true)})).skillCrit]);
 const hel=role=>derive(S(s=>{s.champ.role=role;s.items[0]=slot('アダプティブヘルム',e=>e.byRole={'タンク':{manaRegen:'2'}})})).regen;
 ck('P2-7 役割別補正(タンク/ファイター)',[3,1],[hel('タンク'),hel('ファイター')]);
 const dup=a=>derive(S(s=>{s.allowDup=a;s.items[0]=slot('ラバドン・デスキャップ',e=>e.ap='10');s.items[1]=slot('ラバドン・デスキャップ',e=>e.ap='10')})).ap;
 ck('P2-8 重複許可/不可のAP',[20,10],[dup(true),dup(false)]);
 r=simulate(S(s=>{s.champ.baseAD='100';s.champ.baseAS='1';s.items[0]=slot('グインソー・レイジブレード',e=>e.fx={ts:{on:true,stat:'asPct',int:'10',amt:'100',cap:'1'}})}));
 ck('P2-9 10秒でAS2倍: 攻撃回数(9+1+40)',50,r.attacks);
 r=simulate(S(s=>{s.champ.baseAD='100';s.champ.baseAS='1';s.items[0]=slot('ラストウィスパー',e=>e.armorPen='30')}));ck('P2-10 敵の防御0なら貫通しても出力は変わらない',3000,r.totals.all);ck('P2-10 貫通値入力済みなので未設定扱いにならない',[],unsetItems(S(s=>{s.items[0]=slot('ラストウィスパー',e=>e.armorPen='30')})));
 r=simulate(S(s=>{s.champ.baseAD='100';s.champ.baseAS='1';s.trait.rf=true;s.trait.rfAmt='10';s.trait.rfCap='2'}));
 let tt=0,cn=0;for(;;){const as=1*(1+(10*Math.min(2,cn))/100);tt+=1/as;if(tt>30+1e-9)break;cn++}
 ck('P2-11 ラピッドファイア(攻撃ごとAS)',cn,r.attacks);
 // ===== アイテムデータ(説明.txt)の検証 =====
 const dv=f=>derive(S(f));
 ck('P3-1 ブルーバフ: (AD100+15)×1.1',126.5,dv(s=>{s.champ.baseAD='100';s.items[0]=newSlot('ブルーバフ')}).ad);
 ck('P3-1 ブルーバフ: AP(0+15)×1.1',16.5,dv(s=>{s.items[0]=newSlot('ブルーバフ')}).ap);
 ck('P3-1 レディアントブルーバフ: (100+30)×1.2',156,dv(s=>{s.champ.baseAD='100';s.items[0]=newSlot('ブルーバフ');s.items[0].variant='radiant'}).ad);
 const hm=dv(s=>{s.champ.atkMana='10';s.items[0]=newSlot('アダプティブヘルム');s.items[1]=newSlot('ショウジンの矛')});
 ck('P3-2 ヘルム+ショウジン: 毎秒(1+3+1)×1.15',5.75,hm.regen);ck('P3-2 攻撃毎マナ(10+5)×1.15',17.25,hm.atkMana);
 ck('P3-3 後衛チェックでヘルムADが加算(+10)',[0,10],[dv(s=>{s.items[0]=newSlot('アダプティブヘルム')}).ad,dv(s=>{s.champ.back=true;s.items[0]=newSlot('アダプティブヘルム')}).ad]);
 ck('P3-4 ナッシャー期待マナ(クリ45%: 2+0.45×2)',2.9,dv(s=>{s.champ.crit='25';s.items[0]=newSlot('ナッシャー・トゥース')}).atkMana);
 const sf=(c,a)=>simulate(S(s=>{s.champ.crit=c;s.champ.baseAS=a;s.items[0]=slot('ストライカーフレイル',e=>e.fx={cf:{on:true,buff:5,max:4,dur:5}})})).dEnd.amp;
 ck('P3-5 ストライカー: クリ75%/AS0.8→3スタック(+15%)',1.15,sf('75','0.8'));ck('P3-5 クリ100%/AS2.0→上限4スタック(+20%)',1.2,sf('100','2'));
 ck('P3-5 ストライカー実データ: 増幅(AS2.2×クリ45%×5=4.95→4スタック)',1.2,simulate(S(s=>{s.champ.crit='25';s.champ.baseAS='2';s.items[0]=newSlot('ストライカーフレイル')})).dEnd.amp);
 r=simulate(S(s=>{s.champ.baseAS='1';s.sim.duration=1;s.items[0]=newSlot('グインソー・レイジブレード')}));
 ck('P3-6 グインソー: 開始時AS 1×(1+0.10)',1.1,r.d.as);ck('P3-6 1秒後 1×(1+0.10+0.07)',1.17,r.dEnd.as);
 r=simulate(S(s=>{s.champ.baseAS='1';s.items[0]=newSlot('シルバーミアの夜明け')}));ck('P3-7 シルバーミア: AS0.5固定→15回',[0.5,15],[r.d.as,r.attacks]);
 r=simulate(S(s=>{s.champ.maxMana='60';s.sim.duration=60;s.items[0]=newSlot('ドーンコア')}));ck('P3-8 ドーンコア: 最大マナ50→45と低下(毎秒2回復)',[25,48],r.casts);
 r=simulate(S(s=>{s.champ.baseAD='100';s.champ.baseAS='1';s.items[0]=newSlot('クラーケンの怒り')}));ck('P3-9 クラーケン: 15回後AD=110+15×3.5',162.5,r.dEnd.ad);
 r=simulate(S(s=>{s.champ.baseAS='1';s.items[0]=newSlot('巨人の誓い')}));ck('P3-10 巨人の誓い: 25スタックでAP50・増幅+10%',[50,1.1],[r.dEnd.ap,r.dEnd.amp]);
 ck('P3-11 エルダーウッド: 30秒でAD 10+7×5',45,simulate(S(s=>{s.items[0]=newSlot('エルダーウッド紋章')})).dEnd.ad);
 ck('P3-12 IE/JGはスキルクリ可能(通常/レディアント)',[true,true,true,true],[['インフィニティ・エッジ','ジュエルガントレット'].map(n=>[newSlot(n),Object.assign(newSlot(n),{variant:'radiant'})].map(x=>derive(S(s=>{s.items[0]=x})).skillCrit))].flat(2));
 ck('P3-13 既定クリ率25%・倍率1.4',[25,'1.4'],[defaultState().champ.crit-0,defaultState().champ.critMult]);
 // ===== チャンピオンデータ(共通すること.txt) =====
 const ch=(n,star,f)=>S(s=>{s.champ.star=star;selectChampion(s,n);f&&f(s)});
 ck('P4-1 ★別ステータス(アフェリオス AD 60/90/135)',[60,90,135],['1','2','3'].map(x=>num(ch('アフェリオス',x).champ.baseAD)));
 ck('P4-1 ★別スキル値(アーリ 1365/2060/10500)',[1365,2060,10500],['1','2','3'].map(x=>num(ch('アーリ',x).skill.apMul)));
 ck('P4-2 スキル後のマナは0(既定)',true,ch('ユナラ','1').champ.manaAfter==='reset');
 r=simulate(ch('ユナラ','1',s=>{s.champ.bonusAD='10';s.champ.initMana='35'}));ck('P4-3 ユナラ: 216×1.1+13=250.6(0.5秒詠唱後)',[0.5,250.6],[r.ev.find(e=>e.cat==='skill').t,Math.round(r.ev.find(e=>e.cat==='skill').amt*1000)/1000]);
 r=simulate(ch('アフェリオス','1',s=>{s.trait.asPct='40';s.champ.initMana='70';s.sim.duration=5}));ck('P4-4 追撃までスキル中: 通常攻撃は3秒以降のみ',true,r.ev.filter(e=>e.cat==='normal').every(e=>e.t>=3));ck('P4-4 アフェリオス: 斬撃7回×70=490(2秒)+追撃490(3秒)',[[2,490],[3,490]],r.ev.filter(e=>e.cat==='skill').map(e=>[e.t,Math.round(e.amt)]));
 r=simulate(ch('ママ・ビーク','1',s=>{s.champ.ap='100';s.champ.initMana='60';s.champ.atkMana='0';s.sim.duration=10.5}));ck('P4-5 ママ鳥: 持続5×(1+1)=10秒で通常攻撃7回×88',616,r.totals.skill);
 r=simulate(ch('ケイル','1'));ck('P4-6 ケイル: 通常攻撃22回×65',1430,r.totals.skill);
 r=simulate(ch('ケイトリン','1'));ck('P4-7 ケイトリン: 21回の攻撃で7回×(190+20)',1470,r.totals.skill);
 r=simulate(ch('アルーン','1',s=>{s.champ.initMana='35';s.champ.regenExtra='34';s.sim.duration=10}));ck('P4-8 アルーン: 4回目だけ特殊(3秒詠唱で2350)',[[1.5,505],[3.5,505],[5.5,505],[9,2350]],r.ev.filter(e=>e.cat==='skill').map(e=>[e.t,e.amt]));
 r=simulate(ch('アジール','1',s=>{s.champ.regenExtra='34';s.sim.duration=5}));ck('P4-9 アジール: 置換攻撃6回×92、通常ダメージなし',[552,0,6],[r.totals.skill,r.totals.normal,r.attacks]);
 const ez=d=>simulate(ch('エズリアル','1',s=>{s.champ.initMana='30';s.champ.regenExtra='29';s.sim.duration=d}));
 ck('P4-10 エズリアル: 3回で270、4回目1155',[[0.5,270],[1.5,270],[2.5,270],[3.5,1155]],ez(4).ev.filter(e=>e.cat==='skill').map(e=>[e.t,e.amt]));
 ck('P4-10 エズリアル: 3回発動後はAS 0.75×(1+0.9)',1.425,ez(3).dEnd.as);ck('P4-10 4回目でAS獲得を全消費(0.75へ戻る)',0.75,ez(3.6).dEnd.as);
 // ===== 通常攻撃=基礎AD×(1+増加AD/100) =====
 const na=f=>simulate(S(s=>{s.champ.baseAD='80';s.champ.bonusAD='10';s.champ.baseAS='1';s.sim.duration=1;f&&f(s)})).totals.normal;
 ck('P5-1 基礎AD80・増加AD10の通常攻撃=88',88,na());
 ck('P5-2 クリ25%/1.4・増幅10%をその後に掛ける(88×1.1×1.1)',88*1.1*1.1,na(s=>{s.champ.crit='25';s.champ.critMult='1.4';s.champ.amp='10'}));
 ck('P5-3 ブルーバフ: 基礎80×(1+((80+10+15)×1.1−80)/100)',80*(1+((80+10+15)*1.1-80)/100),na(s=>{s.items[0]=newSlot('ブルーバフ')}));
 ck('P5-4 ドーンコアのAD=20(確認済み)',[20,'確認済み'],[derive(S(s=>{s.items[0]=newSlot('ドーンコア')})).ad,newSlot('ドーンコア').edits.normal.status]);
 ck('P5-5 アーリのスキル詠唱は3秒(ダメージは3秒後)',3,simulate(S(s=>{selectChampion(s,'アーリ');s.champ.initMana='100';s.sim.duration=10})).ev.find(e=>e.cat==='skill').t);
 // ===== 敵の防御・耐久力・貫通・ジャイアントスレイヤー =====
 const tgt=(a,mr,t,f)=>simulate(S(s=>{s.champ.baseAD='100';s.champ.baseAS='1';s.target.armor=a;s.target.mr=mr;s.target.tough=t;f&&f(s)}));
 const sk=(type,a,mr,t,f)=>simulate(S(s=>{s.champ.initMana='10';s.champ.maxMana='10';s.champ.regen='0';s.skill.base='100';s.skill.type=type;s.sim.duration=1;s.target.armor=a;s.target.mr=mr;s.target.tough=t;f&&f(s)})).totals.skill;
 r=tgt('','','');ck('P6-1 防御0なら軽減なし(防御後/防御前)',[3000,3000],[r.totals.all,r.raws.all]);
 r=tgt('100','','');ck('P6-2 物理防御100で通常攻撃は半分(防御後/防御前)',[1500,3000],[r.totals.all,r.raws.all]);
 ck('P6-2 物理防御200で3分の1',1000,tgt('200','','').totals.all);
 ck('P6-2 魔法防御は通常攻撃(物理)に影響しない',3000,tgt('','100','').totals.all);
 ck('P6-3 魔法スキル×魔法防御100=半分',50,sk('magic','', '100',''));ck('P6-3 物理スキルは魔法防御の影響なし',100,sk('phys','','100',''));
 ck('P6-3 魔法スキルは物理防御の影響なし',100,sk('magic','100','',''));
 ck('P6-4 耐久力20%で通常攻撃×0.8',2400,tgt('','','20').totals.all);ck('P6-4 物理防御100+耐久力20%=3000×0.5×0.8',1200,tgt('100','','20').totals.all);
 ck('P6-4 耐久力は100%を超えない(150→100%で0)',0,tgt('','','150').totals.all);
 ck('P6-5 確定スキルは防御無視',100,sk('true','100','100',''));ck('P6-5 確定スキルにも耐久力20%',80,sk('true','100','100','20'));
 ck('P6-6 混合(既定50%): 物理防御100/魔法防御0=100×(0.5×0.5+0.5)',75,sk('mix','100','',''));
 ck('P6-6 混合・物理100%なら物理だけ',50,sk('mix','100','','',s=>{s.skill.mixPhys='100'}));
 ck('P6-7 ラストウィスパー貫通30%: 物理防御100→有効70',3000*100/170,tgt('100','','',s=>{s.items[0]=slot('ラストウィスパー',e=>e.armorPen='30')}).totals.all);
 ck('P6-7 有効物理防御(100×0.7)',70,tgt('100','','',s=>{s.items[0]=slot('ラストウィスパー',e=>e.armorPen='30')}).DF.effArmor);
 ck('P6-8 ヴォイドスタッフ貫通30%: 魔法防御100→有効70',100*100/170,sk('magic','','100','',s=>{s.items[0]=slot('ヴォイドスタッフ',e=>e.mrPen='30')}));
 ck('P6-8 ヴォイドは物理防御を貫通しない',1500,tgt('100','','',s=>{s.items[0]=slot('ヴォイドスタッフ',e=>e.mrPen='30')}).totals.all);
 ck('P6-9 貫通は重複しない(ラストウィスパー2つでも30%)',30,defense(S(s=>{s.items[0]=slot('ラストウィスパー',e=>e.armorPen='30');s.items[1]=slot('ラストウィスパー',e=>e.armorPen='30')})).armorPen);
 const pr=(n,v)=>{const x=newSlot(n);x.variant=v;return defense(S(s=>{s.items[0]=x}))};
 ck('P6-10 プリセット: LW/VS 通常・レディアントとも貫通30%',[[30,0],[30,0],[0,30],[0,30]],[pr('ラストウィスパー','normal'),pr('ラストウィスパー','radiant'),pr('ヴォイドスタッフ','normal'),pr('ヴォイドスタッフ','radiant')].map(d=>[d.armorPen,d.mrPen]));
 const gs=v=>{const x=newSlot('ジャイアントスレイヤー');x.variant=v;return derive(S(s=>{s.items[0]=x})).amp};
 ck('P6-11 ジャイアントスレイヤーのダメージ増加(通常30%/レディアント60%)',[1.3,1.6],[gs('normal'),gs('radiant')]);
 ck('P6-12 追加固定ダメは既定で確定(物理防御100でも変わらない)',1500,simulate(S(s=>{s.champ.baseAS='1';s.champ.flat='50';s.target.armor='100'})).totals.all);
 ck('P6-12 追加固定ダメを物理にすると半分',750,simulate(S(s=>{s.champ.baseAS='1';s.champ.flat='50';s.champ.flatType='phys';s.target.armor='100'})).totals.all);
 const ix=dt=>simulate(S(s=>{s.champ.baseAS='1';s.target.armor='100';s.items[0]=slot('クラーケンの怒り',e=>e.fx={ex:{on:true,trg:'attack',everyN:'1',dmg:'10',...(dt?{dt}:{})}})})).totals.item;
 ck('P6-13 アイテム追加ダメの種別(既定=確定 300 / 物理 150)',[300,150],[ix(),ix('phys')]);
 ck('P6-14 チャンピオンのスキル種別',{'アフェリオス':'phys','ママ・ビーク':'phys','ケイル':'magic','ユナラ':'phys','アーリ':'magic','アルーン':'magic','ケイトリン':'phys','マスター・イー':'magic','アジール':'magic','エズリアル':'phys'},Object.fromEntries(Object.keys(CHAMP_DATA).map(n=>[n,CHAMP_DATA[n].skill.type])));
 r=simulate(ch('ユナラ','1',s=>{s.champ.initMana='35';s.target.armor='100';s.sim.duration=1}));ck('P6-15 ユナラ(物理): 防御100で半分(防御前/後)',[216+13,(216+13)/2],[r.raws.skill,r.totals.skill]);
 r=simulate(ch('アーリ','1',s=>{s.champ.initMana='100';s.target.armor='100';s.target.mr='100';s.sim.duration=4}));ck('P6-15 アーリ(魔法): 魔法防御100で半分',[1365,682.5],[r.raws.skill,r.totals.skill]);
 return R}
