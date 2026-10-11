// Hatter downstream 2026: presentation changes preserve input; exact source changes invalidate it.
import {ClientProjectionRuntime,renderPlan} from '@hathq/projection-client'
import {validateDelivery,readiness} from '@hathq/delivery-contracts'
import {SceneRenderer,element,valueView,inputForm,symbol,windowFrame,worldControlGuide,spatialView,structureGraph,createWorldSurface} from '@hathq/dom-renderer'
import {activityView,roleInferenceView,roleInferenceStatus} from './activity-view.mjs'
import {unresolvedPresentation} from './unresolved-presentation.mjs'
import {StateSocketClient} from '@crowsi/transport-foundation/state-socket'
import {worldObservation} from './world-observation.mjs'
import {conversationDeck} from './conversation-deck.mjs'
import {personInformation} from './person-information.mjs'

export function startDelivery(root,initial){
 const document=root.ownerDocument,window=document.defaultView,runtime=new ClientProjectionRuntime(),listeners=new AbortController()
 const worldSurface=createWorldSurface({createView:activityView,describeRole:roleInferenceStatus})
 const observeWorld=worldObservation()
 let presentedWorld=null
 const garden=initial.bootstrap.presentation==='garden'
 let envelope=validateDelivery(initial.envelope),bootstrap=initial.bootstrap,input=bootstrap.input??null,live=null,form=null,siteForm=null,drawnIdentity=null,sequence=0,requestController=null,closed=false,shellEvents=new AbortController(),worldEvents=new AbortController(),detailEvents=new AbortController(),sceneEvents=new AbortController(),requests=new AbortController()
 const heading=element(document,'details',null,{class:'world-picker','data-world-selector':''}),headingTitle=element(document,'h1','Hatter'),worldOptions=element(document,'div',null,{class:'world-picker-options'}),state=element(document,'button','',{type:'button','aria-label':'Connection and notifications'}),errors=element(document,'section',null,{'aria-label':'Owner readiness'}),index=element(document,'section'),facts=element(document,'section'),actionList=element(document,'section'),content=element(document,'section',null,{class:'scene-surface'}),controls=element(document,'section'),result=element(document,'section',null,{'aria-live':'polite'})
 const description=element(document,'p'),information=element(document,'details'),empty=element(document,'p')
 const overview=element(document,'section',null,{class:'space-overview',tabindex:'0','aria-label':'Explore your world'})
 root.classList.add('delivery-shell')
 root.dataset.cameraToolbar='true'
 state.className='delivery-state';errors.className='delivery-errors';index.className='delivery-index';empty.className='empty-explanation'
 information.append(element(document,'summary','ⓘ About this view'),description)
 const stage=element(document,'div',null,{class:'window-stage'}),sceneTools=element(document,'div'),sceneActions=element(document,'div'),details=element(document,'div')
 const breadcrumbs=element(document,'nav',null,{'aria-label':'Current location',class:'scene-breadcrumbs'}),zoomTools=element(document,'div',null,{class:'stage-tools','aria-label':'Space controls',role:'group'})
 let worldSpatial=null,graph=null,graphRole=null,worldCamera={x:0,y:0,z:1},worldPose=null,displayedLocation=window.location.href
 const sceneNames=new Map()
 let requestedConversation=null
 let renderedScene=null
 const go=path=>{requestedConversation=null;if(!garden)window.history.pushState(null,'',path);return load(path)}
 heading.append(element(document,'summary',null,{'aria-label':'Choose world'}),worldOptions)
 heading.querySelector('summary').append(headingTitle)
 root.addEventListener('pointerdown',event=>{if(!heading.contains(event.target))heading.open=false},{signal:listeners.signal})
 root.addEventListener('keydown',event=>{if(event.key==='Escape')heading.open=false},{signal:listeners.signal})
 stage.append(overview,content)
 const settings=element(document,'section'),conversationLinks=element(document,'section',null,{'aria-label':'Published role activities'})
 const viewOptions=element(document,'section',null,{'aria-label':'Presentation controls'})
 const structure=element(document,'section')
 const personInference=element(document,'section'),personFailures=element(document,'section',null,{'aria-label':'Processing failures'})
 let personInferenceSignature=null
 const processingTopic=element(document,'section'),inputTopic=element(document,'section'),retainedTopic=element(document,'section'),personInformationTopic=element(document,'section',null,{'aria-label':'Information about this person'})
 processingTopic.append(personFailures,personInference);inputTopic.append(controls,result)
 const conversation=conversationDeck(document,{operations:conversationLinks,feedback:sceneActions,processing:processingTopic,input:inputTopic,observations:retainedTopic,information:personInformationTopic})
 const frame=windowFrame(root,{stage,title:heading,state,panels:[
  {id:'home',label:'Home',symbol:'home',activate:async()=>{await go('/');worldSpatial?.change('reset')}},
  {id:'actions',label:'Conversation',symbol:'person',nodes:[conversation.root],dock:false},
  {id:'scene',label:'View and time',symbol:'clock',nodes:[sceneTools],dock:false},
  {id:'help',label:'Controls',symbol:'info',nodes:[worldControlGuide(document)],dock:false},
  {id:'details',label:'Details',symbol:'search',nodes:[details],dock:false},
  {id:'status',label:'Notifications',symbol:'activity',nodes:[errors],dock:false},
  {id:'information',label:'System data',symbol:'info',nodes:[empty,index,facts,information],dock:false},
  {id:'structure',label:'Semantic structure',symbol:'nodes',nodes:[structure],dock:false},
  {id:'settings',label:'Menu',symbol:'menu',nodes:[settings]}
 ]})
 breadcrumbs.append(heading);root.querySelector('.frame-bar').prepend(breadcrumbs);root.append(zoomTools)
 const observationNote=element(document,'output','Update unavailable · Showing last observed people. Actions are disabled.',{class:'world-observation',role:'status'})
 observationNote.hidden=true;root.append(observationNote)
 root.addEventListener('frame-panel-open',()=>{requestedConversation=null;if(!bootstrap.speaker&&root.dataset.panel==='actions')conversation.show(controls.childNodes.length?'input':'feedback')},{signal:listeners.signal})
 function openRequestedConversation(){if(requestedConversation&&bootstrap.speaker?.id===requestedConversation.id&&input?.key===requestedConversation.key){requestedConversation=null;conversation.show('choices');frame.open('actions')}}
 for(const [action,label,icon]of [['out','Zoom out','−'],['in','Zoom in','+'],['reset','View all','⛶']])zoomTools.append(button(icon,()=>{if(worldSpatial)worldSpatial.change(action);else renderer.changeCamera(action)},listeners.signal))
 for(const [i,label]of ['Zoom out','Zoom in','View all'].entries()){zoomTools.children[i].setAttribute('aria-label',label);zoomTools.children[i].title=label}
 function updateLocation(){
  const path=new URL(displayedLocation).pathname,home=path==='/'&&!input?.key
  stage.dataset.scope=garden?'garden':home?'world':input?.key?'subject':'view'
  const back=button('←',()=>window.history.back(),detailEvents.signal);back.setAttribute('aria-label','Back');back.title='Back';back.hidden=home||window.history.length<2
  headingTitle.setAttribute('aria-current','page');breadcrumbs.replaceChildren(back,heading)
  if(garden){back.hidden=true;headingTitle.textContent=bootstrap.worlds?.worlds?.find(w=>w.id===(bootstrap.worlds.mounted??bootstrap.worlds.active))?.name??'Your world';if(!home)breadcrumbs.append(element(document,'span',bootstrap.speaker?.title??bootstrap.page?.title??'',{class:'garden-focus'}))}
  renderWorldPicker()
  zoomTools.hidden=!(worldSpatial||content.querySelector('[data-view-mode=spatial]')||garden&&overview.querySelector('.mind-world'))
  viewOptions.hidden=!content.querySelector('[data-render-key]')
  for(const node of root.querySelectorAll('.frame-dock [data-panel]')){const active=node.dataset.panel==='home'&&home||node.dataset.panel==='add'&&path==='/store';if(active)node.setAttribute('aria-current','page');else node.removeAttribute('aria-current')}
 }
 state.addEventListener('click',()=>frame.open('status'),{signal:listeners.signal})
 function button(label,operation,signal=shellEvents.signal){const b=element(document,'button',label,{type:'button'});b.addEventListener('click',async()=>{if(b.disabled)return;b.disabled=true;try{await operation()}catch(error){showError(error)}finally{b.disabled=false}},{signal});return b}
 function showError(error){if(closed)return;const value=error?.error??error;errors.replaceChildren(element(document,'strong',value.code??'DeliveryUnavailable'),valueView(document,value.ownerFailure??{code:value.code??'DeliveryUnavailable'}));errors.setAttribute('role','alert');frame.notify(1);frame.open('status')}
 let worldPickerIdentity=null
 function renderWorldPicker(){
  const catalog=bootstrap.worlds,identity=JSON.stringify(catalog??null)
  if(worldPickerIdentity===identity)return
  worldPickerIdentity=identity;worldOptions.replaceChildren(element(document,'small','Worlds on this device'))
  if(!Array.isArray(catalog?.worlds)){worldOptions.append(element(document,'p','World selection is unavailable. Review notifications.'));return}
  for(const item of catalog.worlds){
   const available=catalog.availability?.[item.id]!==false
   const choice=button(item.name+(item.id===catalog.mounted?' · Current':available?'':' · Folder unavailable'),async()=>{
    heading.open=false
    if(item.id===catalog.mounted&&catalog.active===catalog.mounted){await go('/');return}
    await mutate('/api/worlds',{operation:'select',id:item.id});await waitForWorld(item.id)
   },listeners.signal)
   choice.dataset.worldId=item.id
   choice.disabled=!available
   if(item.id===catalog.mounted)choice.setAttribute('aria-current','true')
   worldOptions.append(choice)
  }
  const create=element(document,'form',null,{class:'world-create'}),name=element(document,'input',null,{type:'text',name:'name',maxlength:'80',required:'',placeholder:'World name','aria-label':'New world name'}),directory=element(document,'input',null,{type:'text',name:'directory',required:'',placeholder:'/absolute/path/to/world','aria-label':'World folder on this device'}),submit=element(document,'button','Create and enter',{type:'submit'})
  create.append(element(document,'small','New world · choose an empty folder on the Hatter host'),name,directory,submit)
  create.addEventListener('submit',async event=>{
   event.preventDefault();submit.disabled=true
   try{const result=await mutate('/api/worlds',{operation:'create',name:name.value.trim(),directory:directory.value.trim()});heading.open=false;await waitForWorld(result.active)}
   catch(error){showError(error)}finally{submit.disabled=false}
  },{signal:listeners.signal})
  worldOptions.append(create)
 }
 async function waitForWorld(id){
  result.textContent='Opening the selected world…'
  let stable=0
  for(let attempt=0;attempt<60;attempt++){
   await new Promise(resolve=>setTimeout(resolve,300))
   try{await connect();const current=await json('/api/worlds');stable=current.active===id&&current.mounted===id?stable+1:0
    if(stable===3){window.location.assign('/');return}}catch{stable=0}
  }
  throw Object.assign(Error('WorldSwitchUnavailable'),{code:'WorldSwitchUnavailable'})
 }
 async function json(path,options={}){
  const response=await fetch(path,{...options,signal:AbortSignal.any([requests.signal,AbortSignal.timeout(10000),...(options.signal?[options.signal]:[])])})
  // Fetch at most one bounded owner response, checking before accumulation grows.
  const reader=response.body.getReader(),chunks=[];let bytes=0
  try{for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>1048576)throw Object.assign(Error('DeliveryLimitExceeded'),{code:'DeliveryLimitExceeded'});chunks.push(value)}}finally{await reader.cancel()}
  const buffer=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.length}
  const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(buffer));if(value.error)throw value.error
  if(!response.ok)throw Object.assign(Error('DeliveryUnavailable'),{code:'DeliveryUnavailable'});return value
 }
 async function connect(){const current=await json('/api/connection',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});bootstrap={...bootstrap,...current}}
 async function mutate(path,value){
  const requestRef=crypto.randomUUID()
  try{return await json(path,{method:'POST',headers:{'content-type':'application/json','x-hatter-csrf':bootstrap.csrf,'x-hatter-request-nonce':requestRef},body:JSON.stringify(value)})}
  catch(error){
   if(error.ownerFailure)throw error
   // Missing/invalid response after handing a command to fetch proves neither
   // rejection nor commit. Preserve the browser nonce for exact investigation;
   // never reconnect and resend a mutation as if it were a passive read.
   const failure={code:'DeliveryOutcomeUncertain',canonical:{state:'Unknown',receiptRef:null},
    ownerFailure:{owner:'hatter/delivery',operation:path,code:'DeliveryOutcomeUncertain',outcomeStage:'OUTCOME_UNCERTAIN',
     uncertain:true,browserInteractionRef:requestRef,receiptRef:null}}
   showError(failure);throw failure
  }
 }
 function disposeLive(){live?.close();live=null}
 function draw(){
  if(closed)return
  refreshConversation()
  const signature=JSON.stringify([runtime.projection?.key,runtime.projection?.revision,runtime.presentation,presentedWorld,bootstrap.speaker])
  if(renderedScene===signature&&content.querySelector('[data-render-key]')){renderer.activity(bootstrap.inference);updateLocation();return}
  renderedScene=signature
  sceneEvents.abort();sceneEvents=new AbortController()
  graph?.close();graph=null
  worldPose=worldSpatial?.snapshot()??worldPose;worldSpatial?.close();worldSpatial=null
  const identity=runtime.projection?JSON.stringify([runtime.projection.key,runtime.projection.revision]):null
  if(identity!==drawnIdentity){form?.close();form=null;controls.replaceChildren();drawnIdentity=identity}
  delete overview.dataset.world;overview.replaceChildren();empty.hidden=true
  content.hidden=garden
  renderer.garden(garden?{host:overview,actors:presentedWorld?.objects??[],activity:bootstrap.inference}:null)
  personInformationTopic.replaceChildren()
  if(runtime.projection){
   const plan=renderPlan(runtime.projection,runtime.presentation)
   renderer.render(plan);headingTitle.textContent=sceneNames.get(input?.key)??runtime.projection.data.purpose;root.dataset.projectionRevision=runtime.projection.revision
   const groups=personInformation(plan,runtime.projection,bootstrap.speaker?.id)
   if(groups.length){
    personInformationTopic.append(element(document,'p','Information in this person’s current view. Choose a record to open its published details.'))
    for(const group of groups){
     const shelf=element(document,'details',null,{'data-person-shelf':group.id}),summary=element(document,'summary',group.label+' · '+group.items.length),list=element(document,'div')
     for(const item of group.items){
      const open=button(item.display?.title??'Information needing review',()=>{
       runtime.present({inspector:item.id,focus:item.id,selectedItems:[item.id]});draw();frame.open('details',item.id)
      },sceneEvents.signal)
      open.dataset.personInformationId=item.id;list.append(open)
      if(item.display?.summary)list.append(element(document,'small',item.display.summary))
     }
     shelf.append(summary,list);personInformationTopic.append(shelf)
    }
   }
  }
  refreshConversation()
  conversation.refresh()
  updateLocation()
 }
 function subscribe(){
  disposeLive()
  if(bootstrap.liveDocument){
   const descriptor=bootstrap.liveDocument,selectedLocation=displayedLocation
   live=new StateSocketClient({url:new URL('/api/projection-live',window.location.href.replace(/^http/,'ws')).href,prepare:connect,
    onStatus:value=>{if(!closed){root.dataset.liveState=value.state;state.textContent='Updates · '+value.state;state.dataset.realtimeState=value.state}},
    onState:value=>{
     if(closed||displayedLocation!==selectedLocation||value.key!==descriptor.key)throw Error('StaleDocumentDelivery')
     if(value.kind==='NoChange')return
     const next=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(value.payload))
     validateDelivery(next.envelope)
     if(next.bootstrap?.liveDocument?.key!==descriptor.key||next.bootstrap.liveDocument.revision!==value.revision)throw Error('StaleDocumentDelivery')
     const preserve=JSON.stringify([bootstrap.actions,bootstrap.navigation])===JSON.stringify([next.bootstrap.actions,next.bootstrap.navigation])
     envelope=next.envelope;bootstrap={...next.bootstrap,csrf:bootstrap.csrf};input=bootstrap.input??null
     shell(preserve)
     if(envelope.snapshot){runtime.adopt(envelope.snapshot,{kind:'current',expectedCurrent:runtime.current(envelope.snapshot.key)?.revision??null});runtime.navigate(envelope.snapshot.key);draw()}
     else{renderer.close();form?.close();form=null;controls.replaceChildren();delete root.dataset.projectionRevision;updateLocation()}
     openRequestedConversation()
    }})
   live.subscribe({key:descriptor.key,locator:descriptor.key,revision:descriptor.revision});live.start();return
  }
  if(!input)return
  const pending=input.revision===null,selectedKey=input.key
  live=new StateSocketClient({url:new URL('/api/projection-live',window.location.href.replace(/^http/,'ws')).href,prepare:connect,
   onStatus:status=>{if(!closed){root.dataset.liveState=status.state;state.dataset.realtimeState=status.state;state.textContent='Updates · '+status.state;if(status.detail)showError(status.detail)}},
   onState:value=>{
    if(closed||input?.key!==selectedKey||value.key!==(input.revision===null?selectedKey:runtime.projection?.key))throw Object.assign(Error('StaleProjectionDelivery'),{code:'StaleProjectionDelivery'})
    if(input.revision===null){
     if(value.kind!=='Snapshot')throw Object.assign(Error('StaleProjectionDelivery'),{code:'StaleProjectionDelivery'})
     const snapshot=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(value.payload))
     if(snapshot.key!==selectedKey||snapshot.revision!==value.revision)throw Object.assign(Error('StaleProjectionDelivery'),{code:'StaleProjectionDelivery'})
     runtime.adopt(snapshot,{kind:'current',expectedCurrent:runtime.current(selectedKey)?.revision??null});runtime.navigate(selectedKey)
     // The site declares which projection-read requirement this exact first
     // snapshot satisfies. Do not infer readiness of any other owner/service.
     const requirements=envelope.readiness.requirements.map(r=>r.ref===input.requirementRef&&r.state==='Unavailable'&&r.setup===null
       ?{...r,state:'Ready',failure:null}:r)
     envelope={...envelope,readiness:readiness(requirements.map(r=>r.ref),requirements)}
     input={key:selectedKey,revision:value.revision};shell();draw();return
    }
    const previous=runtime.projection.revision
    if(value.kind==='NoChange')runtime.input({kind:'NoChange',revision:value.revision},{expectedCurrent:previous})
    else{
     const snapshot=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(value.payload))
     runtime.input({kind:'Snapshot',revision:value.revision,snapshot},{expectedCurrent:previous})
     if(previous!==value.revision){input=input.revision===previous?{...input,revision:value.revision}:{...snapshot.lineage.dataProjection};draw()}
    }
   }})
  live.subscribe({key:pending?selectedKey:runtime.projection.key,locator:selectedKey,revision:pending?null:runtime.projection.revision});live.start()
 }
 function world(){
  if(bootstrap.inspection&&!garden){
   worldSpatial?.close();worldSpatial=null
   worldEvents.abort();delete overview.dataset.world
   if(graph&&graphRole===bootstrap.inspection.selected)graph.update(bootstrap.inspection)
   else{graph?.close();graphRole=bootstrap.inspection.selected;graph=structureGraph(document,overview,bootstrap.inspection,id=>void go('/system/semantic?'+new URLSearchParams({role:id})),()=>load(window.location.href,true))}
   return
  }
  graph?.close();graph=null
  if(garden&&bootstrap.inspection)graph=structureGraph(document,structure,bootstrap.inspection,id=>void go('/system/semantic?'+new URLSearchParams({role:id})),()=>load(displayedLocation,true),{embedded:true})
  const objects=presentedWorld?.objects??[]
  if(objects.length>32)throw Error('DeliveryLimitExceeded')
  const signature=JSON.stringify([displayedLocation,presentedWorld,bootstrap.page?.emptyMessage,Boolean(bootstrap.actions?.length)])
  if(overview.dataset.world===signature){worldSpatial?.activity(bootstrap.inference);return}
  worldPose=worldSpatial?.snapshot()??worldPose;worldSpatial?.close();worldSpatial=null;worldEvents.abort();worldEvents=new AbortController();overview.dataset.world=signature;overview.replaceChildren()
  const space=element(document,'section',null,{class:'world-objects','aria-label':'Your world'})
  for(const [position,object]of objects.entries()){
   const node=button('',()=>selectActor(object.id),worldEvents.signal)
   node.className='world-object';node.dataset.worldObject=object.id;node.dataset.observationLabel=object.preparation?.label??''
   const solid=element(document,'span',null,{class:'object-solid','aria-hidden':'true'});solid.append(symbol(document,object.symbol))
   node.style.setProperty('--position',String(position));node.append(solid,element(document,'strong',object.title),element(document,'span',object.status))
   node.disabled=object.status!=='Available';space.append(node)
  }
  if(objects.length){overview.append(space)}
  else if(root.dataset.worldState==='Current'&&Array.isArray(presentedWorld?.objects)){
   const message=element(document,'div',null,{class:'world-empty-guide'})
   message.append(element(document,'h2',['/','/scenes'].includes(new URL(displayedLocation).pathname)?'No person in this world yet':bootstrap.page?.title??'Hatter'),element(document,'p',bootstrap.page?.emptyMessage??'No person or question has been published yet. Review the current setup state.'),
    button('Review setup state',()=>frame.open('status'),worldEvents.signal),button('Inspect current data',()=>frame.open('information'),worldEvents.signal))
   overview.append(message)
  }
  if(!space.isConnected)overview.append(space)
  const contextInteraction=(item,activate)=>{
   if(item.kind!=='character')return null
   const body=element(document,'section',null,{class:'world-context'}),status=roleInferenceStatus(bootstrap.inference,item.id)
   body.append(element(document,'p',status.label),element(document,'small',status.detail))
   const perspective=presentedWorld?.objects.find(object=>object.id===item.id)?.memoryPerspective
   if(perspective){
    const senses=element(document,'section',null,{'aria-label':'Sensory memory perspective'})
    senses.append(element(document,'small',`${perspective.shortTerm} short-term · ${perspective.longTerm} long-term`))
    for(const channel of perspective.channels)senses.append(element(document,'span',`${channel.symbol} ${channel.count}`,{title:channel.label,'aria-label':`${channel.label}: ${channel.count}`}))
    if(perspective.unclassified)senses.append(element(document,'small',`${perspective.unclassified} not linked to a sense`))
    body.append(senses)
   }
   body.append(button('Open conversation',activate,worldEvents.signal))
   return body
  }
  worldSpatial=spatialView(overview,space,worldCamera,[],worldEvents.signal,worldPose,contextInteraction,{surface:worldSurface,activity:bootstrap.inference,target:garden?'garden':new URL(displayedLocation).pathname,context:garden?displayedLocation:null,pattern:garden?'garden':'ground'})
 }
 async function selectActor(id){
  const object=bootstrap.world?.objects.find(o=>o.id===id)
  if(!object||object.status!=='Available')throw Object.assign(Error('SubjectUnavailable'),{code:'SubjectUnavailable'})
  if(bootstrap.speaker?.id===id){conversation.show('choices');frame.open('actions');return}
  const selectionSequence=++sequence,selected=await mutate('/api/subjects',{roleRef:object.roleRef})
  if(closed||selectionSequence!==sequence)return
  sceneNames.set(selected.key,object.title);if(sceneNames.size>32)sceneNames.delete(sceneNames.keys().next().value)
  await navigate({key:selected.key,current:'true'})
  if(input?.key===selected.key){requestedConversation={id,key:selected.key};openRequestedConversation()}
 }
 function refreshConversation(){
 const role=bootstrap.speaker?.id
  const modelResultRefs=(bootstrap.inference?.roles??[]).filter(work=>work.roleRef?.id===role&&work.kind==='inference'&&work.state==='Completed')
   .map(work=>work.detail?.result_ref).filter(ref=>typeof ref==='string')
  conversation.update({observations:bootstrap.speaker?.observations??[],priority:bootstrap.speaker?.reviewPriority,
   modelResultRefs,inputAction:bootstrap.actions?.find(action=>action.input)?.id??null,
   reviewStatus:role?roleInferenceStatus(bootstrap.inference,role):null})
 }
 function shell(preserveForms=false){
  const observation=observeWorld(displayedLocation,bootstrap.world,envelope.readiness.requirements)
  presentedWorld=observation.world
  root.dataset.worldState=observation.state;observationNote.hidden=observation.state!=='Stale'
  sceneActions.inert=conversationLinks.inert=actionList.inert=observation.state==='Stale'
  if(observation.state==='Stale'){form?.close();form=null;controls.replaceChildren()}
  frame.speaker(bootstrap.speaker??null);renderer.speaker(bootstrap.speaker??null)
  const expandedObservations=new Set([...retainedTopic.querySelectorAll('details[open]')].map(n=>n.dataset.observationRef))
  retainedTopic.replaceChildren()
  const retained=bootstrap.speaker?.observations??[]
  if(!Array.isArray(retained)||retained.length>16)throw Error('DeliveryLimitExceeded')
  const timeline=bootstrap.speaker?.memoryTimeline
  if(timeline){
   if(!Array.isArray(timeline.entries)||timeline.entries.length>256||!Array.isArray(timeline.channels)||timeline.channels.length>16)throw Error('DeliveryLimitExceeded')
   const summary=element(document,'section',null,{'aria-label':'Memory timeline'})
   summary.append(element(document,'h3','Memory timeline'),element(document,'p','Short-term observations and accepted long-term meaning remain distinct. Only explicit source times are used.'))
   const counts=new Map([['short-term',0],['long-term',0]])
   for(const entry of timeline.entries)counts.set(entry.memory,(counts.get(entry.memory)??0)+1)
   summary.append(element(document,'p',`${counts.get('short-term')} short-term · ${counts.get('long-term')} long-term · ${timeline.entries.filter(entry=>entry.at===null).length} without an explicit time`))
   const sensory=element(document,'section',null,{'aria-label':'Human senses'})
   sensory.append(element(document,'h3','Human senses'),element(document,'p',timeline.note))
   for(const channel of timeline.channels)sensory.append(element(document,'p',`${channel.symbol} ${channel.label} · ${channel.entries.length}`))
   if(timeline.unclassifiedCount)sensory.append(element(document,'small',`${timeline.unclassifiedCount} memory entries are not assigned to a sense. Hatter does not guess a sensory source.`))
   const list=element(document,'section',null,{'aria-label':'Memory entries'})
   for(const entry of timeline.entries){
    const attributes={'data-memory-class':entry.memory}
    if(entry.memory==='short-term')attributes['data-observation-ref']=entry.reference
    const record=element(document,'details',null,attributes)
    record.append(element(document,'summary',entry.label??(entry.memory==='long-term'?'Accepted meaning':'Observed information')),
     element(document,'small',`${entry.memory==='short-term'?'Short-term observation':'Accepted long-term context'} · ${entry.at===null?'time not supplied':'source time '+entry.at}`))
    if(entry.predicate)record.append(element(document,'code',entry.predicate))
    if(entry.sourceRefs?.length)record.append(element(document,'p','Sources'),...entry.sourceRefs.map(reference=>element(document,'code',reference)))
    list.append(record)
   }
   retainedTopic.append(summary,sensory,list)
  }
  for(const observation of timeline?[]:retained){
   const entry=element(document,'details',null,{'data-observation-ref':observation.reference}),text=observation.surface
   entry.open=expandedObservations.has(observation.reference)
   entry.append(element(document,'summary',typeof text==='string'?text.slice(0,100):observation.reference))
   if(typeof text==='string')entry.append(element(document,'p',text))
   entry.append(element(document,'small','Retained observation — not an adopted fact'),element(document,'code',observation.input_ref));retainedTopic.append(entry)
  }
  const preparation=observation.state==='Current'?(bootstrap.speaker?.preparation??presentedWorld?.objects.find(p=>p.id===bootstrap.speaker?.id)?.preparation):null
  const inferenceSignature=JSON.stringify([bootstrap.speaker?.id,bootstrap.inference,preparation])
  if(inferenceSignature!==personInferenceSignature){
   const expanded=new Set([...personInference.querySelectorAll('details[open]')].map(n=>n.dataset.inferenceRequest))
   personInferenceSignature=inferenceSignature;personInference.replaceChildren()
   if(bootstrap.speaker){personInference.append(roleInferenceView(document,bootstrap.speaker.id,bootstrap.inference,preparation));for(const item of personInference.querySelectorAll('details'))item.open=expanded.has(item.dataset.inferenceRequest)}
  }
  personInference.hidden=!bootstrap.speaker
  personFailures.replaceChildren()
  // The shared dispatcher belongs to all Roles. Preserve its original owner
  // failure rather than presenting an empty queue or inventing a Role failure.
  for(const failure of [bootstrap.inference?.failure,bootstrap.inference?.cleanupFailure,bootstrap.speaker?.reviewPriorityFailure].filter(Boolean)){
   const entry=element(document,'details',null,{'data-owner-failure':failure.code??'Unavailable'})
   entry.append(element(document,'summary',failure.code??'Unavailable'),valueView(document,failure));personFailures.append(entry)
  }
  personFailures.hidden=!bootstrap.speaker||!personFailures.childNodes.length
  const openedFacts=new Set([...facts.querySelectorAll('[data-information-key]')].filter(n=>n.open).map(n=>n.dataset.informationKey))
  if(bootstrap.liveDocument)root.dataset.documentRevision=bootstrap.liveDocument.revision;else delete root.dataset.documentRevision
  if(!preserveForms){shellEvents.abort();shellEvents=new AbortController()}
  detailEvents.abort();detailEvents=new AbortController()
  conversationLinks.replaceChildren()
  if((bootstrap.speaker?.activities?.length??0)>8)throw Error('DeliveryLimitExceeded')
  if(bootstrap.speaker){const summary=bootstrap.world?.objects?.find(person=>person.id===bootstrap.speaker.id)?.summary;if(summary)conversationLinks.append(element(document,'p',summary))}
  if(bootstrap.speaker?.activities?.length)conversationLinks.append(element(document,'h3','Related views'))
  for(const activity of bootstrap.speaker?.activities??[]){const control=button('Open '+activity.label,async()=>{await navigate({key:activity.key,current:'true'});if(bootstrap.speaker)frame.open('actions')},detailEvents.signal);control.title='Open a saved view for this person';conversationLinks.append(control)}
  if(!preserveForms){siteForm?.close();siteForm=null}
  headingTitle.textContent=bootstrap.page?.title??'Hatter'
  description.textContent=bootstrap.page?.description??''
  information.hidden=!description.textContent
  empty.textContent=bootstrap.page?.emptyMessage??''
  empty.hidden=Boolean(envelope.snapshot)
  empty.setAttribute('role','status')
  for(const [key,maximum]of [['navigation',16],['entries',128],['subjects',32],['actions',64]])if(bootstrap[key]!==undefined&&(!Array.isArray(bootstrap[key])||bootstrap[key].length>maximum))throw Object.assign(Error('DeliveryLimitExceeded'),{code:'DeliveryLimitExceeded'})
  errors.replaceChildren();errors.removeAttribute('role');index.replaceChildren();facts.replaceChildren();if(!preserveForms)actionList.replaceChildren()
  if(!envelope.snapshot&&(bootstrap.navigation?.length??0)>0)world()
  state.textContent='Sources · '+envelope.readiness.state;state.dataset.productReadiness=envelope.readiness.state
  frame.notify(envelope.readiness.requirements.filter(r=>r.state!=='Ready').length)
  for(const requirement of envelope.readiness.requirements)if(requirement.state!=='Ready'){
   // Keep the original typed evidence inspectable without letting nested
   // diagnostics replace the product's navigation and configuration controls.
   const detail=element(document,'details'),summary=element(document,'summary',requirement.failure.code)
   detail.append(summary,valueView(document,requirement.failure));errors.append(detail);errors.setAttribute('role','alert')
   if(requirement.setup)errors.append(button('Set up '+requirement.owner,async()=>{await mutate('/api/setup',{id:requirement.setup.id});await load(displayedLocation,true)},detailEvents.signal))
  }
  for(const entry of bootstrap.entries??[])index.append(button(entry.key,()=>navigate(entry),detailEvents.signal))
  for(const candidate of bootstrap.subjects??[]){const control=button(candidate.subjectRef.id+' · '+candidate.roleRef.id,async()=>{
   const selected=await mutate('/api/subjects',{roleRef:candidate.roleRef});await navigate({key:selected.key,current:'true'})
  },detailEvents.signal);control.disabled=candidate.availability!=='Available';index.append(control)}
  if(bootstrap.data!==undefined){facts.append(element(document,'h2',bootstrap.page?.dataLabel??'State details'));for(const [key,value]of Object.entries(bootstrap.data)){const group=element(document,'details',null,{'data-information-key':key}),body=element(document,'div');group.append(element(document,'summary',key),body);const fill=()=>{if(!body.childNodes.length)try{body.append(valueView(document,value))}catch(error){showError(error)}};group.addEventListener('toggle',()=>{if(group.open)fill()},{signal:detailEvents.signal});facts.append(group);if(facts.children.length===2||openedFacts.has(key)){fill();group.open=true}}}
  updateLocation()
  // Declared operations for a selected actor belong next to that actor's
  // questions, not in the global menu. Reattach even on a STATE-only update.
  if(bootstrap.speaker){conversationLinks.append(element(document,'h3','Declared operations'),actionList)}
  if(preserveForms)return
  settings.replaceChildren()
  // Business destinations and their labels belong to the delivered declarations.
  for(const link of bootstrap.navigation??[]){const url=new URL(link.href,window.location.origin);if(url.origin!==window.location.origin)throw Error('InvalidNavigation');if(url.pathname===new URL(displayedLocation).pathname)continue;settings.append(button(link.label,()=>go(url.pathname+url.search)))}
  const system=element(document,'details')
  viewOptions.replaceChildren(element(document,'h3','View'),button('View and time',()=>frame.open('scene')))
  system.append(element(document,'summary','System and connection'),button('Inspect current data',()=>frame.open('information')),button('Notifications',()=>frame.open('status')),button('Read current state',()=>load(displayedLocation,true)))
  if(!bootstrap.speaker)settings.append(actionList)
  settings.append(viewOptions,system)
  if(!bootstrap.speaker&&envelope.snapshot?.data.actions?.length)settings.append(button('Review this view',()=>frame.open('actions')))
  settings.prepend(button('Controls',()=>frame.open('help')))
  if(!(bootstrap.actions?.length)&&!(envelope.snapshot?.data.actions?.length))actionList.append(element(document,'p','Select an object to see its available operations.'))
  for(const action of bootstrap.actions??[]){const control=button(action.label,async()=>{
   const submit=async values=>{
    const value=await mutate('/api/site-actions',{id:action.id,values})
    const receipt=element(document,'details');receipt.append(element(document,'summary','Operation receipt'),valueView(document,value))
    result.replaceChildren(receipt)
    if(value.assistance?.error){const failure=element(document,'div');failure.setAttribute('role','alert');failure.append(element(document,'p','Your observation was retained, but assistance could not start.'),valueView(document,value.assistance.error));result.prepend(failure)}
    siteForm?.close();siteForm=null;controls.replaceChildren()
    if(!bootstrap.liveDocument)await load(displayedLocation,true)
   }
   if(action.input){form?.close();form=null;siteForm?.close();siteForm=inputForm(document,action.input,submit)
    controls.replaceChildren(element(document,'h2',action.label))
    if(action.description)controls.append(element(document,'p',action.description,{class:'operation-guidance'}))
    if(action.example)controls.append(element(document,'p',action.example,{class:'operation-example'}))
    controls.append(siteForm.form);conversation.show('input');frame.open('actions');return}
   await submit({})
  });control.dataset.siteActionId=action.id;actionList.append(control)}
  refreshConversation()
  conversation.refresh()
 }
 async function load(location,current=false){
  const token=++sequence;requestController?.abort();requestController=new AbortController();root.setAttribute('aria-busy','true');disposeLive()
  try{
   const url=new URL(location,window.location.origin);if(url.origin!==window.location.origin)throw Error('InvalidNavigation')
   const query=new URLSearchParams(url.search);if(current&&query.has('key')){query.delete('revision');query.set('current','true')}
   const value=await json('/api/document?'+new URLSearchParams({path:url.pathname,query:query.toString()}),{signal:requestController.signal})
   if(closed||token!==sequence)return
   const changing=displayedLocation!==url.href
   if(changing)frame.close()
   displayedLocation=url.href
   root.dataset.focusLocation=url.pathname+url.search
   envelope=validateDelivery(value.envelope);bootstrap={...value.bootstrap,csrf:bootstrap.csrf};input=bootstrap.input??null;shell()
   if(envelope.snapshot){runtime.adopt(envelope.snapshot,{kind:'current',expectedCurrent:runtime.current(envelope.snapshot.key)?.revision??null});runtime.navigate(envelope.snapshot.key);draw();subscribe()}
   else{renderer.close();form?.close();form=null;controls.replaceChildren();delete root.dataset.projectionRevision;updateLocation();subscribe()}
   if(changing&&!envelope.snapshot&&envelope.readiness.state!=='Ready')frame.open('status')
   else if(garden&&bootstrap.inspection)frame.open('structure')
   else if(garden&&changing&&!envelope.snapshot&&url.pathname!=='/')frame.open('information')
  }catch(error){if(!closed&&token===sequence&&error.name!=='AbortError')showError(error)}finally{if(!closed&&token===sequence)root.setAttribute('aria-busy','false')}
 }
 async function navigate(query){await go('/scenes?'+new URLSearchParams(query))}
 const renderer=new SceneRenderer(content,async(kind,target)=>{
  try{
   if(kind==='actor'){await selectActor(target);return}
   if(kind==='conversation'){conversation.show('choices');frame.open('actions');return}
   if(kind==='action'){
    const intent=runtime.intent(target),declaration=intent.ownerCommandDescriptor.interaction
    if(!declaration)throw Object.assign(Error('InteractionUnavailable'),{code:'InteractionUnavailable'})
    siteForm?.close();siteForm=null;form?.close();form=inputForm(document,declaration.input,async values=>{
     runtime.intent(target)
     const value=await mutate('/api/interactions',{projectionKey:input.key,projectionRevision:intent.projectionRevision,sceneId:intent.sceneId,actionId:intent.actionId,interactionRef:declaration.ref,generation:declaration.generation,inputContractRef:declaration.inputContractRef,values})
     result.replaceChildren(valueView(document,value))
     if(value.presentation?.href){const url=new URL(value.presentation.href,window.location.origin);if(url.origin!==window.location.origin)throw Error('InvalidNavigation');await go(url)}
    });controls.replaceChildren(element(document,'h2',intent.ownerCommandDescriptor.label),form.form);conversation.show('input');frame.open('actions');return
   }
   if(kind==='resolve'){
    const unresolved=runtime.projection?.data.unresolved.find(item=>item.id===target)
    if(!unresolved)throw Object.assign(Error('SceneUnavailable'),{code:'SceneUnavailable'})
    // No declared action is not a pending action. Display the exact unresolved
    // observation immediately, without waiting or guessing a recovery policy.
    const showUnresolved=()=>{
     const explanation=unresolvedPresentation(unresolved.reason)
     const exact=element(document,'details');exact.append(element(document,'summary','Exact owner reason and references'),valueView(document,unresolved))
     result.replaceChildren(element(document,'h3',explanation.label),element(document,'p',explanation.detail))
     if(!unresolved.actionRefs.length){
      result.append(element(document,'p','No resolution action is declared for this issue. You may provide a separate observation, but it will not automatically adopt a meaning or resolve this issue.'))
      const inputAction=bootstrap.actions?.find(action=>action.input)
      if(inputAction)result.append(button('Add a separate observation',()=>[...actionList.querySelectorAll('button[data-site-action-id]')].find(node=>node.dataset.siteActionId===inputAction.id)?.click(),listeners.signal))
     }
     result.append(exact)
     controls.replaceChildren();conversation.show('input')
     frame.open('actions')
    }
    if(!unresolved.actionRefs.length){showUnresolved();return}
    const response=await json('/api/projections?'+new URLSearchParams({...input,related:target}))
    if(response.entries?.length===1)await navigate(response.entries[0]);else{
     showUnresolved()
     for(const entry of response.entries??[])result.append(button(entry.key,()=>navigate(entry)))
     if(response.error)result.append(valueView(document,response.error))
    }return
   }
   if(kind==='view')runtime.present({viewMode:target})
   else if(kind==='camera'){runtime.present({camera:target});renderer.camera(runtime.presentation.camera);return}
   else if(kind==='time')runtime.present({timeCursor:target||null,focus:target||null})
   else if(kind==='dismiss'){runtime.present({inspector:null});frame.close()}
   else if(kind==='inspect'){runtime.present({inspector:target,focus:target,selectedItems:[target]});frame.open('details',target)}
   else if(kind==='select'){const hadDetails=runtime.presentation.inspector!==null;runtime.present({inspector:null,focus:target,selectedItems:[target]});if(hadDetails&&runtime.presentation.viewMode==='spatial')frame.close(false)}
   else throw Object.assign(Error('InvalidPresentationOperation'),{code:'InvalidPresentationOperation'})
   draw()
  }catch(error){showError(error)}
 },{tools:sceneTools,details,actions:sceneActions,describeUnresolved:unresolvedPresentation},worldSurface)
 shell()
 root.dataset.focusLocation=new URL(displayedLocation).pathname+new URL(displayedLocation).search
 if(!envelope.snapshot&&envelope.readiness.state!=='Ready')frame.open('status')
 if(envelope.snapshot){runtime.adopt(envelope.snapshot,{kind:'hydrate',expected:envelope.initial});root.dataset.initialRevision=envelope.initial.revision;draw();subscribe()}
 else subscribe()
 if(garden&&bootstrap.inspection)frame.open('structure')
 root.setAttribute('aria-busy','false')
 window.addEventListener('popstate',()=>void load(window.location.href),{signal:listeners.signal})
 const close=()=>{if(closed)return;closed=true;++sequence;worldSpatial?.close();graph?.close();listeners.abort();shellEvents.abort();worldEvents.abort();detailEvents.abort();sceneEvents.abort();requests.abort();requestController?.abort();disposeLive();siteForm?.close();form?.close();renderer.dispose();worldSurface.close();runtime.close();frame.dispose()}
 window.addEventListener('pagehide',event=>{if(event.persisted){++sequence;requests.abort();requestController?.abort();disposeLive();siteForm?.close();siteForm=null;form?.close();form=null}else close()},{signal:listeners.signal})
 window.addEventListener('pageshow',event=>{if(event.persisted&&!closed){requests=new AbortController();void load(window.location.href,true)}},{signal:listeners.signal})
 return {close,runtime}
}
