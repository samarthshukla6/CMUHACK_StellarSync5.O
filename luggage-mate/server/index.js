import express from 'express';
import multer from 'multer';
import {ObjectId} from 'mongodb';
import {analyzePhotos,reviewedAnalysis} from './photo-analysis.js';
import { auth } from 'express-oauth2-jwt-bearer';
import { MongoClient } from 'mongodb';
import { fileURLToPath } from 'node:url';
import { hosts, locations } from './catalog.js';
import { validateBooking } from './booking.js';
const app=express(), root=fileURLToPath(new URL('../',import.meta.url));
app.set('strict routing',true); // keep '/dashboard' (redirect) and '/dashboard/' (the app) distinct
const domain=process.env.AUTH0_DOMAIN||'dev-5eulm71e1007u542.us.auth0.com';
const audience=process.env.AUTH0_AUDIENCE||'';
let db,connection;
async function database(){
  if(db)return db;
  if(!process.env.MONGODB_URI)throw new Error('database_unavailable');
  if(!connection)connection=(async()=>{
    const client=new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:5000});
    try {
      await client.connect();const database=client.db(process.env.MONGODB_DB||'boxmate_travel');
      await database.collection('photoAnalyses').createIndex({expiresAt:1},{expireAfterSeconds:0});
      await database.collection('users').createIndex({auth0Sub:1},{unique:true});
      await database.collection('bookings').createIndex({userId:1,requestId:1},{unique:true});
      await database.collection('bookings').createIndex({userId:1,createdAt:-1});
      for(const [name,rows] of [['hosts',hosts],['storageLocations',locations]])for(const row of rows)await database.collection(name).updateOne({_id:row._id},{$setOnInsert:{...row,createdAt:new Date()}},{upsert:true});
      db=database;return db;
    } catch(error){await client.close();connection=undefined;throw error;}
  })();
  return connection;
}
app.disable('x-powered-by');
app.use(express.json({limit:'32kb'}));
app.get('/api/config',(_req,res)=>res.json({audience,configured:!!(audience&&process.env.MONGODB_URI),photoAnalysis:!!process.env.GEMINI_API_KEY}));
app.get('/api/health',async(_req,res)=>{try{await database();res.json({database:'connected',authConfigured:!!audience})}catch{res.status(503).json({database:'unavailable',authConfigured:!!audience})}});
app.get('/api/locations',async(_req,res)=>{try{const store=await database();const rows=await store.collection('storageLocations').find({active:true}).toArray();const businesses=await store.collection('hosts').find({active:true}).toArray();res.json({locations:rows.filter(row=>businesses.some(host=>host._id===row.hostId)).map(row=>({...row,name:businesses.find(host=>host._id===row.hostId).name,type:businesses.find(host=>host._id===row.hostId).type}))})}catch{res.status(503).json({error:'Business data is not connected yet.'})}});
app.use('/api',audience?auth({audience,issuerBaseURL:`https://${domain}`,tokenSigningAlg:'RS256'}):(_req,res)=>res.status(503).json({error:'Account storage is not connected yet.'}));
app.use('/api',async(req,res,next)=>{
  if(!req.auth?.payload?.sub)return res.status(401).json({error:'Please sign in.'});
  try{req.database=await database();next()}catch{res.status(503).json({error:'Storage is unavailable. Your booking has not been saved.'})}
});
const upload=multer({storage:multer.memoryStorage(),limits:{files:5,fileSize:25*1024*1024,fields:0,parts:5},fileFilter:(_req,file,done)=>done(null,['image/jpeg','image/png','image/webp'].includes(file.mimetype))});
const analysisInFlight=new Set(),analysisCooldown=new Map();
app.post('/api/photo-analysis',(req,res,next)=>{
 if(!process.env.GEMINI_API_KEY)return res.status(503).json({error:'Photo analysis is not configured. You can enter items manually.'});
 const user=req.auth.payload.sub,now=Date.now();
 for(const [id,time] of analysisCooldown)if(now-time>15000)analysisCooldown.delete(id);
 if(analysisInFlight.has(user)||analysisCooldown.has(user))return res.status(429).json({error:'Please wait a few seconds before analyzing again.'});
 analysisInFlight.add(user);
 upload.array('images',5)(req,res,async error=>{
  try{
   if(error)return res.status(400).json({error:'Choose up to five JPEG, PNG or WebP images, each 25 MB or smaller.'});
   const result=await analyzePhotos(req.files||[]);
   const record={...result,userId:user,createdAt:new Date(),expiresAt:new Date(Date.now()+24*3600000)};
   const inserted=await req.database.collection('photoAnalyses').insertOne(record);
   res.json({analysis:{...result,id:inserted.insertedId.toString()}});
  }catch(error){
   const inputErrors=['NO_IMAGES','TOO_MANY_IMAGES','UNSUPPORTED_IMAGE_TYPE','INVALID_IMAGE','IMAGE_TOO_LARGE','EMPTY_AI_RESPONSE'];
   res.status(inputErrors.includes(error.code)?400:502).json({error:inputErrors.includes(error.code)?error.message:'Photo analysis could not finish. Try again or enter your items and value manually.'});
  }finally{analysisInFlight.delete(user);analysisCooldown.set(user,Date.now());}
 });
});
app.post('/api/me',async(req,res,next)=>{
 try{
  // Read profile from Auth0, never trust a browser-supplied user ID or email.
  const response=await fetch(`https://${domain}/userinfo`,{headers:{Authorization:req.headers.authorization},signal:AbortSignal.timeout(8000)});
  if(!response.ok)return res.status(401).json({error:'Please sign in again to sync your profile.'});
  const profile=await response.json();if(profile.sub!==req.auth.payload.sub)return res.sendStatus(401);
  const now=new Date();const user=await req.database.collection('users').findOneAndUpdate({auth0Sub:profile.sub},{$set:{name:typeof profile.name==='string'?profile.name.slice(0,200):'Traveler',email:typeof profile.email==='string'?profile.email:null,emailVerified:profile.email_verified===true,updatedAt:now},$setOnInsert:{role:'traveler',createdAt:now}},{upsert:true,returnDocument:'after'});
  res.json({user:{name:user.name,email:user.email}});
 }catch(error){next(error)}
});
app.get('/api/bookings',async(req,res,next)=>{try{res.json({bookings:await req.database.collection('bookings').find({userId:req.auth.payload.sub},{projection:{userId:0,requestId:0}}).sort({createdAt:-1}).limit(50).toArray()})}catch(error){next(error)}});
app.post('/api/bookings',async(req,res,next)=>{
 try{
  const requestId=req.get('Idempotency-Key');if(!/^[a-zA-Z0-9-]{16,80}$/.test(requestId||''))return res.status(400).json({error:'Missing booking request ID.'});
  const owner={userId:req.auth.payload.sub,requestId};
  const existing=await req.database.collection('bookings').findOne(owner);if(existing)return res.json({booking:existing});
  const id=req.body?.locationId;if(typeof id!=='string')return res.status(400).json({error:'Choose a business.'});
  const location=await req.database.collection('storageLocations').findOne({_id:id,active:true});
  let booking;try{booking=validateBooking(req.body,location)}catch(error){return res.status(400).json({error:error.message})}
  const host=await req.database.collection('hosts').findOne({_id:location.hostId,active:true});if(!host)return res.status(400).json({error:'This business is unavailable.'});
  if(req.body.photoAnalysis){
    const input=req.body.photoAnalysis;
    if(typeof input.id!=='string'||!ObjectId.isValid(input.id))return res.status(400).json({error:'Invalid photo analysis.'});
    const record=await req.database.collection('photoAnalyses').findOne({_id:new ObjectId(input.id),userId:req.auth.payload.sub,expiresAt:{$gt:new Date()}});
    try{booking.photoAnalysis=reviewedAnalysis(record,input)}catch(error){return res.status(400).json({error:error.message})}
  }
  booking={...booking,...owner,businessName:host.name,createdAt:new Date()};
  try{const result=await req.database.collection('bookings').insertOne(booking);res.status(201).json({booking:{...booking,_id:result.insertedId}})}catch(error){if(error.code!==11000)throw error;res.json({booking:await req.database.collection('bookings').findOne(owner)})}
 }catch(error){next(error)}
});
app.use('/api',(_req,res)=>res.status(404).json({error:'Not found.'}));
// Explicit public file lists: never serve .env, server sources, tests, or dependencies.
// The marketing home page and the booking dashboard are independent front-ends sharing this backend.
const sharedFiles=['config.js','config.local.js'];
const homeFiles=['style.css','home.js','auth.js'];
const dashboardFiles=['style.css','app.js','auth.js','maps.js','dates.js','location-view.js','photos.js','photo-files.js'];
for(const file of sharedFiles)app.get('/'+file,(_req,res)=>res.set('Cache-Control','no-store').sendFile(root+file));
app.get('/',(_req,res)=>res.set('Cache-Control','no-store').sendFile(root+'home/index.html'));
for(const file of homeFiles)app.get('/'+file,(_req,res)=>res.set('Cache-Control','no-store').sendFile(root+'home/'+file));
app.get('/dashboard',(_req,res)=>res.redirect(301,'/dashboard/'));
app.get('/dashboard/',(_req,res)=>res.set('Cache-Control','no-store').sendFile(root+'dashboard/index.html'));
for(const file of dashboardFiles)app.get('/dashboard/'+file,(_req,res)=>res.set('Cache-Control','no-store').sendFile(root+'dashboard/'+file));
app.use('/assets',express.static(root+'assets',{dotfiles:'deny'}));
app.use((error,_req,res,_next)=>res.status(error.status===401?401:error.status===413?413:500).json({error:error.status===401?'Please sign in again.':'The request could not complete. Please try again.'}));
app.listen(Number(process.env.PORT||8094),'127.0.0.1',()=>console.log('Boxmate Travel: http://127.0.0.1:'+(process.env.PORT||8094)));
