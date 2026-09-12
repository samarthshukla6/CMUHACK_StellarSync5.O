(() => {
  let files=[],analysis=null,ids=[],reviewed=false,busy=false,status='',generation=0,timer,started=0;
  const draw=()=>{
    const box=document.querySelector('#photoReview'),button=document.querySelector('#analyzePhotos');if(!box)return;
    button.hidden=busy||!files.length||!!analysis;button.disabled=busy;button.textContent='Try again';
    const progress=document.querySelector('#uploaded');progress.classList.toggle('is-analyzing',busy);progress.setAttribute('aria-busy',String(busy));progress.textContent=busy?`Analyzing your photos · ${Math.floor((Date.now()-started)/1000)}s${Date.now()-started>30000?' · Taking longer than usual…':'…'}`:status;
    const previews=document.querySelector('#photoPreviews');document.querySelector('.vision-card')?.classList.toggle('has-photos',files.length>0);if(previews&&previews.dataset.count!==String(files.length)){previews.querySelectorAll('img').forEach(img=>URL.revokeObjectURL(img.src));previews.replaceChildren();files.forEach(file=>{const img=document.createElement('img');img.src=URL.createObjectURL(file);img.alt='Your selected luggage photo';previews.append(img);});previews.dataset.count=String(files.length);}box.replaceChildren();if(!analysis)return;
    const card=document.createElement('div');card.className='photo-result-card';
    const header=document.createElement('div');header.className='photo-result-header';
    const title=document.createElement('span');title.textContent=reviewed?'✓ Items confirmed':'Photo estimate';
    const confirm=document.createElement('button');confirm.type='button';confirm.className='photo-confirm';confirm.textContent=reviewed?'Confirmed':'Confirm items';confirm.disabled=reviewed||!ids.length;
    confirm.onclick=()=>{reviewed=true;status='';const reminder=document.querySelector('#bookingPhotoReminder');if(reminder)reminder.hidden=true;draw();};header.append(title,confirm);card.append(header);
    const list=document.createElement('div');list.className='photo-result-list';
    analysis.items.forEach(item=>{const included=ids.includes(item.id),row=document.createElement('div');row.className='photo-result-row'+(included?'':' excluded');
      const info=document.createElement('div');info.className='photo-result-info';
      const name=document.createElement('span');name.className='photo-result-name';name.textContent=`${item.quantity} × ${item.name}`;
      const detail=document.createElement('small');detail.className='photo-result-detail';
      const descriptors=[item.brand&&item.model?`${item.brand} ${item.model}`:item.brand,item.category,item.condition&&item.condition!=='unknown'?item.condition.replace('_',' '):null].filter(Boolean);
      detail.textContent=descriptors.join(' · ')+(item.visibleEvidence?.[0]?` — ${item.visibleEvidence[0]}`:'');
      info.append(name,detail);
      const price=document.createElement('strong');price.textContent=`$${(item.quantity*item.replacementValue.expected).toFixed(2)}`;
      const action=document.createElement('button');action.type='button';action.className='photo-item-action';action.textContent=included?'×':'＋';action.setAttribute('aria-label',`${included?'Remove':'Restore'} ${item.name}`);action.onclick=()=>{ids=included?ids.filter(id=>id!==item.id):[...ids,item.id];reviewed=false;apply();draw();};row.append(info,price,action);list.append(row);
    });card.append(list);
    const manual=document.createElement('button');manual.type='button';manual.className='photo-manual';manual.textContent='Enter manually';manual.onclick=()=>{analysis=null;reviewed=false;status='';const reminder=document.querySelector('#bookingPhotoReminder');if(reminder)reminder.hidden=true;draw();document.querySelector('#inventory').focus();};card.append(manual);box.append(card);

  };
  function apply(){const chosen=analysis.items.filter(item=>ids.includes(item.id));inventory=chosen.map(item=>`${item.quantity} × ${item.name}`).join(', ');value=Math.round(chosen.reduce((sum,item)=>sum+item.quantity*item.replacementValue.expected,0));document.querySelector('#inventory').value=inventory;document.querySelector('#value').value=value;updateTotal();}
  window.mountPhotoAnalysis=()=>{
    const input=document.querySelector('#photos');if(!input)return;
    input.onchange=()=>{if(busy)return;generation++;const previews=document.querySelector('#photoPreviews');if(previews)delete previews.dataset.count;analysis=null;reviewed=false;busy=false;try{files=window.validatePhotoFiles(input.files);status=files.length?`${files.length} photo(s) ready.`:'';}catch(error){files=[];status=error.message;}draw();if(files.length)document.querySelector('#analyzePhotos').click();};
    document.querySelector('#analyzePhotos').onclick=async()=>{if(!window.boxmateAccount?.authenticated){status='Please sign in first, then choose your photos. Analysis has not started.';draw();return;}const turn=++generation,oldInventory=inventory,oldValue=value;busy=true;started=Date.now();clearInterval(timer);timer=setInterval(()=>{const progress=document.querySelector('#uploaded');if(progress){progress.classList.add('is-analyzing');progress.textContent=`Analyzing your photos · ${Math.floor((Date.now()-started)/1000)}s${Date.now()-started>30000?' · Taking longer than usual…':'…'}`;}},1000);input.disabled=true;status='Identifying visible belongings and estimating replacement value…';draw();try{const result=await window.analyzeTravelPhotos(files);if(turn!==generation||!result)return;analysis=result;ids=result.items.map(item=>item.id);reviewed=false;if(document.querySelector('#photoReview')&&inventory===oldInventory&&value===oldValue)apply();status='';}catch(error){if(turn===generation)status=error.message||'Photo analysis failed. Try again or enter your items manually.';}finally{if(turn===generation){clearInterval(timer);busy=false;input.disabled=false;draw();}}};
    ['inventory','value'].forEach(id=>{const el=document.getElementById(id),previous=el.oninput;el.oninput=e=>{previous?.(e);reviewed=false;draw();};});draw();
  };
  window.photoReviewPending=()=>{const pending=busy||!!analysis&&(!reviewed||!ids.length);if(pending){const pay=document.querySelector('#pay');let reminder=document.querySelector('#bookingPhotoReminder');if(pay&&!reminder){reminder=document.createElement('p');reminder.id='bookingPhotoReminder';reminder.className='notice';reminder.setAttribute('role','alert');pay.before(reminder);}if(reminder){reminder.hidden=false;reminder.textContent=busy?'Your photos are still being analyzed.':'Select “Confirm items” in your photo estimate to book.';}status=busy?'Wait for analysis to finish.':'Review and confirm your photo inventory before booking.';draw();}return pending;};
  window.photoBookingEvidence=()=>analysis?{id:analysis.id,includedItemIds:ids,reviewed}:null;
  window.photoDraftForLogin=()=>({analysis,ids,reviewed});
  window.restorePhotoDraft=draft=>{analysis=draft.analysis||null;ids=draft.ids||[];reviewed=!!draft.reviewed;};
  window.resetPhotoAnalysis=()=>{clearInterval(timer);generation++;files=[];analysis=null;ids=[];reviewed=false;busy=false;status='';};
})();
