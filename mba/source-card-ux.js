(function initSourceCardUx(){
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(typeof renderBuilder==='function' && window.__mbaSafeActionsWrapped){
      clearInterval(timer);
      wrapSourceCardActions();
    }else if(tries>160){
      clearInterval(timer);
      if(typeof renderBuilder==='function')wrapSourceCardActions();
    }
  },50);
})();

function wrapSourceCardActions(){
  if(renderBuilder._sourceCardUx)return;
  const previous=renderBuilder;
  renderBuilder=function(){
    previous();
    polishSourceCardActions();
  };
  renderBuilder._sourceCardUx=true;
  polishSourceCardActions();
}

function polishSourceCardActions(){
  const p=currentProfile();
  if(!p)return;
  $$('#sourceList .sourceCard').forEach((card,index)=>{
    const s=p.streams[index];
    if(!s)return;
    const actions=card.querySelector('.sourceActions');
    if(!actions)return;
    const has=s.planning?.result?.status==='ok';
    actions.innerHTML=''
      +'<button class="sourceSetupAction" type="button" onclick="editSource(\''+s.id+'\')">Thiết lập nguồn thu</button>'
      +'<button class="sourceDataAction" type="button" onclick="openPlanning(\''+s.id+'\')">'+(has?'Cập nhật số liệu':'Nhập số liệu')+'</button>'
      +'<button class="delete" type="button" onclick="deleteSource(\''+s.id+'\')">Xóa nguồn thu</button>';
  });

  // Dọn các copy cũ còn sót lại ở các trạng thái đặc biệt của nguồn thu cũ.
  document.querySelectorAll('#plan button, #plan .recurringMissing button').forEach(btn=>{
    if(btn.textContent.trim()==='Chỉnh cấu trúc')btn.textContent='Thiết lập nguồn thu';
  });
  document.querySelectorAll('#plan .recurringMissing p').forEach(p=>{
    p.innerHTML=p.innerHTML.replaceAll('Chỉnh cấu trúc','Thiết lập nguồn thu');
  });
}
