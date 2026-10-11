// Presentation only: disclose one person topic at a time, never derive actions.
import {element} from '@hathq/dom-renderer'
export function conversationDeck(document,{operations,feedback,processing,input,observations,information}){
 const root=element(document,'section',null,{class:'conversation-deck'}),choices=element(document,'div',null,{class:'conversation-choices'})
 const back=element(document,'button','←',{type:'button',class:'conversation-back','aria-label':'Back to conversation',title:'Back to conversation'})
 const sections=new Map([['choices',choices],['information',information],['feedback',feedback],['processing',processing],['input',input],['observations',observations]])
 const lead=element(document,'section',null,{class:'conversation-lead','aria-label':'Information to review'})
 const indicator=element(document,'small'),title=element(document,'h3'),surface=element(document,'p'),source=element(document,'small'),progress=element(document,'p',null,{class:'conversation-status'})
 const provenance=element(document,'details'),provenanceReference=element(document,'code')
 provenance.append(element(document,'summary','Source reference'),provenanceReference)
 const controls=element(document,'nav',null,{'aria-label':'Review pages'}),previous=element(document,'button','← Previous',{type:'button'}),position=element(document,'span'),next=element(document,'button','Next →',{type:'button'})
 const move=element(document,'button','Review information',{type:'button',class:'conversation-primary'})
 controls.append(previous,position,next);lead.append(indicator,title,surface,source,progress,provenance,controls,move)
 const button=(label,id)=>{const node=element(document,'button',label,{type:'button'});node.addEventListener('click',()=>show(id));choices.append(node);return node}
 const prompts=element(document,'section',null,{class:'conversation-prompts','aria-label':'Current questions and confirmations'}),promptList=element(document,'div')
 prompts.append(element(document,'h3','Needs your attention'),promptList);choices.append(prompts,lead)
 const informationButton=button('Information about this person','information'),statusButton=button('Review status','processing'),memory=button('Memory and senses','observations')
 const related=element(document,'details',null,{class:'conversation-related'});related.append(element(document,'summary','About this person and other options'),operations);choices.append(related)
 let records=[],cursor=null,mode='source',canReview=false,inputActionId=null,status=null
 function page(){
  const index=Math.max(0,records.findIndex(item=>item.reference===cursor)),item=records[index]
  indicator.textContent=item?(mode==='proposed'?'Suggested review order':'Information received · newest first'):'Get started'
  title.textContent=item?'Review this information':inputActionId?'Tell this person what you noticed':'No information has been received'
  surface.textContent=item?item.surface:inputActionId?'Share one concrete observation. It will be available here for review, not automatically added as a confirmed fact.':'Select an available operation or inspect this person’s current state.'
  source.textContent=item?'Saved observation · not yet a confirmed fact':''
  progress.textContent=status?`Local review: ${status.label}. ${status.detail}`:'Local review status is not available.'
  progress.dataset.reviewState=status?.state??'Unavailable'
  provenance.hidden=!item;provenanceReference.textContent=item?.input_ref??''
  position.textContent=item?`${index+1} / ${records.length}`:''
  controls.hidden=records.length<2;previous.disabled=index===0;next.disabled=index>=records.length-1
  move.hidden=!canReview&&!inputActionId;move.textContent=inputActionId?'Share an observation':'Why this needs review'
  lead.dataset.order=mode;lead.dataset.reference=item?.reference??''
 }
 previous.addEventListener('click',()=>{cursor=records[Math.max(0,records.findIndex(item=>item.reference===cursor)-1)]?.reference??null;page()})
 next.addEventListener('click',()=>{cursor=records[Math.min(records.length-1,records.findIndex(item=>item.reference===cursor)+1)]?.reference??null;page()})
 move.addEventListener('click',()=>{
  if(inputActionId){const declared=[...operations.querySelectorAll('button[data-site-action-id]')].find(button=>button.dataset.siteActionId===inputActionId);declared?.click();return}
  if(canReview)show('feedback')
 })
 back.addEventListener('click',()=>show('choices'));root.append(back,...sections.values())
 function show(id){for(const [key,node]of sections)node.hidden=key!==id;back.hidden=id==='choices';root.dataset.topic=id}
 show('choices')
 return {root,show,update({observations:entries=[],priority=null,modelResultRefs=[],inputAction=null,reviewStatus=null}={}){
  const results=new Set(modelResultRefs),sourceRecords=entries.filter(item=>!results.has(item.input_ref)&&typeof item.reference==='string'&&typeof item.surface==='string')
  const refs=new Map(sourceRecords.map(item=>[item.reference,item]))
  const suggested=priority?.state==='Proposed'&&Array.isArray(priority.order)&&priority.order.length>0&&priority.order.every(ref=>refs.has(ref))
  records=suggested?[...priority.order.map(ref=>refs.get(ref)),...sourceRecords.filter(item=>!priority.order.includes(item.reference))]:sourceRecords
  mode=suggested?'proposed':'source';canReview=Boolean(feedback.querySelector('button'));inputActionId=inputAction;status=reviewStatus
  if(!records.some(item=>item.reference===cursor))cursor=records[0]?.reference??null
  page()
 },refresh(){
  const declared=[...feedback.querySelectorAll('button[data-kind]')].filter(control=>!control.disabled)
  promptList.replaceChildren()
  for(const control of declared.slice(0,3)){
   const prompt=element(document,'button',control.textContent,{type:'button'})
   prompt.addEventListener('click',()=>control.click());promptList.append(prompt)
  }
  if(declared.length>3){const more=element(document,'button',`See all ${declared.length} items`,{type:'button'});more.addEventListener('click',()=>show('feedback'));promptList.append(more)}
  prompts.hidden=!declared.length;informationButton.hidden=!information.childNodes.length;memory.hidden=!observations.childNodes.length;statusButton.hidden=false;related.hidden=!operations.childNodes.length;if(!feedback.querySelector('button')&&root.dataset.topic==='feedback')show('choices');if(!information.childNodes.length&&root.dataset.topic==='information')show('choices')
 }}
}
