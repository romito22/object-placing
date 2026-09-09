import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dimensions, geometry, makeUSDZ } from '../js/court.mjs';
test('official court outside boundaries, attack rear edges, net top and post centers',()=>{
  const d=dimensions(); const b=geometry(d); const get=n=>b.find(x=>x.name===n);
  assert.equal(d.width,9); assert.equal(d.attack,3);
  assert.equal(get('EndB').center[0]+get('EndB').size[0]/2,9);
  assert.equal(get('SideB').center[2]+get('SideB').size[2]/2,4.5);
  assert.equal(get('AttackB').center[0]+get('AttackB').size[0]/2,3);
  assert.equal(get('NetTop').center[1]+get('NetTop').size[1]/2,2.43);
  assert.equal(get('PostB').center[2]-get('PostA').center[2],11);
  assert.deepEqual(get('Corner1X').center,[-9,.019,-4.5]);
});
test('custom sizes preserve ratio and selected net height, floor-only excludes vertical objects',()=>{
  for(const l of [6,12,15.37,18]) {
    const d=dimensions(l,2.24); assert.equal(d.width,l/2); assert.equal(d.attack,l/6);
    const b=geometry(d,false); assert.ok(b.every(x=>x.center[1]+x.size[1]/2<=.025));
    assert.equal(b.filter(x=>x.name.startsWith('Corner')).length,8);
    assert.equal(b.filter(x=>x.name.startsWith('PostMark')).length,4);
    const top=geometry(d).find(x=>x.name==='NetTop'); assert.equal(top.center[1]+top.size[1]/2,2.24);
  }
  for(const l of [NaN,Infinity,0,5.99,18.01]) assert.throws(()=>dimensions(l));
});
test('USDZ has stored, aligned USDA with meter units and matching central-directory size',()=>{
  const bytes=makeUSDZ(dimensions()), v=new DataView(bytes.buffer);
  assert.equal(v.getUint32(0,true),0x04034b50); assert.equal(v.getUint16(8,true),0);
  const start=30+v.getUint16(26,true)+v.getUint16(28,true); assert.equal(start%64,0);
  const size=v.getUint32(22,true); const text=new TextDecoder().decode(bytes.slice(start,start+size));
  assert.ok(text.startsWith('#usda 1.0')); assert.match(text,/metersPerUnit = 1/);
  assert.equal(v.getUint32(start+size,true),0x02014b50);
  assert.equal(v.getUint32(start+size+24,true),size);
});
