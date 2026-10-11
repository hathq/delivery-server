// Contract acceptance only. This controlled site is not Hatter product evidence.
// Hatter downstream 2026: test this client with its immutable declared dependencies,
// matching product resolution rather than duplicating source-aliased dependency trees.
import test from 'node:test'
import assert from 'node:assert/strict'
import net from 'node:net'
import fs from 'node:fs'
import {createHash} from 'node:crypto'
import {build} from 'esbuild'
import {chromium,expect} from '@playwright/test'
import {createDeliveryServer} from '@hathq/delivery-server'
import {produce,scene} from '@hathq/projection-contracts'
import {projectionIdentity} from '@hathq/projection-client'
const source={owner:'fixture',ref:'subject:one',revision:'source:1',kind:'subject'}
const input={action:{operation_id:'fixture/choose',target:'subject:one',contract_revision:'input:1',availability:{state:'available'},expected_revision_required:true,
 input_schema:{type:'object',fields:{choice:{type:'string',min_length:1,max_length:64,choices:['exact-value']},instant:{type:'integer',minimum:-1000,maximum:1000}},required:['choice']}},
 fields:{choice:{label:'Choice',sensitive:false,choices:[{value:'exact-value',label:'Visible label'}]},instant:{label:'Optional evaluation instant',sensitive:false}}}
const interaction={ref:'interaction:1',generation:'generation:1',inputContractRef:'input:1',input}
function snapshot(value,ids=['item:one','item:two'],temporal=false){return scene(produce({key:'data:fixture',producer:{id:'fixture',version:'0.10.0',contract:'fixture',configuration:'fixture'},sources:[source],focus:'subject:one',purpose:'subject',visibilityRef:'owner',limits:{}},
 [{source,items:ids.map(id=>({id,semanticRef:null,group:{kind:'structural',ref:'subject:one'},value,evidence:['evidence:1'],provenance:['packet:1'],resolutionRefs:[],visibility:'visible'})),
 relations:ids.slice(1).map((to,i)=>({id:i?'relation:'+i:'relation:one',from:ids[i],to,relationRef:'relation:declared'})),unresolved:[],truncated:false}]),
 {key:'scene:fixture',focus:'subject:one',purpose:'subject',regions:[{id:'primary',role:'Primary',itemIds:ids}],actions:[{id:'choose',targetOwner:'fixture',commandRef:'fixture/choose',label:'Choose',sourceRefs:[source],contextRefs:[],interaction}],
 presentation:ids.map(itemId=>({itemId,title:itemId,fields:[{label:'Value',valuePath:typeof value==='object'?['at']:[]}]})),
 ...(temporal?{temporal:{label:'Declared time',items:ids.map(itemId=>({itemId,valuePath:['at'],format:'utcInstant'}))}}:{})})}
