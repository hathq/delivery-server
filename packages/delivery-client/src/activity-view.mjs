// Hatter downstream 2026: one shared Work projection, not an inference-only queue.
// A Running reservation is not evidence that the model is generating tokens.
const labels={Runnable:'Queued',Blocked:'Waiting for input or dependency',Running:'Dispatch reserved',Completed:'Completed',Failed:'Failed',Cancelled:'Cancelled'}
export function roleInferenceStatus(activity,roleId){
 if(!activity?.available)return {state:'Unavailable',label:'Review status unavailable',detail:'The queue could not be read; it is not known to be empty.',work:null}
 const works=(activity.roles??[]).filter(w=>w.kind==='inference'&&w.roleRef?.id===roleId).sort((a,b)=>(a.acceptedSequence??0)-(b.acceptedSequence??0))
 const latest=works.at(-1)??null,find=state=>works.findLast(w=>w.state===state)
 const running=find('Running'),blocked=find('Blocked'),queued=find('Runnable')
 if(running&&activity.driverFailed)return {state:'Uncertain',label:'Review outcome not confirmed',detail:'The dispatcher stopped after reserving this request. Model progress and the final answer are unknown; the original request is not retried automatically.',work:running}
 if(running)return {state:'AwaitingResult',label:'Awaiting review result',detail:'A request has a dispatch reservation. This does not confirm that the model is generating an answer.',work:running}
 if(blocked){const missing=blocked.detail==='InputUnavailable';return {state:missing?'InputNeeded':'Waiting',label:missing?'Waiting for original input':'Waiting for a dependency',detail:(missing?'The same accepted input must be provided again. A new observation is not a replay of this request.':'The accepted request is waiting for its declared prerequisite or capacity.')+(activity.driverFailed?' The shared dispatcher has also stopped.':''),work:blocked}}
 if(queued)return activity.driverFailed?{state:'Paused',label:'Queued review paused',detail:'The shared dispatcher stopped before this accepted request acquired a dispatch reservation.',work:queued}:{state:'Queued',label:'Review queued',detail:'The request is accepted but has not acquired a dispatch reservation.',work:queued}
 if(activity.driverFailed)return {state:'Paused',label:'New reviews paused',detail:'The shared dispatcher stopped. Previous results remain readable, but a new review cannot be assumed to start.',work:latest}
 if(latest?.state==='Failed')return {state:'Failed',label:'Last review failed',detail:'The original failure is available in request details. The saved information remains readable.',work:latest}
 if(latest?.state==='Completed')return {state:'Completed',label:'Last review completed',detail:'A result reference was recorded. The result is not automatically accepted as a fact.',work:latest}
 if(latest?.state==='Cancelled')return {state:'Cancelled',label:'Last review cancelled',detail:'No answer is pending for the last request.',work:latest}
 return {state:'Idle',label:'No review requested',detail:'This person has no accepted local inference request.',work:null}
}
export function activityState(activity,roleId){return roleInferenceStatus(activity,roleId).state}
export function activityLabel(state){return labels[state]??state}
// A read-only projection of exact owner Work references; never a second queue.
export function roleInferenceView(document,roleId,activity,preparation=null){
 const root=document.createElement('section');root.setAttribute('aria-label','This person’s inference');root.dataset.inferenceRole=roleId
 const make=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n}
 const status=roleInferenceStatus(activity,roleId);root.dataset.reviewState=status.state
 root.append(make('h3','Local review'),make('strong',status.label),make('p',status.detail))
 if(status.work){const ref=make('small','Request '+status.work.requestRef);ref.dataset.currentRequest=status.work.requestRef;root.append(ref)}
 if(preparation){
  const context=make('details','');context.append(make('summary','Execution context'),make('strong',preparation.label),make('p',preparation.detail))
  if(!Array.isArray(preparation.facts)||preparation.facts.length>8)throw Error('DeliveryLimitExceeded')
  const observed=make('details',''),fields=make('dl','');observed.append(make('summary','Preparation observations'))
  for(const fact of preparation.facts)fields.append(make('dt',fact.label),make('dd',fact.value===null?'Not observed':String(fact.value)))
  observed.append(fields);context.append(observed);root.append(context)
 }
 if(!activity?.available)return root
 if(!Array.isArray(activity.roles)||activity.roles.length>128)throw Error('DeliveryLimitExceeded')
 const works=activity.roles.filter(work=>work.roleRef.id===roleId).sort((a,b)=>(a.acceptedSequence??0)-(b.acceptedSequence??0))
 const counts=Object.fromEntries(Object.keys(labels).map(state=>[state,works.filter(work=>work.state===state).length]))
 const totals=make('dl','')
 for(const [state,label]of Object.entries(labels)){const count=make('dd',String(counts[state]));count.dataset.roleWorkState=state;totals.append(make('dt',label),count)}
 const technical=make('details','');technical.append(make('summary',`Work requests (${works.length})`),totals);root.append(technical)
 for(const work of works.slice(-8).reverse()){
  const item=make('details',''),fields=make('dl','');item.dataset.inferenceRequest=work.requestRef;item.dataset.inferenceState=work.state
  item.append(make('summary',[work.kind,activityLabel(work.state)].filter(Boolean).join(' · ')))
  const field=(label,value)=>{if(value!==undefined&&value!==null)fields.append(make('dt',label),make('dd',String(value)))}
  field('Request',work.requestRef);field('Target scope',work.scopeRef?.id);field('Scope revision',work.scopeRef?.revision)
  field('Execution kind',work.kind);field('Confirmation',work.execution?.confirmationRef?.id)
  field('Role revision',work.roleRef.revision);field('Source receipt',work.sourceReceiptRef);field('Runtime',work.runtimeRef);field('Process',work.processRef)
  field('Admission order',work.acceptedSequence);field('Input available',work.inputAvailable);field('Prerequisite',work.prerequisite)
  if(work.state==='Blocked'){
   const reason=work.detail;field('Waiting for',typeof reason==='string'?({Capacity:'Execution capacity',InputUnavailable:'The same accepted input must be provided again'}[reason]??reason):reason?.Dependency?'Prerequisite completion':null)
   field('Dependency request',reason?.Dependency?.request_ref)
  }else if(work.state==='Running')field('Cancellation requested',work.detail?.cancel_requested)
  else if(work.state==='Completed')field('Result reference',work.detail?.result_ref)
  else if(work.state==='Failed'){field('Failure owner',work.detail?.source?.owner);field('Failure reason',work.detail?.source?.code)}
  item.append(fields);root.append(item)
 }
 if(works.length>8)technical.append(make('p',`${works.length-8} older requests are omitted from this compact view.`))
 technical.append(make('p','Dispatch reservation is not proof of model execution. Admission order is not an estimated start time.'))
 return root
}
export function activityView(document,host){
 const panel=document.createElement('details'),title=document.createElement('summary'),body=document.createElement('div')
 panel.className='world-engine';panel.setAttribute('aria-label','Shared work activity');panel.append(title,body);host.append(panel)
 let signature=null
 return {update(activity){
  const key=JSON.stringify(activity??null);if(signature===key)return;signature=key
  body.replaceChildren();panel.dataset.active='false'
  if(!activity?.available){title.textContent='Shared work · status unavailable';return}
  if(!Array.isArray(activity.roles)||activity.roles.length>128)throw Error('DeliveryLimitExceeded')
  const counts=activity.counts
  const state=activity.driverFailed?(counts.Running?`${counts.Running} outcome unconfirmed`:'Dispatcher stopped'):counts.Running?`${counts.Running} awaiting outcome`:counts.Blocked?'Waiting for input or dependency':counts.Runnable?'Queued':'No pending requests'
  title.textContent='Shared work · '+state;panel.dataset.active=String(counts.Running>0&&!activity.driverFailed)
  const list=document.createElement('dl')
  for(const [id,label]of Object.entries(labels)){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=String(counts[id]);dd.dataset.workState=id;list.append(dt,dd)}
  const phase=document.createElement('p');phase.textContent='Dispatcher: '+activity.driverPhase
  const note=document.createElement('p');note.textContent='Dispatch reservation is not proof of model execution. Token progress and model residency are not observed here.'
  body.append(list,phase,note)
 },panel}
}
