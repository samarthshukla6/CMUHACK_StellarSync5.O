export function validateBooking(body, location) {
  if (!body || typeof body !== 'object' || !location) throw new Error('Choose an available business.');
  const {inventory,bags,value,protection,trip}=body;
  if(typeof inventory!=='string'||!inventory.trim()||inventory.length>5000)throw new Error('Describe your belongings in 1–5,000 characters.');
  if(!Number.isInteger(bags)||bags<1||bags>20)throw new Error('Choose 1–20 bags.');
  if(!Number.isFinite(value)||value<0||value>1000000)throw new Error('Enter a valid declared value.');
  if(![0,1,2].includes(protection))throw new Error('Choose a protection option.');
  if(!trip||['start','visit','end'].some(k=>typeof trip[k]!=='string'||!trip[k].trim()||trip[k].length>300))throw new Error('Enter your trip locations.');
  const iso=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  if(!iso.test(trip.drop)||!iso.test(trip.pickup))throw new Error('Choose valid dates.');
  const drop=new Date(trip.drop),pickup=new Date(trip.pickup),duration=pickup-drop;
  if(!Number.isFinite(duration)||duration<=0||duration>90*24*3600000)throw new Error('Choose a stay of up to 90 days, ending after it starts.');
  const hours=Math.max(1,Math.ceil(duration/3600000));
  const storage=Math.round((Math.floor(hours/24)*location.cap+Math.min(hours%24*location.rate,location.cap))*bags*100);
  return {locationId:location._id,hostId:location.hostId,inventory:inventory.trim(),bags,declaredValue:value,protection:['none','standard','premium'][protection],trip:{start:trip.start,visit:trip.visit,end:trip.end,drop,pickup},pricing:{currency:'USD',storageCents:storage,protectionCents:[0,100,300][protection],totalCents:storage+[0,100,300][protection]},status:'simulated_confirmed',paymentStatus:'simulated',fictional:true};
}
