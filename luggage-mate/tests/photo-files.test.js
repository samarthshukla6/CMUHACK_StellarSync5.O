import test from 'node:test';
import assert from 'node:assert/strict';
import '../dashboard/photo-files.js';
test('accepts JPEG without browser MIME metadata',()=>{const files=validatePhotoFiles([new File(['sample'],'backpack.JPG')]);assert.equal(files[0].type,'image/jpeg');assert.equal(files[0].name,'backpack.JPG');});
test('rejects unsupported photos with a useful message',()=>{assert.throws(()=>validatePhotoFiles([new File(['sample'],'phone.heic',{type:'image/heic'})]),/phone.heic.*JPEG/);});
test('reports photo count and size separately',()=>{assert.throws(()=>validatePhotoFiles(Array(6).fill(new File(['a'],'a.jpg'))),/at most 5/);assert.throws(()=>validatePhotoFiles([{name:'large.jpg',size:26*1024*1024,type:'image/jpeg'}]),/larger than 25 MB/);});

test('accepts photos between 10 and 25 MB',()=>{assert.equal(validatePhotoFiles([{name:'large.png',size:16464117,type:'image/png'}]).length,1);});
