// ============================================================
// save.js  セーブ・ロード(ブラウザの localStorage)
//   loadState()  : 保存済みの入力内容を読み込む(無ければ初期値)
//   saveState(S) : 入力内容を保存する
//   clearState() : 保存内容を消す
//   DATA_VER(database.js)が保存時と違う場合、アイテム枠だけ最新のデータから読み直す。
//   (JSONのエクスポート/インポートはフェーズ3で追加予定)
// ============================================================
const SAVE_KEY='tftsim-phase1';
function loadState(){
 const S=defaultState();
 try{
  const j=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');
  if(j){
   if(j.ver!==DATA_VER&&Array.isArray(j.items))j.items=j.items.map(x=>{const n=newSlot(x&&x.name);n.variant=(x&&x.variant)||'normal';return n});
   for(const a in S){
    if(typeof S[a]==='object'&&!Array.isArray(S[a]))Object.assign(S[a],j[a]||{});
    else if(j[a]!==undefined)S[a]=j[a];
   }
  }
 }catch(e){}
 S.ver=DATA_VER;
 return S;
}
function saveState(S){try{localStorage.setItem(SAVE_KEY,JSON.stringify(S))}catch(e){}}
function clearState(){try{localStorage.removeItem(SAVE_KEY)}catch(e){}}
