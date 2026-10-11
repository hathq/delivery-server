// Bounded presentation memory, not an owner cache or operation authority.
// Only named transport availability failures may retain disabled last observations.
export function worldObservation(){
 let scope=null,previous=null
 return (location,world,requirements)=>{
  if(scope!==location){scope=location;previous=null}
  if(Array.isArray(world?.objects)){
   if(world.objects.length>32)throw Error('DeliveryLimitExceeded')
   previous=world
   return {state:'Current',world}
  }
  const failure=requirements.find(r=>r.ref==='hatter:worldLabels')?.failure
  const detail=failure?.detail,transport=detail?.parameters?.transport
  const temporary=failure?.code==='management-transport-failed'&&['availability','limit'].includes(detail?.class)
   &&['Backpressure','Timeout','ConnectionClosed','ConnectionFailed'].includes(transport)
  if(temporary&&previous)return {state:'Stale',world:{...previous,objects:previous.objects.map(o=>({...o,status:'SourceUnavailable',activities:[]}))}}
  previous=null
  return {state:'Unavailable',world:null}
 }
}
