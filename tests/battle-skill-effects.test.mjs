import test from "node:test";
import assert from "node:assert/strict";
import { createSkillEffects } from "../js/battle-skill-effects.js";
function fixture(t, reducedMotion, rejectFlight = false) {
  const original = globalThis.document;
  function element(x = 0) { return { children: [], dataset: {}, style: { setProperty(k,v){this[k]=v;} }, setAttribute(){}, append(child){this.children.push(child);child.parent=this;}, remove(){this.parent.children.splice(this.parent.children.indexOf(this),1);}, getBoundingClientRect(){return {left:x,top:0,width:100,height:100};}, animate(frames){this.frames=frames;return {finished:rejectFlight?Promise.reject(new Error("cancelled")):Promise.resolve()};} }; }
  globalThis.document={createElement:()=>element()}; t.after(()=>globalThis.document=original);
  const field=element();field.clientLeft=0;field.clientTop=0;
  const slots=new Map([["L4",element()],["R4",element(200)]]);
  return {field,slots,fx:createSkillEffects({field,slots,textures:new Map([["star-chain","star.png"]]),reducedMotion:()=>reducedMotion})};
}
test("reduced motion skips projectile flight and removes the short impact overlay", async t=>{
  t.mock.timers.enable({apis:["setTimeout"]});
  const {fx,field,slots}=fixture(t,true);
  const done=fx.hit({slot:"L4"},{slot:"R4"},"star-chain");
  assert.equal(field.children.length,0);assert.equal(slots.get("R4").children.length,1);
  t.mock.timers.tick(180);await done;
  assert.equal(slots.get("R4").children.length,0);
});
test("cancelled projectile animations leave no orphaned DOM nodes", async t=>{
  const {fx,field}=fixture(t,false,true);
  await assert.rejects(fx.hit({slot:"L4"},{slot:"R4"},"star-chain"),/cancelled/);
  assert.equal(field.children.length,0);
});
test("missing combat slots safely skip animation", async t=>{
  const {fx,field}=fixture(t,false);
  await fx.hit({slot:"missing"},{slot:"R4"},"star-chain");
  await fx.support({slot:"missing"},"tidal-healing");
  assert.equal(field.children.length,0);
});
