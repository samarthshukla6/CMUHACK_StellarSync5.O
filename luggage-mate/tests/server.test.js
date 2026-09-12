import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
test('API rejects anonymous access and does not serve private files',async()=>{
 const proc=spawn(process.execPath,['server/index.js'],{env:{...process.env,PORT:'18094',AUTH0_AUDIENCE:'https://boxmate-travel-api',MONGODB_URI:''},stdio:['ignore','pipe','pipe']});
 try{
  await Promise.race([once(proc.stdout,'data'),once(proc,'exit').then(([code])=>{throw new Error('Server exited: '+code)}),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Server did not start')),5000).unref())]);
  const get=path=>fetch('http://127.0.0.1:18094'+path);
  assert.equal((await get('/')).status,200);
  for(const path of ['/api/bookings','/api/me'])assert.equal((await get(path)).status,401);
  for(const path of ['/.env','/server/index.js','/package.json','/.git/config'])assert.equal((await get(path)).status,404);
  assert.equal((await get('/api/health')).status,503);
  assert.equal((await (await get('/api/config')).json()).configured,false);
  assert.equal((await fetch('http://127.0.0.1:18094/api/bookings',{headers:{Authorization:'Bearer invalid'}})).status,401);
 }finally{if(proc.exitCode===null){const exited=once(proc,'exit');proc.kill();await exited}}
});
