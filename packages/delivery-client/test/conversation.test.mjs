// Controlled contract fixture: real transport/rendering, not a claim of live LLM execution.
import test from 'node:test'
import {assertClientBundleBudget} from './bundle-budget.mts'
import assert from 'node:assert/strict'
import net from 'node:net'
import fs from 'node:fs'
import {createHash} from 'node:crypto'
import {build} from 'esbuild'
import {chromium,expect} from '@playwright/test'
import {createDeliveryServer} from '@hathq/delivery-server'
import {produce,scene} from '@zixcel/projection-contracts'
import {projectionIdentity} from '@zixcel/projection-client'

test('bounded role conversation: execution state, exact confirmation, stale input invalidation and disposal on desktop/mobile',{timeout:60000},async()=>{
 const source={owner:'fixture/control',ref:'execution:one',revision:'source:1',kind:'operation'}
 const input={action:{operation_id:'fixture/confirm',target:'execution:one',contract_revision:'input:1',availability:{state:'available'},expected_revision_required:true,
  input_schema:{type:'object',fields:{decision:{type:'string',choices:['approve','decline'],max_length:32}},required:['decision']}},fields:{decision:{label:'Your choice',sensitive:false,choices:[{value:'approve',label:'Proceed'},{value:'decline',label:'Not now'}]}}}
 const interaction={ref:'confirmation:one',generation:'generation:1',inputContractRef:'input:1',input}
 const snapshot=(status,revision)=>{const exact={...source,revision};return scene(produce({key:'data:conversation',producer:{id:'fixture',version:'0.10.0',contract:'fixture',configuration:'fixture'},sources:[exact],focus:'role:guide',purpose:'Local inference',visibilityRef:'owner',limits:{}},
  [{source:exact,items:[{id:'execution:one',semanticRef:null,group:{kind:'structural',ref:'role:guide'},value:{status,model:'Local test model',scope:'Exact fixture scope',input:'Provided input',result:'<script>not executable</script>',reference:'execution:one'},evidence:[],provenance:[],resolutionRefs:[],visibility:'visible'}],relations:[],unresolved:status==='UnknownExpression'?[{id:'unknown:one',reason:'UnknownExpression',evidence:['result:exact'],contextRefs:['role:guide'],actionRefs:[]}]:[],truncated:false}]),
  {key:'scene:conversation',focus:'role:guide',purpose:'Local inference',regions:[{id:'primary',role:'Primary',itemIds:['execution:one']}],
   presentation:[{itemId:'execution:one',title:'Review the proposed action',fields:[{label:'Execution state',valuePath:['status']},{label:'Model',valuePath:['model']},...['scope','input','result','reference'].map(key=>({label:key,valuePath:[key]}))]}],
   actions:status==='AwaitingConfirmation'?[{id:'confirm',targetOwner:'fixture/control',commandRef:'fixture/confirm',label:'Review your choice',sourceRefs:[exact],contextRefs:[],interaction}]:[]})}
 const bundle=await build({stdin:{contents:"import {startDelivery} from './src/index.mjs';window.delivery=startDelivery(document.getElementById('app'),JSON.parse(document.getElementById('delivery-state').textContent));",resolveDir:process.cwd()},bundle:true,platform:'browser',format:'esm',minify:true,write:false,logLevel:'silent'})
 assert.deepEqual(bundle.warnings,[]);assertClientBundleBudget(bundle.outputFiles[0].contents)
 const assets=[['client.js',Buffer.from(bundle.outputFiles[0].contents),'script'],['style.css',fs.readFileSync(new URL(import.meta.resolve('@zixcel/dom-renderer/style'))),'style']].map(([name,bytes,kind])=>({path:'/assets/'+name,bytes,bytesLength:bytes.length,digest:createHash('sha256').update(bytes).digest('hex'),kind}))
 const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r))
 const origin='http://localhost:'+port;let current=snapshot('Running','source:1'),commands=[],workState='Running',relatedReads=0,driverFailure=null,ranking=null,inferenceAvailable=true
 const received=[
  {reference:'review:1',input_ref:'source:1',surface:'A fictional person is learning a language.'},
  {reference:'review:2',input_ref:'source:2',surface:'A fictional project needs a decision this week.'},
  {reference:'review:3',input_ref:'source:3',surface:'A fictional contact address is available.'}
 ]
 const memoryTimeline={entries:[
  {id:'long:one',reference:'one',memory:'long-term',state:'accepted',at:30,label:'Asia/Tokyo',predicate:'TimeZone',revision:'context:1',sourceRefs:['promotion:one'],sensoryRefs:[]},
  {id:'short:one',reference:'one',memory:'short-term',state:'observed',at:20,label:received[0].surface,predicate:null,sourceRefs:['source:1'],sensoryRefs:[]},
  {id:'short:two',reference:'two',memory:'short-term',state:'observed',at:null,label:received[1].surface,predicate:null,sourceRefs:['source:2'],sensoryRefs:[]}
 ],channels:[...['Sight','Hearing','Touch','Smell','Taste','Body'].map((label,index)=>({id:String(index),label,symbol:'◉',entries:[]}))],unclassifiedCount:3,
 note:'Sensory channels require an explicit semantic binding.'}
 const activity=()=>inferenceAvailable?({available:true,roles:[
  {roleRef:{id:'role:observer'},requestRef:'other-person-request',state:'Failed'},
  {roleRef:{id:'role:guide',revision:'role:1'},requestRef:'request:active',kind:'inference',state:workState,acceptedSequence:2,scopeRef:{id:'scope:mail',revision:'scope:1'},runtimeRef:'runtime:local',processRef:'process:local',inputAvailable:true,detail:workState==='Completed'?{result_ref:'result:exact'}:null},
  {roleRef:{id:'role:guide'},requestRef:'request:blocked',kind:'inference',state:'Blocked',acceptedSequence:1,inputAvailable:false,detail:'InputUnavailable'},
  {roleRef:{id:'role:guide'},requestRef:'request:resolution',kind:'resolution',state:'Failed',acceptedSequence:3,execution:{kind:'resolution',confirmationRef:{id:'confirmation:exact'}},detail:{source:{owner:'sem-lang',code:'ExactSemanticRefusal'}}}
 ],counts:{Runnable:0,Blocked:1,Running:workState==='Running'?1:0,Completed:workState==='Completed'?1:0,Failed:2,Cancelled:0},driverPhase:driverFailure?'finished':'dispatching',driverFailed:Boolean(driverFailure),failure:driverFailure}):{available:false,roles:[],failure:{code:'LocalInferenceUnavailable'}}
 const server=createDeliveryServer({origin,assets,site:{document:async(url,{assets})=>({envelope:{contract:'hatter/delivery/1',site:{id:'fixture:site',revision:'a'.repeat(64)},initial:projectionIdentity(current),snapshot:current,readiness:{state:'Ready',requirements:[]},assets,transport:{path:'/api/projection-live',classes:['STATE']}},
  bootstrap:{presentation:'garden',inference:activity(),world:{title:'Your world',objects:[{id:'role:guide',title:'Guide',status:'Available',memoryPerspective:{shortTerm:2,longTerm:1,unclassified:3,channels:memoryTimeline.channels.map(({id,label,symbol,entries})=>({id,label,symbol,count:entries.length}))}},{id:'role:observer',title:'Observer',status:'Available'}]},page:{title:'Local inference'},speaker:{id:'role:guide',title:'Guide',observations:received,memoryTimeline,reviewPriority:ranking},input:{key:current.key,revision:current.revision}}}),
  read:async url=>{relatedReads++;assert.equal(url.pathname,'/api/projections');assert.equal(url.searchParams.get('related'),'unknown:one');return {entries:[]}},
  command:async(url,value)=>{assert.equal(url.pathname,'/api/interactions');assert.equal(value.projectionRevision,current.revision);assert.equal(value.interactionRef,interaction.ref);assert.equal(value.generation,interaction.generation);assert.equal(value.inputContractRef,interaction.inputContractRef);assert.deepEqual(value.values,{decision:'decline'});commands.push(value);return {state:'Accepted'}},
  live:async({revision})=>revision===current.revision?{kind:'NoChange',revision}:{kind:'Snapshot',revision:current.revision,payload:Buffer.from(JSON.stringify(current))}}})
 await server.listen();const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']})
 try{for(const width of [1280,390]){
  current=snapshot('Running','source:1');commands=[];workState='Running';driverFailure=null;ranking=null;inferenceAvailable=true
  const context=await browser.newContext({viewport:{width,height:844},hasTouch:width<600}),page=await context.newPage(),errors=[],images=[]
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text())});page.on('request',r=>{if(r.resourceType()==='image')images.push(r.url())})
  await page.goto(origin);await expect(page.locator('.mind-world')).toHaveAttribute('data-gpu','ready')
  await expect(page.locator('.mind-world')).toHaveAttribute('data-pattern','garden')
  const positions=await page.locator('[data-world-kind=character]').evaluateAll(ns=>ns.map(n=>[n.dataset.worldId,n.dataset.position]))
  await page.evaluate(()=>window.gardenCanvas=document.querySelector('canvas'))
  await expect(page.getByRole('navigation',{name:'Window tools'}).getByRole('button',{name:'Tasks',exact:true})).toHaveCount(0)
  const cameraBefore=await page.locator('.mind-world').getAttribute('data-pose')
  await page.locator('[data-world-id="role:guide"]').click();const dialog=page.getByRole('dialog',{name:'Conversation',exact:true})
  const separated=async()=>{await expect.poll(()=>page.evaluate(()=>{const node=document.querySelector('.frame-panel:not([hidden])'),panel=node?.getBoundingClientRect(),canvas=document.querySelector('canvas')?.getBoundingClientRect(),anchor=node?.dataset.anchorBounds?JSON.parse(node.dataset.anchorBounds):null;return !!panel&&!!canvas&&!!anchor&&canvas.width===innerWidth&&canvas.height===innerHeight&&panel.left>=0&&panel.right<=innerWidth&&panel.bottom<=innerHeight&&(panel.right<=anchor.left||panel.left>=anchor.right||panel.bottom<=anchor.top||panel.top>=anchor.bottom)})).toBe(true)}
  await separated()
  assert.equal(await page.locator('.mind-world').getAttribute('data-pose'),cameraBefore,'opening the conversation must not refit the camera')
  await expect(dialog).toHaveAttribute('data-anchor-id','role:guide')
  const initialBox=await dialog.boundingBox()
  await expect(dialog).toHaveAttribute('data-conversation','true');await expect(dialog.locator('h2').first()).toHaveText('Guide')
  await expect(dialog.locator('.conversation-deck')).toHaveAttribute('data-topic','choices','the person opens with current review, not a record inventory')
  await expect(dialog.locator('.conversation-prompts')).toBeHidden()
  await expect(dialog.getByRole('button',{name:'Back to conversation'})).toBeHidden()
  await expect(dialog.getByText('Questions and choices',{exact:true})).toHaveCount(0)
  const lead=dialog.getByRole('region',{name:'Information to review'})
  await expect(lead).toHaveAttribute('data-order','source')
  await expect(lead).toContainText(received[0].surface)
  await expect(lead).toContainText('1 / 3')
  await dialog.getByRole('button',{name:'Information about this person',exact:true}).click()
  await expect(dialog.locator('[data-person-shelf]')).toHaveCount(1,'published information remains available on demand')
  const backBox=await dialog.getByRole('button',{name:'Back to conversation'}).boundingBox()
  assert(backBox&&backBox.width<=52&&backBox.height>=44,'Back is a compact touch target, not a full-width action')
  await dialog.getByRole('button',{name:'Back to conversation'}).click()
  await dialog.getByRole('button',{name:'Memory and senses',exact:true}).click()
  await expect(dialog.getByRole('region',{name:'Memory timeline'})).toContainText('2 short-term · 1 long-term · 1 without an explicit time')
  await expect(dialog.getByRole('region',{name:'Human senses'})).toContainText('3 memory entries are not assigned to a sense')
  await expect(dialog.getByRole('region',{name:'Memory entries'}).locator('[data-memory-class=long-term]')).toContainText('Asia/Tokyo')
  await expect(dialog.getByRole('region',{name:'Memory entries'}).locator('[data-memory-class=long-term]')).toContainText('TimeZone')
  await dialog.getByRole('button',{name:'Back to conversation'}).click()
  await lead.getByRole('button',{name:'Next →'}).click()
  await expect(lead).toContainText(received[1].surface)
  await expect(lead).toContainText('2 / 3')
  await lead.getByRole('button',{name:'← Previous'}).click()
  await expect(dialog.locator('[data-inference-role]')).toBeHidden()
  const alpha=await dialog.evaluate(n=>Number(getComputedStyle(n).backgroundColor.split(',').at(-1).replace(')','')))
  assert(alpha>0.7&&alpha<1,'conversation background is readable and translucent')
  await expect(page.locator('.world-name[data-world-id="role:guide"]')).toHaveAttribute('data-activity','AwaitingResult')
  await dialog.getByRole('button',{name:'Review status',exact:true}).click()
  assert.equal(commands.length,0);assert.equal(await dialog.getByRole('button',{name:'Review your choice'}).count(),0)
  const queue=dialog.locator('[data-inference-role="role:guide"]')
  assert.deepEqual(await queue.locator('[data-inference-request]').evaluateAll(nodes=>nodes.map(n=>n.dataset.inferenceRequest)),['request:resolution','request:active','request:blocked'])
  await queue.locator('[data-inference-request="request:resolution"] summary').click()
  await expect(queue).toContainText('ExactSemanticRefusal');await expect(queue).toContainText('confirmation:exact')
  await expect(queue).not.toContainText('other-person-request')
  await expect(queue.locator('[data-role-work-state=Running]')).toHaveText('1')
  await queue.locator('[data-inference-request="request:blocked"] summary').click()
  await expect(queue).toContainText('The same accepted input must be provided again')
  await queue.locator('[data-inference-request="request:active"] summary').click()
  await expect(queue).toContainText('scope:mail');await expect(queue).toContainText('runtime:local')
  assert.deepEqual(await dialog.boundingBox(),initialBox,'expanding queue details does not reposition the bubble')
  assert.equal(await page.locator('.mind-world').getAttribute('data-pose'),cameraBefore)
  await page.getByRole('button',{name:'Close panel',exact:true}).click()
  assert.equal(await page.locator('.mind-world').getAttribute('data-pose'),cameraBefore,'closing does not move the camera')
  await page.locator('[data-world-id="role:guide"]').click()
  assert.deepEqual(await page.locator('[data-world-kind=character]').evaluateAll(ns=>ns.map(n=>[n.dataset.worldId,n.dataset.position])),positions)
  await expect(page.locator('[data-world-kind=group]')).toHaveCount(0,'shelves are internal to the person, not 3D entities')
  assert.equal(page.url(),origin+'/')
  await dialog.getByRole('button',{name:'Information about this person',exact:true}).click()
  await expect(dialog.locator('[data-person-shelf]')).toHaveCount(1)
  await dialog.locator('[data-person-shelf] summary').click()
  await dialog.locator('[data-person-information-id="execution:one"]').click();await expect(page.getByRole('dialog',{name:'Details',exact:true})).toContainText('Running')
  const book=page.locator('[data-book-id="execution:one"]')
  await expect(book.locator('.game-book-object')).toHaveCount(1)
  await expect(book.locator('.game-book-page')).toHaveCount(1)
  await expect(book.locator('dd')).toHaveCount(2)
  await expect(page.locator('.mind-world')).toBeVisible('the world remains visible while reading')
  await book.getByRole('button',{name:'Next pages',exact:true}).click()
  await expect(book).toHaveAttribute('data-book-page','1')
  assert.deepEqual(await book.locator('dd').allTextContents(),['Exact fixture scope','Provided input'])
  await page.keyboard.press('ArrowRight')
  await expect(book).toHaveAttribute('data-book-page','2')
  await expect(book).toContainText('<script>not executable</script>');assert.equal(await book.locator('script').count(),0)
  assert.deepEqual(await book.locator('dd').allTextContents(),['<script>not executable</script>','execution:one'])
  await page.keyboard.press('ArrowLeft')
  await expect(book).toHaveAttribute('data-book-page','1')
  await book.getByRole('button',{name:'Previous pages',exact:true}).click()
  assert.deepEqual(await book.locator('dd').allTextContents(),['Running','Local test model'])
  await book.getByRole('button',{name:'Next pages',exact:true}).click()
  const bookBox=await page.getByRole('dialog',{name:'Details',exact:true}).boundingBox();assert(bookBox.width<width&&bookBox.height<844*.7)
  current=snapshot('AwaitingConfirmation','source:2');server.notify();await expect(page.locator('[data-render-revision]')).toHaveAttribute('data-render-revision',current.revision)
  await expect(book).toHaveAttribute('data-book-page','0','new exact revision must not retain a stale page')
  await expect(page.getByRole('dialog',{name:'Details',exact:true})).toContainText('AwaitingConfirmation')
  await expect(page.getByRole('dialog',{name:'Details',exact:true})).toHaveAttribute('data-book','true')
  await page.getByRole('button',{name:'Close book',exact:true}).click();await page.locator('.world-nearby summary').click();await page.getByRole('button',{name:'Find Guide',exact:true}).click();await page.locator('[data-world-id="role:guide"]').click()
  await expect(dialog.locator('.conversation-deck')).toHaveAttribute('data-topic','choices')
  await expect(dialog.locator('.conversation-prompts')).toBeVisible()
  await dialog.locator('.conversation-prompts').getByRole('button',{name:'Review your choice',exact:true}).click();await dialog.getByLabel('Your choice').selectOption('approve')
  await expect(dialog.getByText('No questions or choices are currently published for this person.',{exact:true})).toBeHidden()
  current=snapshot('AwaitingConfirmation','source:3');server.notify();await expect(page.locator('[data-render-revision]')).toHaveAttribute('data-render-revision',current.revision)
  assert.equal(await dialog.locator('form').count(),0,'changed owner revision invalidates a pending confirmation')
  await dialog.getByRole('button',{name:'Back to conversation'}).click()
  await dialog.locator('.conversation-prompts').getByRole('button',{name:'Review your choice',exact:true}).click();await dialog.getByLabel('Your choice').selectOption('decline');await dialog.getByRole('button',{name:'Submit',exact:true}).click();await expect(dialog.getByText('Submitted.',{exact:true})).toBeVisible();assert.equal(commands.length,1)
  await separated()
  const box=await dialog.boundingBox();assert(box.width<width&&box.x>=0&&box.x+box.width<=width&&box.y+box.height<=844)
  const changedWidth=width===1280?390:1280
  await page.setViewportSize({width:changedWidth,height:844});await separated()
  await expect(dialog).toHaveAttribute('data-anchor-id','role:guide')
  await page.setViewportSize({width,height:844});await separated()
  // ResizeObserver and the Three camera publish asynchronously. Establish a
  // settled resize baseline before testing a subsequent owner publication.
  let priorBox=null,stableBoxes=0
  await expect.poll(async()=>{const box=JSON.stringify(await dialog.boundingBox());stableBoxes=box===priorBox?stableBoxes+1:0;priorBox=box;return stableBoxes}).toBeGreaterThanOrEqual(2)
  const liveBox=await dialog.boundingBox(),livePose=await page.locator('.mind-world').getAttribute('data-pose')
  current=snapshot('Completed','source:4');server.notify();await expect(page.locator('[data-render-revision]')).toHaveAttribute('data-render-revision',current.revision);assert.equal(await dialog.locator('form').count(),0)
  assert.deepEqual(await dialog.boundingBox(),liveBox,'realtime publication does not move the conversation')
  assert.equal(await page.locator('.mind-world').getAttribute('data-pose'),livePose)
  assert.deepEqual(await page.locator('[data-world-kind=character]').evaluateAll(ns=>ns.map(n=>[n.dataset.worldId,n.dataset.position])),positions)
  assert(await page.evaluate(()=>window.gardenCanvas===document.querySelector('canvas')))
  current=snapshot('UnknownExpression','source:5');server.notify();await expect(page.locator('[data-render-revision]')).toHaveAttribute('data-render-revision',current.revision)
  await dialog.getByRole('button',{name:'Back to conversation'}).click()
  await expect(dialog.locator('.conversation-prompts')).toBeVisible()
  await expect(dialog.getByText('No questions or choices are currently published for this person.',{exact:true})).toBeHidden()
  await dialog.locator('.conversation-prompts').getByRole('button',{name:'Meaning not recognized',exact:true}).click()
  await expect(dialog).toContainText('result:exact');await expect(dialog).toContainText('role:guide')
  assert.equal(relatedReads,0,'no declared action must not start an invented wait for a choice')
  await page.getByRole('button',{name:'Close panel',exact:true}).click()
  await page.locator('.frame-dock [data-panel=settings]').click()
  await page.getByRole('button',{name:'View and time',exact:true}).click()
  await page.getByRole('button',{name:'List view',exact:true}).click()
  const unresolved=page.locator('[data-item-id="unknown:one"]')
  await expect(unresolved).toContainText('UnknownExpression')
  await unresolved.getByRole('button',{name:'Review',exact:true}).click()
  await expect(dialog).toContainText('UnknownExpression');await expect(dialog).toContainText('result:exact')
  await expect(page.getByText(/No validated choice is available yet/)).toHaveCount(0)
  assert.equal(commands.length,1,'viewing unknown information never invents or submits a decision')
  driverFailure={code:'OriginalDispatcherFailure',parameters:{sourceOwner:'sem-lang',ownerFailure:'ExactContextRefusal'}}
  await page.reload();await page.locator('[data-world-id="role:guide"]').click()
  await expect(page.locator('.world-name[data-world-id="role:guide"]')).toHaveAttribute('data-activity','Uncertain')
  await dialog.getByRole('button',{name:'Review status',exact:true}).click()
  const failures=dialog.getByRole('region',{name:'Processing failures'})
  await expect(failures).toBeVisible();await failures.locator('summary').click()
  await expect(failures).toContainText('OriginalDispatcherFailure');await expect(failures).toContainText('ExactContextRefusal');await expect(failures).toContainText('sem-lang')
  ranking={state:'Proposed',order:['review:2','review:1'],resultRef:'result:exact'}
  await page.reload();await page.locator('[data-world-id="role:guide"]').click()
  const proposed=dialog.getByRole('region',{name:'Information to review'})
  await expect(proposed).toHaveAttribute('data-order','proposed')
  await expect(proposed).toContainText(received[1].surface)
  await proposed.getByRole('button',{name:'Next →'}).click();await expect(proposed).toContainText(received[0].surface)
  await proposed.getByRole('button',{name:'Next →'}).click();await expect(proposed).toContainText(received[2].surface)
  ranking=null;inferenceAvailable=false
  await page.reload();await page.locator('[data-world-id="role:guide"]').click()
  await expect(dialog.getByRole('region',{name:'Information to review'})).toHaveAttribute('data-order','source')
  await expect(dialog.getByRole('region',{name:'Information to review'})).toContainText(received[0].surface)
  await page.evaluate(()=>window.delivery.close());assert.equal(await page.locator('canvas').count(),0);assert.deepEqual(errors,[]);assert.deepEqual(images,[]);await context.close()
 }}finally{await browser.close();await server.close()}
})
