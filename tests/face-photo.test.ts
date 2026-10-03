import test from 'node:test';
import assert from 'node:assert/strict';
import {photoCrop} from '../lib/face-photo.ts';

test('photo crop preserves square source bounds across portrait, landscape and extreme controls',()=>{
 for(const [width,height] of [[1200,800],[800,1200],[800,800]]){
  for(const zoom of [1,2,3,0,100,NaN])for(const x of [-20,0,50,100,120])for(const y of [-20,0,50,100,120]){
   const crop=photoCrop(width,height,{x,y,zoom});
   assert.ok(crop.size>0&&crop.x>=0&&crop.y>=0);
   assert.ok(crop.x+crop.size<=width&&crop.y+crop.size<=height);
  }
 }
 assert.deepEqual(photoCrop(1200,800),{x:200,y:0,size:800});
 assert.deepEqual(photoCrop(1200,800,{x:100,y:100,zoom:2}),{x:800,y:400,size:400});
});
