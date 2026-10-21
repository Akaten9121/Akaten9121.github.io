// ============================================================
// database.js  データ定義(チャンピオン・アイテム・画像の対応)
//   パッチや仕様が変わったときは、基本的にこのファイルだけを編集する。
//   ・チャンピオン: CHAMP_DATA(★1/★2/★3は配列 [★1,★2,★3])
//   ・アイテム    : ITEM_DATA(通常版/レディアント版)。D('名前',通常版,レディアント版)
//   ・画像        : CHAMP_IMG / ITEM_IMG(img/ フォルダ内のファイルへのパス)
//   ・DATA_VER    : 上のデータを更新したら +1 する(保存済みのアイテム枠を再読込させる)
// ============================================================
const ROLE_MANA={'タンク':5,'ファイター':10,'アサシン':10,'マークスマン':10,'キャスター':7,'スペシャリスト':0};
const DATA_VER=3; // アイテム/チャンピオンのデータ版。上げると保存済みアイテム枠をプリセットから再読込する
const CHAMPS=['カスタムチャンピオン','アフェリオス','ママ・ビーク','ケイル','ユナラ','アーリ','アルーン','ケイトリン','マスター・イー','アジール','エズリアル'];
// ===== チャンピオンデータ(共通すること.txt由来。配列は★1/★2/★3) =====
// skill.adMul/apMul = 「(AD)/(AP)」表記の基礎値(×(1+増加AD or AP/100))。ohEvery=通常攻撃N回ごとの追加ダメージ。
const CHAMP_DATA={
'アフェリオス':{role:'マークスマン',ad:[60,90,135],as:0.8,init:20,max:70,skill:{type:'phys',cast:2,hits:5,hitsAsPer:20,adMul:[70,105,850],dAdMul:[450,675,5000],dApMul:[40,60,225],dDelay:1},note:'斬撃は詠唱終了時にまとめて発生(回数=5+増加AS÷20の切捨て)。追撃は1秒後に発生し、追撃までスキル中として通常攻撃・マナ回復を行わない'},
'ママ・ビーク':{role:'マークスマン',ad:[55,83,124],as:0.75,init:20,max:60,skill:{type:'phys',cast:0.5,bDur:5,bAdMul:[88,132,208]},note:'詠唱後、5×(1+AP/100)秒間、通常攻撃ごとに追加物理ダメージ(スキル自体のダメージなし)'},
'ケイル':{role:'マークスマン',ad:[10,15,23],as:0.75,skill:{type:'magic',ohEvery:1,ohApMul:[65,97,145]},note:'マナなし。通常攻撃ごとに追加魔法ダメージ'},
'ユナラ':{role:'マークスマン',ad:[42,63,95],as:0.75,init:0,max:35,skill:{type:'phys',cast:0.5,adMul:[216,324,500],apMul:[13,29,33]}},
'アーリ':{role:'キャスター',ad:[40,60,90],as:0.8,init:20,max:100,skill:{type:'magic',cast:3,apMul:[1365,2060,10500]}},
'アルーン':{role:'キャスター',ad:[40,60,90],as:0.8,init:0,max:35,skill:{type:'magic',cast:1.5,apMul:[505,747,4500],altEvery:4,altCast:3,altApMul:[2350,3600,7500]},note:'4回目・8回目…の発動が特殊スキル(3秒詠唱)'},
'ケイトリン':{role:'マークスマン',ad:[50,75,113],as:0.7,skill:{type:'phys',ohEvery:3,ohAdMul:[190,285,470],ohApMul:[20,30,45]},note:'マナなし。通常攻撃3回ごとに追加物理ダメージ'},
'マスター・イー':{role:'キャスター',ad:[60,90,135],as:0.8,skill:{type:'magic',ohEvery:3,ohApMul:[250,380,570]},note:'マナなし。通常攻撃3回ごとに追加魔法ダメージ'},
'アジール':{role:'キャスター',ad:[30,45,68],as:0.75,init:0,max:35,skill:{type:'magic',cast:0.2,rpN:6,rpAs:150,rpApMul:[92,138,220]},note:'詠唱後、次の通常攻撃6回がAP型の魔法ダメージに置換(AS+150%、その間マナ獲得なし)。置換ダメージはスキル扱い(クリ判定はスキルの設定に従う)'},
'エズリアル':{role:'マークスマン',ad:[45,68,101],as:0.75,init:0,max:30,skill:{type:'phys',cast:0.5,adMul:[270,405,1200],asGain:[30,30,100],altEvery:4,altAdMul:[1155,1740,7500],altResetAS:true},note:'AS獲得量は×(1+AP/100)。4回目の発動で獲得ASを全消費して強化スキルに(詠唱時間は通常と同じと仮定)'}};

