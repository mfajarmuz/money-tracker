/* Presentation only: shares existing views, data, form and handlers. */
(() => {
 'use strict';
 const app = document.querySelector('.app-container');
 const main = document.getElementById('mainContent');
 const sidebar = document.getElementById('desktopSidebar');
 const names = {dashboard:'Ringkasan',riwayat_lengkap:'Transaksi',laporan:'Laporan',kategori_view:'Kategori',pengaturan:'Pengaturan',notes_view:'Catatan',detail_transaksi:'Detail Transaksi',edit_transaksi:'Edit Transaksi'};
 const sync = () => {
  const ready = main.style.display !== 'none';
  app.classList.toggle('app-ready', ready); sidebar.hidden = !ready;
  const view = main.querySelector('.view.active');
  document.getElementById('workspaceTitle').textContent = names[view?.id] || 'Money Tracker';
  sidebar.querySelectorAll('[data-view]').forEach(b => {const active=b.dataset.view === view?.id; b.classList.toggle('active',active); if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 };
 new MutationObserver(sync).observe(main,{attributes:true,subtree:true,attributeFilter:['class','style']});sync();
 sidebar.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',e=>{
  e.preventDefault();const target=b.dataset.view;
  const nav=document.querySelector(`.bottom-nav .nav-item[data-target="${target}"]`);
  if(nav)nav.click();else if(target==='notes_view')openNotesView();else if(target==='riwayat_lengkap')openRiwayatLengkapPage();
  window.scrollTo({top:0});sync();
 }));
 document.querySelectorAll('.bottom-nav .nav-item,.quick-action-item').forEach(el=>{
  el.setAttribute('role','button');el.tabIndex=0;
  el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click();}});
 });
 for(const id of ['historyTableBody','filterHistoryTableBody']){
  const list=document.getElementById(id);const head=document.createElement('div');head.className='tx-columns';head.innerHTML='<span>Transaksi / kategori & tanggal</span><span>Nominal</span>';list.before(head);
 }
 const modal=document.getElementById('transactionModal');
 const keyboard=document.getElementById('keyboardAmount');let opener=null;let wasOpen=false;
 const syncKeyboardAmount = () => {const value=document.getElementById('nominal').value;keyboard.value=Number(value)>0?value:'';};
 keyboard.addEventListener('input',()=>{const raw=keyboard.value;const caret=keyboard.selectionStart;const digits=raw.replace(/\D/g,'').replace(/^0+(?=\d)/,'').slice(0,15);if(raw!==digits){keyboard.value=digits;const position=Math.max(0,(caret??raw.length)-(raw.length-digits.length));keyboard.setSelectionRange(position,position);}numpadValue=digits||'0';updateAmountDisplay();});
 new MutationObserver(()=>{
  const open=modal.classList.contains('active');
  if(open&&!wasOpen){opener=document.activeElement;syncKeyboardAmount();modal.inert=false;requestAnimationFrame(()=>{(matchMedia('(min-width:992px)').matches?keyboard:modal.querySelector('.close-modal')).focus();});}
  if(!open&&wasOpen){modal.inert=true;if(opener?.isConnected)opener.focus();}
  wasOpen=open;document.body.style.overflow=open?'hidden':'';
 }).observe(modal,{attributes:true,attributeFilter:['class']});modal.inert=true;
 document.addEventListener('keydown',e=>{
  if(!modal.classList.contains('active'))return;
  if(e.key==='Escape'){e.preventDefault();closeTransactionModal();}
  if(e.key==='Tab'){
   const els=[...modal.querySelectorAll('button:not(:disabled),input,select,[tabindex="0"]')].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
   const first=els[0],last=els.at(-1);
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
 });
 matchMedia('(min-width:992px)').addEventListener('change',()=>{syncKeyboardAmount();});
})();