test('desktop/mobile exact first state, native form IDs, Crowsi update/reconnect, CSP and complete disposal', {timeout:45000},async()=>{
 const bundle=await build({stdin:{contents:"import {startDelivery} from './src/index.mjs'; window.delivery=startDelivery(document.getElementById('app'),JSON.parse(document.getElementById('delivery-state').textContent));",resolveDir:process.cwd()},
 bundle:true,platform:'browser',format:'esm',minify:true,write:false,logLevel:'silent'})
 const script=Buffer.from(bundle.outputFiles[0].contents),style=fs.readFileSync(new URL(import.meta.resolve('@hathq/dom-renderer/style')))
 assert(script.length<724992,'bounded Three.js client within the product asset budget')
 const assets=[['client.js',script,'script'],['style.css',style,'style']].map(([name,bytes,kind])=>({path:'/assets/'+name,bytes,bytesLength:bytes.length,digest:createHash('sha256').update(bytes).digest('hex'),kind}))
 const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r))
 const origin=`http://localhost:${port}`,first=snapshot('</script><script>globalThis.injected=true</script>');let current=first,commands=[],rejectCommand=false,pending=false
 const failure={owner:'fixture/owner',operation:'choose',code:'ExactOwnerFailure',requirementRef:'fixture:requirement',detail:{sourceRevision:'source:1'}}
 const document=assets=>({envelope:{contract:'hatter/delivery/1',site:{id:'fixture:site',revision:'a'.repeat(64)},snapshot:pending?null:current,initial:pending?null:projectionIdentity(current),
  readiness:pending?{state:'Unavailable',requirements:[{ref:'fixture:read',owner:'fixture',state:'Unavailable',setup:null,failure:{owner:'fixture',operation:'read',code:'SceneUnavailable',requirementRef:'fixture:read',detail:null}},
    {ref:'other:owner',owner:'other',state:'Unavailable',setup:null,failure:{owner:'other',operation:'read',code:'OtherUnavailable',requirementRef:'other:owner',detail:null}}]}:{state:'Ready',requirements:[]},
  assets,transport:{path:'/api/projection-live',classes:['STATE']}},bootstrap:{navigation:[{label:'Source settings',href:'/',symbol:'package'}],page:{title:'Source settings',description:'Choose a verified distribution source.',emptyMessage:'No adopted subjects. Select a definition package.'},data:{observed:{count:7,owner:'fixture-data'}},actions:pending?[{id:'source:1',label:'Configure source',input}]:[],input:{key:current.key,revision:pending?null:current.revision,...(pending?{requirementRef:'fixture:read'}:{})}}})
 const descriptors=assets.map(({path,digest,bytesLength:bytes,kind})=>({path,digest,bytes,kind}))
 const server=createDeliveryServer({origin,assets,site:{document:async(url,{assets})=>document(assets),read:async()=>document(descriptors),
  command:async(url,value)=>{if(url.pathname==='/api/site-actions'){assert.deepEqual(value,{id:'source:1',values:{choice:'exact-value'}});commands.push(value);return {state:'Accepted'}}assert.equal(url.pathname,'/api/interactions');assert.equal(value.projectionRevision,current.revision);assert.equal(value.values.choice,'exact-value');if(rejectCommand)throw Object.assign(Error(failure.code),{code:failure.code,failure});commands.push(value);return {state:'Accepted'}},
  live:async({revision})=>pending?{kind:'RecoveryUnavailable'}:revision===current.revision?{kind:'NoChange',revision}:{kind:'Snapshot',revision:current.revision,payload:Buffer.from(JSON.stringify(current))}}})
 const sockets=new Set();server.server.on('upgrade',(request,socket)=>{sockets.add(socket);socket.once('close',()=>sockets.delete(socket))})
 await server.listen();const browser=await chromium.launch({headless:true})
 try{for(const viewport of [{width:1440,height:900},{width:390,height:844},{width:844,height:390}]){
  current=first;const context=await browser.newContext({viewport,hasTouch:viewport.width<500,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.setDefaultTimeout(5000)
  page.on('pageerror',error=>errors.push(error.message))
  await page.addInitScript(()=>{window.policyErrors=[];document.addEventListener('securitypolicyviolation',event=>window.policyErrors.push(event.violatedDirective))})
const systemMenu=async()=>{const group=page.getByRole('dialog').locator('details').filter({has:page.getByText('System and connection',{exact:true})});if(!await group.evaluate(n=>n.open))await group.locator('summary').click()}
const panel=async name=>{if(['System data','View and time','Conversation'].includes(name)){await panel('Context');if(name==='System data')await systemMenu();await page.getByRole('dialog').getByRole('button',{name:name==='System data'?'Inspect current data':name==='Conversation'?'Review this view':name,exact:true}).click();return}const button=name==='Context'?page.locator('.frame-dock [data-panel=settings]'):page.getByRole('navigation',{name:'Window tools'}).getByRole('button',{name,exact:true});if(await button.getAttribute('aria-expanded')!=='true')await button.click()}
  const close=async()=>{if(await page.getByRole('button',{name:'Close panel',exact:true}).isVisible())await page.getByRole('button',{name:'Close panel',exact:true}).click()}
  const fits=async()=>{await expect.poll(()=>page.evaluate(()=>{const stage=document.querySelector('.window-stage').getBoundingClientRect(),panel=document.querySelector('.frame-panel:not([hidden])')?.getBoundingClientRect();return stage.x===0&&stage.y===0&&stage.width===innerWidth&&stage.height===innerHeight&&(!panel||panel.left>=0&&panel.top>=0&&panel.right<=innerWidth&&panel.bottom<=innerHeight)})).toBe(true);assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth),true)}
  await page.goto(origin);await expect(page.locator('#app')).toHaveAttribute('data-initial-revision',first.revision)
  await expect(page.locator('[data-render-revision]')).toHaveAttribute('data-render-revision',first.revision)
  assert.equal(await page.evaluate(()=>globalThis.injected),undefined)
  await panel('Context')
  assert.equal(await page.getByRole('button',{name:'Language and information',exact:true}).count(),0,'no undeclared site information or personal language form')
  await close()
  await fits();await page.getByRole('button',{name:'Connection and notifications',exact:true}).click();await expect(page.getByRole('dialog',{name:'Notifications',exact:true})).toBeVisible();await close();const dock=await page.locator('.frame-dock button').evaluateAll(ns=>ns.map(n=>({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y})));assert.equal(new Set(dock.map(n=>viewport.width<500||viewport.height<=450?n.y:n.x)).size,1,'edge icons remain on a single row/column');await panel('System data')
  assert.deepEqual(await page.locator('.frame-dock button').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label'))),['Home','Menu'])
  assert((await page.locator('.frame-dock button').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().width))).every(width=>width===44),'compact dock retains touch-sized targets')
  assert((await page.locator('.frame-dock .ui-symbol').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().width))).every(width=>width===18),'compact icons preserve the world area')
  await expect(page.getByRole('region',{name:'World controls',exact:true})).toBeHidden()
  await panel('Context');await page.getByRole('button',{name:'Controls',exact:true}).click()
  await expect(page.getByRole('dialog',{name:'Controls',exact:true})).toBeVisible()
  await expect(page.getByRole('region',{name:'World controls',exact:true})).toContainText('W / ↑')
  await expect(page.getByRole('region',{name:'World controls',exact:true})).toContainText('Wheel / pinch')
  await expect(page.locator('.world-help')).toHaveCount(0)
  await fits();await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name:'Controls',exact:true})).toBeHidden()
  await panel('System data')
  assert.equal(await page.locator('.frame-bar h1').count(),1,'one scope heading, not a second title in a breadcrumb')
  const information=page.locator('details').filter({has:page.getByText('ⓘ About this view',{exact:true})})
  assert.equal(await information.evaluate(node=>node.open),false)
  await information.locator('summary').click();await expect(information).toContainText('Choose a verified distribution source.')
  await information.locator('summary').click()
  await expect(page.locator('[data-realtime-state]')).toHaveAttribute('data-realtime-state','Live')
  const one=page.locator('[data-item-id="item:one"]'),two=page.locator('[data-item-id="item:two"]')
  await close()
  await expect(page.locator('.mind-world')).toHaveAttribute('data-gpu','ready')
  await expect(page.locator('.mind-world')).toHaveAttribute('data-pattern','constellation')
  await expect(page.locator('.mind-world')).toHaveAttribute('data-target','scene:fixture')
  await expect(page.locator('.world-updates summary')).toHaveText('No changes observed in this view')
  await expect(page.locator('.world-name')).toHaveCount(1)
  const commandCount=commands.length
  await page.locator('.world-nearby summary').click()
  await page.getByRole('button',{name:'Browse shelf subject:one',exact:true}).click()
  await expect(page.locator('.world-name')).toHaveCount(2)
  await page.locator('.world-nearby summary').click()
  await page.getByLabel('Find in this space',{exact:true}).fill('item:two')
  await expect(page.locator('.world-directory [data-directory-id]:visible')).toHaveCount(1)
  await expect(page.locator('.world-directory [data-directory-id]:visible')).toHaveAttribute('data-directory-id','item:two')
  await page.getByLabel('Find in this space',{exact:true}).fill('no such item')
  await expect(page.getByText('No matching objects in this scope.',{exact:true})).toBeVisible()
  await page.getByLabel('Find in this space',{exact:true}).fill('')
  await page.locator('.world-nearby summary').click()
  assert.equal(await page.getByRole('button',{name:'View all',exact:true}).filter({visible:true}).count(),1,'one visible overview control')
  assert.equal(commands.length,commandCount,'opening a presentation group is not an owner operation')
  assert.equal(await page.evaluate(()=>window.delivery.runtime.projection.revision),first.revision)
  assert.equal(await one.locator('.object-fields').isVisible(),false,'fields belong in details, not on the landscape')
  await expect(page.locator('[data-view-mode]')).toHaveAttribute('data-view-mode','spatial')
  await page.evaluate(()=>{window.originalItem=document.querySelector('[data-item-id]')})
  const pose=()=>page.locator('.mind-world').getAttribute('data-pose').then(JSON.parse)
  const before=await pose();await page.locator('canvas').hover({position:{x:20,y:20}});await page.mouse.wheel(0,-200)
  await expect.poll(async()=>(await pose()).z).toBeLessThan(before.z)
  assert.equal(await page.evaluate(()=>window.originalItem===document.querySelector('[data-item-id]')),true,'walking never rebuilds canonical content')
  await page.getByRole('button',{name:'View all',exact:true}).first().click()
  await page.locator('[data-world-id="item:one"]').click()
  await expect(one).toHaveAttribute('data-selected','true');await expect(two).toHaveAttribute('data-related','true')
  await expect(page.locator('[data-relation-id="relation:one"]')).toHaveAttribute('data-active','true')
  await expect(page.getByRole('dialog',{name:'Details',exact:true})).toContainText('item:one')
  assert.equal(await page.evaluate(()=>window.delivery.runtime.projection.revision),first.revision)
  await close()
  await panel('View and time')
  const switchView=page.getByRole('button',{name:'List view',exact:true})
  if(viewport.width<500)await switchView.tap();else{await switchView.focus();await page.keyboard.press('Enter')}
  await expect(page.locator('[data-view-mode]')).toHaveAttribute('data-view-mode','structured')
  assert.equal(await page.locator('[data-item-id]').count(),2)
  await two.getByRole('button',{name:'item:two',exact:true}).click()
  assert.equal(await page.locator('[data-book-id="item:two"]').count(),0,'selection is not a detail overlay')
  await two.getByRole('button',{name:'View details',exact:true}).click()
  await expect(page.locator('[data-book-id="item:two"]')).toContainText('item:two')
  const detail=page.locator('[data-book-id="item:two"]')
  assert.deepEqual(await detail.locator('dt,dd').allTextContents(),await two.locator('.object-fields dt,.object-fields dd').allTextContents(),'details show the same declared field labels and values, not internal records')
  assert.equal(await detail.locator('dt').count(),1)
  assert.equal(await detail.locator('details').count(),0)
  assert.equal(await page.getByText('Technical record',{exact:true}).count(),0)
  assert.equal(await page.getByRole('button',{name:'Inspect raw data',exact:true}).count(),0)
  assert.equal(await detail.getByText('packet:1',{exact:true}).count(),0,'internal provenance is not presented as personal information')
  await page.getByRole('button',{name:'Close book',exact:true}).click()
  assert.equal(await page.locator('[data-book-id]').count(),0)
  await panel('Conversation');await page.getByRole('button',{name:'Choose',exact:true}).click();await expect(page.locator('form'),await page.locator('#app').innerText()).toBeVisible();await page.getByLabel('Choice',{exact:true}).selectOption('exact-value')
  await panel('View and time');await page.getByRole('button',{name:'Spatial view',exact:true}).click();await panel('Conversation')
  await expect(page.getByLabel('Choice',{exact:true})).toHaveValue('exact-value')
  await page.getByRole('button',{name:'Submit',exact:true}).click();await expect(page.getByText('Submitted.',{exact:true})).toBeVisible()
  assert.equal(commands.at(-1).generation,'generation:1');assert.equal(commands.at(-1).interactionRef,'interaction:1')
  rejectCommand=true;await page.getByRole('button',{name:'Submit',exact:true}).click()
  await expect(page.locator('form [role=alert]')).toBeVisible()
  const displayed=await page.locator('form [data-projection-scalar]').evaluateAll(ns=>ns.map(n=>n.dataset.projectionScalar))
  for(const exact of [failure.owner,failure.operation,failure.code,failure.requirementRef,'source:1'])assert(displayed.includes(JSON.stringify(exact)))
  rejectCommand=false
  await page.evaluate(()=>{window.retainedCanvas=document.querySelector('canvas');window.retainedItem=document.querySelector('[data-item-id="item:one"]');window.retainedLabel=document.querySelector('[data-world-id="item:one"]');window.retainedUploads=document.querySelector('.mind-world').dataset.uploads})
  current=snapshot('updated-exact-value');server.notify()
  await expect(page.locator('[data-render-revision]')).toHaveAttribute('data-render-revision',current.revision)
  await expect(two).toHaveAttribute('data-selected','true');assert.equal(await page.locator('form').count(),0)
  assert(await page.evaluate(()=>window.retainedCanvas===document.querySelector('canvas')&&window.retainedItem===document.querySelector('[data-item-id="item:one"]')&&window.retainedLabel===document.querySelector('[data-world-id="item:one"]')&&window.retainedUploads===document.querySelector('.mind-world').dataset.uploads),'publication updates retain renderer, item nodes and geometry')
  await expect(page.locator('.mind-world')).toHaveAttribute('data-initializations','1')
  await close()
  await expect(page.locator('.world-updates summary')).toContainText('Observed changes · 2')
  await page.locator('.world-updates summary').click()
  await expect(page.locator('.world-updates [data-change-id="item:one"]')).toHaveText('item:one · Content changed')
  await page.locator('.world-updates [data-change-id="item:one"]').click()
  assert.equal(await page.evaluate(()=>window.delivery.runtime.projection.revision),current.revision,'change navigation never changes canonical state')
  assert.equal(commands.length,commandCount+1,'change navigation never submits an operation')
  const intersects=await page.evaluate(()=>{const rect=s=>document.querySelector(s).getBoundingClientRect(),a=rect('.world-updates'),b=rect('.stage-tools'),c=rect('.frame-dock');const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;return overlap(a,b)||overlap(a,c)||overlap(b,c)})
  assert.equal(intersects,false,JSON.stringify({requirement:'changes, camera and dock occupy separate regions',viewport,rects:await page.locator('.world-updates,.stage-tools,.frame-dock').evaluateAll(ns=>ns.map(n=>({class:n.className,rect:n.getBoundingClientRect().toJSON()})))}))
  // Physical connection loss exercises Crowsi recovery, not an app polling path.
  assert.equal(sockets.size,1);for(const socket of sockets)socket.destroy()
  await expect(page.locator('[data-realtime-state]')).toHaveAttribute('data-realtime-state','Reconnecting')
  await expect(page.locator('[data-realtime-state]')).toHaveAttribute('data-realtime-state','Live')
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
  pending=true;await page.reload()
  await expect(page.locator('.mind-world')).toHaveAttribute('data-objects','0')
  await panel('Context');await systemMenu();await expect(page.getByRole('button',{name:'Read current state',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('.frame-dock [data-panel=settings]')).toBeFocused();await fits()
  await expect(page.locator('.world-empty-guide')).toHaveCount(0)
  await expect(page.getByRole('button',{name:'Menu',exact:true})).toBeVisible()
  assert.equal(await page.locator('[data-item-id]').count(),0,'navigation scaffold never invents data items')
  await expect(page.getByRole('heading',{name:'Source settings',exact:true})).toBeVisible()
  await panel('System data');await expect(page.locator('.empty-explanation')).toBeVisible();await expect(page.locator('[data-information-key=observed]')).toContainText('7');await panel('Context');await page.getByRole('button',{name:'Configure source',exact:true}).click()
  await page.getByLabel('Choice',{exact:true}).selectOption('exact-value')
  await page.getByRole('button',{name:'Submit',exact:true}).click()
  await expect(page.locator('#app')).toHaveAttribute('aria-busy','false')
  assert.deepEqual(commands.at(-1),{id:'source:1',values:{choice:'exact-value'}})
  await expect(page.locator('form'),'document replacement disposes site input').toHaveCount(0)
  await expect(page.locator('[aria-label="Owner readiness"]')).toContainText('SceneUnavailable')
  assert.equal(await page.locator('[data-render-revision]').count(),0)
  pending=false;server.notify()
  await expect(page.locator('[data-render-revision]')).toHaveAttribute('data-render-revision',current.revision)
  await expect(page.locator('.mind-world')).toHaveCount(1)
  await expect(page.locator('[aria-label="Owner readiness"]')).not.toContainText('SceneUnavailable')
  await expect(page.locator('[aria-label="Owner readiness"]')).toContainText('OtherUnavailable')
  current=snapshot({at:'2026-09-16T09:00:00.000Z'},['item:one','item:two'],true);server.notify()
  await expect(page.locator('[data-render-revision]')).toHaveAttribute('data-render-revision',current.revision)
  await panel('View and time');await page.getByRole('button',{name:'2026-09-16T09:00:00.000Z · item:two',exact:true}).click()
  assert.equal(await page.evaluate(()=>window.delivery.runtime.presentation.timeCursor),'item:two')
  assert.equal(await page.evaluate(()=>window.delivery.runtime.projection.revision),current.revision)
  await expect(page.locator('[data-item-id="item:two"]')).toHaveAttribute('data-focused','true')
  await page.getByRole('button',{name:'All times',exact:true}).click()
  assert.equal(await page.evaluate(()=>window.delivery.runtime.presentation.timeCursor),null)
  const ids=Array.from({length:128},(_,i)=>'entity:'+i)
  current=snapshot('bounded-exact-state',ids);server.notify()
  await expect(page.locator('[data-render-revision]')).toHaveAttribute('data-render-revision',current.revision)
  assert.deepEqual(await page.locator('[data-item-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.itemId)),ids)
  assert.equal(await page.locator('[data-relation-id]').count(),127)
  await panel('View and time');await page.getByRole('button',{name:'List view',exact:true}).click()
  const middle=page.locator('[data-item-id="entity:64"]').getByRole('button',{name:'entity:64',exact:true})
  await middle.scrollIntoViewIfNeeded()
  const beforeScroll=await page.locator('.frame-panel-body:visible').evaluate(node=>node.scrollTop)
  await middle.click()
  await page.locator('[data-item-id="entity:64"]').getByRole('button',{name:'View details',exact:true}).click()
  await expect(page.locator('[data-book-id="entity:64"]')).toContainText('entity:64');assert.equal(await page.locator('.scene-viewport').evaluate(node=>node.scrollLeft),0,'selection does not move the world camera')
  assert.equal(await page.locator('[data-relation-id][data-active=true]').count(),2)
  assert.equal(await page.locator('[data-item-id][data-related=true]').count(),3)
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
  await fits();assert.equal(await page.locator('.frame-panel-body:visible').count(),1)
  const identities=await page.locator('[data-control]').evaluateAll(nodes=>nodes.map(n=>n.dataset.control))
  assert.equal(new Set(identities).size,identities.length)
  if(process.env.HATTER_SCENE_EVIDENCE_DIRECTORY){
   await page.getByRole('button',{name:'Spatial view',exact:true}).click();await close();await fits()
   await page.screenshot({path:process.env.HATTER_SCENE_EVIDENCE_DIRECTORY+'/scene-'+viewport.width+'.png'})
  }
  assert.deepEqual(errors,[]);assert.deepEqual(await page.evaluate(()=>window.policyErrors),[])
  await page.evaluate(()=>window.delivery.close());await expect(page.locator('canvas')).toHaveCount(0);await context.close()
 }}finally{await browser.close();await server.close()}
 assert.equal(server.inspect().transport.connections,0);assert.equal(server.inspect().transport.sessions,0);assert.equal(server.inspect().activeRequests,0)
 console.log(JSON.stringify({browserBytes:script.length,styleBytes:style.length,commands:commands.length,viewports:3}))
})