const ITEM_NAMES=['グインソー・レイジブレード','ジャイアントスレイヤー','レッドバフ','ラストウィスパー','クラーケンの怒り','巨人の誓い','ナッシャー・トゥース','ヴォイドスタッフ','インフィニティ・エッジ','デスブレード','ヘクステック・ガンブレード','ショウジンの矛','クイックシルバー','ブルーバフ','アダプティブヘルム','ラバドン・デスキャップ','モレロノミコン','ジュエルガントレット','アークエンジェルスタッフ','ストライカーフレイル','エルダーウッド紋章','シルバーミアの夜明け','フリッカーブレード','ドーンコア','ラピッド ファイアキャノン','ルーデン テンペスト'];
// ===== アイテムデータ(説明.txt由来。UIと分離。パッチ変更時はここだけ直す) =====
// %系は百分率の数値(例: AS+10% → asPct:10, DamageAmp 0.15 → amp:15)。fx.*は効果ブロック(buildFx参照)。
const ITEM_DATA={},OK={status:'確認済み'};
const TS=(stat,int,amt)=>({on:true,stat,int,amt}),AS=(stat,everyN,amt,cap)=>({on:true,stat,everyN,amt,cap:cap||''});
const D=(n,a,b)=>{ITEM_DATA[n]={normal:a,radiant:b||{}}};
D('グインソー・レイジブレード',{...OK,ap:10,asPct:10,fx:{ts:TS('asPct',1,7)}},{...OK,ap:20,asPct:25,fx:{ts:TS('asPct',1,16)}});
D('ジャイアントスレイヤー',{...OK,ad:15,ap:15,asPct:15,amp:30,note:'タンク特攻を常時発動とみなし、ダメージ増加を2倍(15→30%)で入力済み'},{...OK,ad:30,ap:30,asPct:30,amp:60,note:'タンク特攻を常時発動とみなし、ダメージ増加を2倍(30→60%)で入力済み'});
D('レッドバフ',{...OK,asPct:45,amp:3,note:'燃焼・重症は計算しない'},{...OK,asPct:80,amp:6,note:'燃焼・重症は計算しない'});
D('ラストウィスパー',{...OK,ad:15,asPct:20,critPct:20,armorPen:30,note:'物理防御を30%貫通(常時発動・重複しない)'},{...OK,ad:45,asPct:40,critPct:40,armorPen:30,note:'物理防御を30%貫通(常時発動・重複しない)'});
D('クラーケンの怒り',{...OK,ad:10,asPct:10,fx:{as:AS('ad',1,3.5,15),as2:AS('asPct',15,15,1)},note:'ADOnAttack×100をAD固定値として解釈'},{...OK,ad:20,asPct:20,fx:{as:AS('ad',1,7,15),as2:AS('asPct',15,30,1)},note:'ADOnAttack×100をAD固定値として解釈'});
D('巨人の誓い',{...OK,asPct:10,fx:{as:AS('ad',1,2,25),as2:AS('ap',1,2,25),as3:AS('amp',25,10,1)},note:'攻撃時のみスタック(被ダメージは考慮しない)。StackingADはAD固定値として解釈'},{...OK,asPct:20,fx:{as:AS('ad',1,4,25),as2:AS('ap',1,4,25),as3:AS('amp',25,20,1)},note:'攻撃時のみスタック(被ダメージは考慮しない)。StackingADはAD固定値として解釈'});
D('ナッシャー・トゥース',{...OK,ap:15,asPct:10,critPct:20,atkMana:2,critMana:4},{...OK,ap:30,asPct:20,critPct:40,atkMana:4,critMana:6});
D('ヴォイドスタッフ',{...OK,ap:35,asPct:15,manaRegen:1,mrPen:30,note:'魔法防御を30%貫通(常時発動・重複しない)'},{...OK,ap:75,asPct:30,manaRegen:2,mrPen:30,note:'魔法防御を30%貫通(常時発動・重複しない)'});
D('インフィニティ・エッジ',{...OK,ad:35,critPct:35,skillCrit:true},{...OK,ad:75,critPct:75,skillCrit:true});
D('デスブレード',{...OK,ad:55,amp:10},{...OK,ad:100,amp:20});
D('ヘクステック・ガンブレード',{...OK,ad:20,ap:20,manaRegen:1,note:'回復・オムニヴァンプは計算しない'},{...OK,ad:40,ap:40,manaRegen:2,note:'回復・オムニヴァンプは計算しない'});
D('ショウジンの矛',{...OK,ad:15,ap:15,manaRegen:1,atkMana:5},{...OK,ad:30,ap:30,manaRegen:2,atkMana:10});
D('クイックシルバー',{...OK,asPct:15,critPct:20,fx:{ts:TS('asPct',1,3)}},{...OK,asPct:40,critPct:40,fx:{ts:TS('asPct',1,6)}});
D('ブルーバフ',{...OK,ad:15,ap:15,manaRegen:5,adApPct:10},{...OK,ad:30,ap:30,manaRegen:10,adApPct:20});
D('アダプティブヘルム',{...OK,manaRegen:3,manaPct:15,backAdAp:10},{...OK,manaRegen:7,manaPct:30,backAdAp:40});
D('ラバドン・デスキャップ',{...OK,ap:55,amp:15},{...OK,ap:100,amp:30});
D('モレロノミコン',{...OK,ap:20,manaRegen:1,note:'燃焼・重症は計算しない'},{...OK,ap:35,manaRegen:2,note:'燃焼・重症は計算しない'});
D('ジュエルガントレット',{...OK,ap:35,critPct:35,skillCrit:true},{...OK,ap:75,critPct:75,skillCrit:true});
D('アークエンジェルスタッフ',{...OK,ap:30,manaRegen:1,fx:{ts:TS('ap',5,20)}},{...OK,ap:60,manaRegen:2,fx:{ts:TS('ap',5,40)}});
D('ストライカーフレイル',{...OK,asPct:10,critPct:20,fx:{cf:{on:true,buff:5,max:4,dur:5}}},{...OK,asPct:20,amp:20,critPct:40,fx:{cf:{on:true,buff:10,max:4,dur:5}}});
D('エルダーウッド紋章',{...OK,asPct:25,ad:10,ap:10,fx:{ts:TS('ad',4,5),ts2:TS('ap',4,5)}});
D('シルバーミアの夜明け',{...OK,ad:150,asFix:0.5,note:'ASが0.5に固定される'});
D('フリッカーブレード',{...OK,ap:10,asPct:20,fx:{as:AS('asPct',1,4),as2:AS('ad',3,2),as3:AS('ap',3,2)},note:'ADPerBonus×100をAD固定値として解釈'});
D('ドーンコア',{...OK,ad:20,ap:20,manaRegen:1,manaCut:10,castCut:10,minMana:15,note:'最大マナ低下: 戦闘開始時-10、発動ごとに-10%(下限15)'});
D('ラピッド ファイアキャノン',{...OK,asPct:55,amp:5});
D('ルーデン テンペスト',{...OK,ad:55,ap:55,note:'BaseDamage/PercentOfOverkillは効果説明がなく計算しない'});
const ITEM_KEYS=[['ad','AD'],['ap','AP'],['asPct','AS(%)'],['critPct','クリ率(%)'],['critDmg','クリ倍率加算'],['manaRegen','毎秒マナ'],['atkMana','攻撃毎マナ'],['amp','増幅(%)'],['critMana','クリ時の攻撃毎マナ(置換)'],['adApPct','AD/AP乗算増加(%)'],['manaPct','獲得マナ増加(%)'],['backAdAp','後衛時のAD/AP加算'],['asFix','AS固定値'],['manaCut','最大マナ固定低下'],['castCut','発動毎の最大マナ低下(%)'],['minMana','最大マナ下限'],['armorPen','物理防御貫通(%)'],['mrPen','魔法防御貫通(%)']];
const STAT_OPT=[['asPct','AS(%)'],['ad','AD'],['ap','AP'],['amp','増幅(%)']],TRG=[['attack','通常攻撃'],['skill','スキル発動']];
const DT_OPT=[['true','確定(軽減なし)'],['phys','物理'],['magic','魔法']];
const BLOCKS=[['ts','時間経過スタック',[['stat','対象','s',STAT_OPT],['int','間隔(秒)'],['amt','1スタックの増加量'],['cap','最大スタック(空=無制限)']]],
['ts2','時間経過スタック②',[['stat','対象','s',STAT_OPT],['int','間隔(秒)'],['amt','1スタックの増加量'],['cap','最大スタック(空=無制限)']]],
['as','攻撃スタック',[['stat','対象','s',STAT_OPT],['everyN','何回の攻撃ごと(空=1)'],['amt','1スタックの増加量'],['cap','最大スタック(空=無制限)']]],
['as2','攻撃スタック②',[['stat','対象','s',STAT_OPT],['everyN','何回の攻撃ごと(空=1)'],['amt','1スタックの増加量'],['cap','最大スタック(空=無制限)']]],
['as3','攻撃スタック③',[['stat','対象','s',STAT_OPT],['everyN','何回の攻撃ごと(空=1)'],['amt','1スタックの増加量'],['cap','最大スタック(空=無制限)']]],
['cf','クリ連動増幅(ストライカー型)',[['buff','1スタックの増幅(%)'],['max','最大スタック'],['dur','持続(秒) スタック=AS×クリ率×持続']]],
['ex','追加ダメージ',[['trg','発生契機','s',TRG],['dt','ダメージ種別','s',DT_OPT],['everyN','N回ごと(空=1)'],['dmg','固定ダメージ'],['adR','AD倍率'],['apR','AP倍率']]],
['bn','燃焼/DoT',[['trg','付与契機','s',TRG],['dt','ダメージ種別','s',DT_OPT],['dmg','1tick固定'],['adR','AD倍率'],['apR','AP倍率'],['int','間隔(秒)'],['dur','持続(秒)']]],
['ca','条件付き増幅',[['mode','条件','s',[['always','常時'],['start','開始からX秒'],['attack','通常攻撃後X秒'],['skill','スキル発動後X秒']]],['amp','増幅(%)'],['dur','X(秒)']]],
['rl','役割別補正',[]]];

