readPlanInput=function(){
  const out={};
  document.querySelectorAll('[data-plan-key]').forEach(el=>{
    const conditional=el.closest('.customArea');
    if(conditional && !conditional.classList.contains('on')) return;
    setNested(out,el.dataset.planKey,el.value);
  });
  document.querySelectorAll('[data-plan-choice]').forEach(g=>{
    setNested(out,g.dataset.planChoice,g.querySelector('.choice.selected')?.dataset.value||'');
  });
  const preset=getNested(out,'capacity.realisticPreset');
  if(preset && preset!=='custom') setNested(out,'capacity.realisticPct',preset);
  return out;
};
