import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewedAnalysis} from '../server/photo-analysis.js';
const record={_id:'example',items:[{id:'a',quantity:2,replacementValue:{low:10,expected:20,high:30}},{id:'b',quantity:1,replacementValue:{low:100,expected:200,high:300}}]};
test('photo evidence requires explicit review and valid unique selected items',()=>{
 for(const input of [{reviewed:false,includedItemIds:['a']},{reviewed:true,includedItemIds:[]},{reviewed:true,includedItemIds:['unknown']},{reviewed:true,includedItemIds:['a','a']}])assert.throws(()=>reviewedAnalysis(record,input));
});
test('photo evidence stores selected items and recalculates their valuation',()=>{const result=reviewedAnalysis(record,{reviewed:true,includedItemIds:['a']});assert.equal(result.items.length,1);assert.equal(result.estimatedValue.expected,40);});