// ===== 画像(img/champions, img/items)=====
const CHAMP_IMG={
 'アフェリオス':'img/champions/tft18_aphelios_tft_set18.webp',
 'ママ・ビーク':'img/champions/Raptor.webp',
 'ケイル':'img/champions/tft18_kayle_tft_set18.jpg',
 'ユナラ':'img/champions/tft18_yunara_tft_set18.webp',
 'アーリ':'img/champions/tft18_ahri_tft_set18.jpg',
 'アルーン':'img/champions/tft18_alune_tft_set18.webp',
 'ケイトリン':'img/champions/tft18_caitlyn_tft_set18.webp',
 'マスター・イー':'img/champions/tft18_masteryi_tft_set18.jpg',
 'アジール':'img/champions/tft18_azir_tft_set18.webp',
 'エズリアル':'img/champions/tft18_ezreal_tft_set18.webp'
};
// アイテム画像: normal=通常版 / radiant=レディアント版(無ければ通常版の画像を表示)
const ITEM_IMG={
 'エルダーウッド紋章':{normal:'img/items/DA_18_EmblemElderwood.webp'},
 'アダプティブヘルム':{normal:'img/items/DA_AdaptiveHelm.jpg',radiant:'img/items/DA_AdaptiveHelm_Radiant.webp'},
 'アークエンジェルスタッフ':{normal:'img/items/DA_ArchangelsStaff.jpg',radiant:'img/items/DA_ArchangelsStaffRadiant.jpg'},
 'ドーンコア':{normal:'img/items/DA_Artifact_Dawncore.jpg'},
 'ルーデン テンペスト':{normal:'img/items/DA_Artifact_LudensTempest.jpg'},
 'フリッカーブレード':{normal:'img/items/DA_Artifact_NavoriFlickerblade.jpg'},
 'ラピッド ファイアキャノン':{normal:'img/items/DA_Artifact_RapidFireCannon.jpg'},
 'シルバーミアの夜明け':{normal:'img/items/DA_Artifact_SilvermereDawn.webp'},
 'ブルーバフ':{normal:'img/items/DA_BlueBuff.jpg',radiant:'img/items/DA_BlueBuffRadiant.jpg'},
 'デスブレード':{normal:'img/items/DA_Deathblade.webp',radiant:'img/items/DA_DeathbladeRadiant.webp'},
 'ジャイアントスレイヤー':{normal:'img/items/DA_GiantSlayer.jpg',radiant:'img/items/DA_GiantSlayer_Radiant.webp'},
 'グインソー・レイジブレード':{normal:'img/items/DA_GuinsoosRageblade.jpg',radiant:'img/items/DA_GuinsoosRagebladeRadiant.webp'},
 'ヘクステック・ガンブレード':{normal:'img/items/DA_HextechGunblade.jpg',radiant:'img/items/DA_HextechGunbladeRadiant.webp'},
 'インフィニティ・エッジ':{normal:'img/items/DA_InfinityEdge.webp',radiant:'img/items/DA_InfinityEdgeRadiant.webp'},
 'ジュエルガントレット':{normal:'img/items/DA_JeweledGauntlet.jpg',radiant:'img/items/DA_JeweledGauntletRadiant.jpg'},
 'クラーケンの怒り':{normal:'img/items/DA_KrakensFury.jpg',radiant:'img/items/DA_KrakensFury_Radiant.jpg'},
 'ラストウィスパー':{normal:'img/items/DA_LastWhisper.jpg',radiant:'img/items/DA_LastWhisperRadiant.webp'},
 'モレロノミコン':{normal:'img/items/DA_Morellonomicon.jpg',radiant:'img/items/DA_MorellonomiconRadiant.jpg'},
 'ナッシャー・トゥース':{normal:'img/items/DA_NashorsTooth.jpg',radiant:'img/items/DA_NashorsToothRadiant.jpg'},
 'クイックシルバー':{normal:'img/items/DA_Quicksilver.jpg',radiant:'img/items/DA_QuicksilverRadiant.jpg'},
 'ラバドン・デスキャップ':{normal:'img/items/DA_RabadonsDeathcap.jpg',radiant:'img/items/DA_RabadonsDeathcap_Radiant.jpg'},
 'レッドバフ':{normal:'img/items/DA_RedBuff.webp',radiant:'img/items/DA_RedBuffRadiant.jpg'},
 'ショウジンの矛':{normal:'img/items/DA_SpearOfShojin.jpg',radiant:'img/items/DA_SpearOfShojinRadiant.webp'},
 'ストライカーフレイル':{normal:'img/items/DA_StrikersFlail.webp',radiant:'img/items/DA_StrikersFlailRadiant.webp'},
 '巨人の誓い':{normal:'img/items/DA_TitansResolve.jpg',radiant:'img/items/DA_TitansResolve_Radiant.jpg'},
 'ヴォイドスタッフ':{normal:'img/items/DA_VoidStaff.jpg',radiant:'img/items/DA_VoidStaffRadiant.jpg'}
};
