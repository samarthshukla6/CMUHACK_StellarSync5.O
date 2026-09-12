export const hosts = [
  {_id:'cohon-university-center',name:'Cohon University Center',type:'Student center'},
  {_id:'tepper-quad',name:'Tepper Quad · Simmons Auditorium',type:'Business school'},
  {_id:'gates-hillman-center',name:'Gates Hillman Center',type:'Computer science building'}
].map(h=>({...h,active:true,fictional:true}));
export const locations = [
  {_id:'cohon-university-center',hostId:'cohon-university-center',address:'5032 Forbes Ave, Pittsburgh',lat:40.4416,lng:-79.9430,rate:.75,cap:3,photo:'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&auto=format&fit=crop'},
  {_id:'tepper-quad',hostId:'tepper-quad',address:'4765 Forbes Ave, Pittsburgh',lat:40.4444,lng:-79.9445,rate:1,cap:4,photo:'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&auto=format&fit=crop'},
  {_id:'gates-hillman-center',hostId:'gates-hillman-center',address:'5000 Forbes Ave, Pittsburgh',lat:40.4436,lng:-79.9459,rate:.875,cap:3.5,photo:'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=500&auto=format&fit=crop'}
].map(l=>({...l,city:'Pittsburgh',timeZone:'America/New_York',active:true,fictional:true}));
