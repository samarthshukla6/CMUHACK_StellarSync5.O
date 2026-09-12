let mapsLoading;
function loadMaps() {
  if (window.google?.maps?.Map) return Promise.resolve();
  if (mapsLoading) return mapsLoading;
  mapsLoading = new Promise((resolve,reject) => {
    const key = window.BOXMATE_CONFIG?.googleMapsApiKey;
    if (!key) { reject(new Error('not-configured')); return; }
    const timeout = setTimeout(() => reject(new Error('timeout')),12000);
    window.boxmateMapsReady=()=>{clearTimeout(timeout);resolve()};
    window.gm_authFailure=()=>{clearTimeout(timeout);reject(new Error('authorization'));document.querySelectorAll('.live-map').forEach(el=>mapUnavailable(el))};
    const script=document.createElement('script');script.async=true;
    script.src='https://maps.googleapis.com/maps/api/js?'+new URLSearchParams({key,loading:'async',callback:'boxmateMapsReady',v:'weekly'});
    script.onerror=()=>{clearTimeout(timeout);reject(new Error('network'))};document.head.append(script);
  });
  return mapsLoading;
}
function mapUnavailable(el) {
  el.replaceChildren();el.classList.add('map-unavailable');
  const title=document.createElement('strong');title.textContent='Map unavailable';
  const text=document.createElement('p');text.textContent='You can still compare businesses below and open walking directions.';
  el.append(title,text);
}
async function mountStorageMap(el) {
  el.textContent='Loading map…';
  try {
    await loadMaps(); if (!el.isConnected) return;
    const map=new google.maps.Map(el,{center:userPoint,zoom:14,mapTypeControl:false,streetViewControl:false});
    const bounds=new google.maps.LatLngBounds();bounds.extend(userPoint);
    new google.maps.Marker({map,position:userPoint,title:actualLocation?'Your location':'Sample starting location',icon:{path:google.maps.SymbolPath.CIRCLE,scale:10,fillColor:'#F0A23E',fillOpacity:1,strokeColor:'#ffffff',strokeWeight:3}});
    locations.forEach((location,i)=>{bounds.extend(location);const marker=new google.maps.Marker({map,position:{lat:location.lat,lng:location.lng},title:places[i].name,icon:location.photo?{url:location.photo,scaledSize:new google.maps.Size(i===selected?60:46,i===selected?60:46),anchor:new google.maps.Point(i===selected?30:23,i===selected?30:23)}:{path:google.maps.SymbolPath.CIRCLE,scale:12,fillColor:'#3A51F9',fillOpacity:1,strokeColor:'#ffffff',strokeWeight:3},zIndex:i===selected?10:1});marker.addListener('click',()=>{selected=i;render()})});
    map.fitBounds(bounds,50);
    new google.maps.DirectionsService().route({origin:userPoint,destination:locations[selected],travelMode:google.maps.TravelMode.WALKING},(result,status)=>{if(!el.isConnected)return;if(status==='OK'){new google.maps.DirectionsRenderer({map,directions:result,suppressMarkers:true,preserveViewport:true,polylineOptions:{strokeColor:'#3A51F9'}});const leg=result.routes[0]?.legs[0];const statusEl=document.querySelector('#geoStatus');if(statusEl&&leg)statusEl.textContent='Walking to this business: '+leg.duration.text+' · '+leg.distance.text+' (Google Maps).';}else{const statusEl=document.querySelector('#geoStatus');if(statusEl)statusEl.textContent='Walking route unavailable. Distances shown are straight-line.'}});
  } catch { if(el.isConnected)mapUnavailable(el); }
}
