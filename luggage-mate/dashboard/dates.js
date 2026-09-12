// Two-month range picker adapted from Boxmate's LightweightDatePicker design.
const originalFields = fields;
const localDate = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const prettyDate = iso => new Date(iso+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
fields = function() {
  const wrapper=document.createElement('div');wrapper.innerHTML=originalFields();
  wrapper.querySelectorAll('input[type="datetime-local"]').forEach(input=>input.closest('label').remove());
  wrapper.firstElementChild.insertAdjacentHTML('beforeend',`<div class="wide"><span class="date-label">Storage dates</span><button type="button" class="date-trigger" data-calendar><span><small>Drop off</small>${prettyDate(trip.drop.slice(0,10))}</span><span>→</span><span><small>Collect</small>${prettyDate(trip.pickup.slice(0,10))}</span><span aria-hidden="true">▦</span></button></div><label>Drop-off time<input type="time" data-clock="drop" value="${trip.drop.slice(11,16)}" required></label><label>Collection time<input type="time" data-clock="pickup" value="${trip.pickup.slice(11,16)}" required></label>`);
  return wrapper.innerHTML;
};
const calendar=document.createElement('dialog');calendar.className='date-dialog';calendar.setAttribute('aria-label','Choose storage dates');document.body.append(calendar);
let calendarMonth,rangeStart,rangeEnd,pickingEnd=false;
function drawCalendar(){
  const today=localDate(new Date());
  function month(offset){const date=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+offset,1);const label=date.toLocaleDateString('en-US',{month:'long',year:'numeric'});let days='';for(let i=0;i<(date.getDay()+6)%7;i++)days+='<span></span>';for(let d=1;d<=new Date(date.getFullYear(),date.getMonth()+1,0).getDate();d++){const iso=localDate(new Date(date.getFullYear(),date.getMonth(),d));days+=`<button type="button" data-day="${iso}" ${iso<today?'disabled':''} aria-label="${prettyDate(iso)}" aria-pressed="${iso===rangeStart||iso===rangeEnd}" class="${iso===rangeStart||iso===rangeEnd?'edge':iso>rangeStart&&iso<rangeEnd?'within':''}">${d}</button>`}return `<section><h3>${label}</h3><div class="date-grid">${['M','T','W','T','F','S','S'].map(x=>'<small>'+x+'</small>').join('')}${days}</div></section>`}
  calendar.innerHTML=`<div class="calendar-head"><h2>When do you need storage?</h2><button type="button" data-close aria-label="Close calendar">×</button></div><p>${pickingEnd?'Now choose your collection date.':'Choose your drop-off date, then your collection date.'}</p><div class="month-controls"><button type="button" data-month="-1" aria-label="Previous month">←</button><span>${rangeStart?prettyDate(rangeStart):'Drop off'} → ${rangeEnd?prettyDate(rangeEnd):'Collect'}</span><button type="button" data-month="1" aria-label="Next month">→</button></div><div class="two-months">${month(0)}${month(1)}</div><div class="calendar-bottom"><span>Same-day storage is welcome.</span><button type="button" class="primary" data-apply ${!rangeStart||!rangeEnd?'disabled':''}>Apply dates</button></div>`;
  calendar.querySelector('[data-close]').onclick=()=>calendar.close();
  calendar.querySelectorAll('[data-month]').forEach(b=>b.onclick=()=>{calendarMonth.setMonth(calendarMonth.getMonth()+Number(b.dataset.month));drawCalendar()});
  calendar.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{const day=b.dataset.day;if(!pickingEnd||day<rangeStart){rangeStart=day;rangeEnd='';pickingEnd=true}else{rangeEnd=day;pickingEnd=false}drawCalendar()});
  calendar.querySelector('[data-apply]').onclick=()=>{trip.drop=rangeStart+'T'+trip.drop.slice(11,16);trip.pickup=rangeEnd+'T'+trip.pickup.slice(11,16);calendar.close();render()};
}
document.addEventListener('click',event=>{if(event.target.closest('[data-calendar]')){rangeStart=trip.drop.slice(0,10);rangeEnd=trip.pickup.slice(0,10);calendarMonth=new Date(rangeStart+'T12:00');calendarMonth.setDate(1);pickingEnd=false;drawCalendar();calendar.showModal()}});
document.addEventListener('change',event=>{const target=event.target;if(target.matches('[data-clock]')){const key=target.dataset.clock;if(target.value)trip[key]=trip[key].slice(0,10)+'T'+target.value}});
