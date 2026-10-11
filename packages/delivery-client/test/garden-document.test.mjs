// Full-document STATE regression: unavailable owner data is not an empty garden.
// Controlled owner fixture, real delivery transport and browser; no screenshots.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createHash} from 'node:crypto'
import {build} from 'esbuild'
import {chromium,expect} from '@playwright/test'
import {createDeliveryServer} from '@hathq/delivery-server'
import net from 'node:net'

test('full-document garden distinguishes unavailable, empty and populated data without reopening setup or losing panel focus',{timeout:45000},async()=>{
 const bundle=await build({stdin:{contents:"import {startDelivery} from './src/index.mjs';window.delivery=startDelivery(document.querySelector('#app'),JSON.parse(document.querySelector('#delivery-state').textContent));",resolveDir:process.cwd()},bundle:true,platform:'browser',format:'esm',minify:true,write:false,logLevel:'silent'})
 assert.deepEqual(bundle.warnings,[])
 const assets=[['client.js',Buffer.from(bundle.outputFiles[0].contents),'script'],['style.css',fs.readFileSync(new URL(import.meta.resolve('@zixcel/dom-renderer/style'))),'style']].map(([name,bytes,kind])=>({path:'/assets/'+name,bytes,bytesLength:bytes.length,digest:createHash('sha256').update(bytes).digest('hex'),kind}))
 const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r))
 const origin='http://localhost:'+port,person={id:'role:one',title:'Person',status:'Available',roleRef:{id:'role:one',revision:'role:1'},preparation:{label:'No authority registered',detail:'Owner-declared preparation note',facts:[{label:'Registered authorities',value:0}]}}
 let world={title:'Your world',objects:[person]},revision=0,effects=0,pendingPerson=false,selectedPerson=false,denied=false
 const document=descriptors=>({envelope:{contract:'hatter/delivery/1',site:{id:'fixture:garden',revision:'a'.repeat(64)},initial:null,snapshot:null,
  readiness:world?{state:'Ready',requirements:[]}:{state:'Unavailable',requirements:[{ref:'hatter:worldLabels',owner:'hatter/control',state:'Unavailable',setup:null,failure:{owner:'hatter/control',operation:'worldLabels',code:denied?'VisibilityDenied':'management-transport-failed',requirementRef:'hatter:worldLabels',detail:{class:denied?'authority':'limit',parameters:{transport:denied?'VisibilityDenied':'Backpressure'}}}}]},assets:descriptors,transport:{path:'/api/projection-live',classes:['STATE']}},
  bootstrap:{presentation:'garden',navigation:[{label:'Home',href:'/'}],page:{title:'Your world',emptyMessage:'Choose a definition package.'},inference:{available:true,roles:[{roleRef:{id:person.id},requestRef:'request:'+revision,state:'Completed',acceptedSequence:revision,detail:{result_ref:'result:'+revision}}],driverPhase:'Idle',counts:{Runnable:0,Blocked:0,Running:0,Completed:1,Failed:0,Cancelled:0}},...(world?{world}:{}),...(world?.objects.length&&!pendingPerson?{speaker:{id:person.id,title:person.title}}:{}),...(selectedPerson?{input:{key:'scene:person',revision:null}}:{}),liveDocument:{key:'document:/',revision:'document:'+revision}}})
 const descriptors=assets.map(({path,digest,bytes,kind})=>({path,digest,bytes:bytes.length,kind}))
 const server=createDeliveryServer({origin,assets,site:{document:async(url,{assets})=>document(assets),read:async()=>document(descriptors),command:async(url,value)=>{assert.equal(url.pathname,'/api/subjects');assert.deepEqual(value,{roleRef:person.roleRef});effects++;selectedPerson=true;revision++;return{key:'scene:person'}},live:async({revision:previous})=>previous==='document:'+revision?{kind:'NoChange',revision:previous}:{kind:'Snapshot',revision:'document:'+revision,payload:Buffer.from(JSON.stringify(document(descriptors)))}}})
 await server.listen();const browser=await chromium.launch()
 try{for(const width of [1280,390]){
  world={title:'Your world',objects:[person]};revision++;effects=0;pendingPerson=false;selectedPerson=false
  const page=await browser.newPage({viewport:{width,height:844}}),errors=[];page.on('pageerror',error=>errors.push(error.message))
  await page.goto(origin);await expect(page.locator('[data-world-kind=character]')).toHaveCount(1)
  await expect(page.locator('#app')).toHaveAttribute('data-live-state','Live')
  await expect(page.getByRole('button',{name:'Receive information',exact:true})).toHaveCount(0)
  const publish=async next=>{world=next;revision++;server.notify();await expect(page.locator('#app')).toHaveAttribute('data-document-revision','document:'+revision)}
  const choosePerson=async()=>{await page.locator('[data-world-id="role:one"]').click();await page.getByRole('dialog',{name:'Conversation with Person',exact:true}).getByRole('button',{name:'Open conversation',exact:true}).click()}
  await choosePerson()
  await expect(page.getByRole('dialog',{name:'Conversation',exact:true})).toBeVisible()
  await expect(page.getByRole('dialog',{name:'Conversation',exact:true})).toContainText('No authority registered')
  await expect(page.getByRole('dialog',{name:'Conversation',exact:true})).toContainText('Owner-declared preparation note')
  await expect(page.getByRole('dialog',{name:'Conversation',exact:true})).not.toContainText('Microsoft')
  const previousRequest='request:'+revision
  await publish({title:'Your world',objects:[person]})
  await expect(page.locator('[data-inference-request]')).toHaveCount(1)
  await expect(page.locator('[data-inference-request]')).toHaveAttribute('data-inference-request','request:'+revision)
  await expect(page.locator(`[data-inference-request="${previousRequest}"]`)).toHaveCount(0)
  await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Controls',exact:true}).click()
  const pose=await page.locator('.mind-world').getAttribute('data-pose')
  await page.evaluate(()=>{window.originalPerson=document.querySelector('[data-world-kind=character]');window.originalCanvas=document.querySelector('canvas')})
  for(let attempt=0;attempt<2;attempt++){
   await publish(null)
   await expect(page.locator('.world-empty-guide')).toHaveCount(0)
   await expect(page.locator('[data-world-kind=character]')).toHaveCount(1)
   await expect(page.locator('[data-world-kind=character]')).toBeDisabled()
   await expect(page.locator('#app')).toHaveAttribute('data-world-state','Stale')
   assert.equal(await page.locator('.mind-world').getAttribute('data-pose'),pose)
   assert(await page.evaluate(()=>window.originalPerson===document.querySelector('[data-world-kind=character]')&&window.originalCanvas===document.querySelector('canvas')))
   await expect(page.getByRole('dialog',{name:'Controls',exact:true})).toBeVisible()
   await expect(page.locator('[aria-label="Owner readiness"]')).toContainText('management-transport-failed')
   await publish({title:'Your world',objects:[person]})
   await expect(page.locator('[data-world-kind=character]')).toHaveCount(1)
   await expect(page.locator('[data-world-kind=character]')).toBeEnabled()
   await expect(page.locator('#app')).toHaveAttribute('data-world-state','Current')
   await expect(page.locator('.world-empty-guide')).toHaveCount(0)
  }
  denied=true;await publish(null);await expect(page.locator('[data-world-kind=character]')).toHaveCount(0)
  denied=false;await publish(null);await expect(page.locator('[data-world-kind=character]')).toHaveCount(0)
  await expect(page.locator('#app')).toHaveAttribute('data-world-state','Unavailable')
  await publish({title:'Your world',objects:[person]})
  await page.getByRole('button',{name:'Close panel',exact:true}).click()
  await publish({title:'Your world',objects:[]})
  await expect(page.getByRole('heading',{name:'No person in this world yet',exact:true})).toBeVisible()
  await page.getByRole('button',{name:'Review setup state',exact:true}).focus()
  await page.evaluate(()=>{window.emptyGuide=document.querySelector('.world-empty-guide');window.guideControl=document.activeElement})
  // A new document revision without a roster change must retain the guide node/focus.
  await publish({title:'Your world',objects:[]})
  assert(await page.evaluate(()=>window.emptyGuide===document.querySelector('.world-empty-guide')&&window.guideControl===document.activeElement))
  await expect(page.locator('[data-work-state=Completed]')).toHaveText('1')
  await publish({title:'Your world',objects:[person]});await expect(page.locator('.world-empty-guide')).toHaveCount(0)
  assert.equal(effects,0);assert.deepEqual(errors,[])
  // Selecting a person may precede the first owner publication. Open once when
  // that exact selection becomes available, not after the user chooses a menu.
  pendingPerson=true;await publish(world)
  await choosePerson()
  await expect(page.locator('#app')).toHaveAttribute('data-focus-location','/scenes?key=scene%3Aperson&current=true')
  await expect(page.locator('#app')).toHaveAttribute('aria-busy','false')
  pendingPerson=false;await publish(world)
  await expect(page.getByRole('dialog',{name:'Conversation',exact:true})).toBeVisible()
  await page.getByRole('button',{name:'Close panel',exact:true}).click()
  await publish(world);await expect(page.getByRole('dialog',{name:'Conversation',exact:true})).toBeHidden()
  pendingPerson=true;await publish(world);await choosePerson()
  await expect.poll(()=>effects).toBe(2);await expect(page.locator('#app')).toHaveAttribute('aria-busy','false')
  await page.getByRole('button',{name:'Menu',exact:true}).click();pendingPerson=false;await publish(world)
  await expect(page.getByRole('dialog',{name:'Menu',exact:true})).toBeVisible()
  assert.deepEqual(errors,[])
  await page.evaluate(()=>window.delivery.close());await expect(page.locator('canvas')).toHaveCount(0);await page.close()
 }}finally{await browser.close();await server.close()}
})
