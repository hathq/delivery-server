// Hatter delivery contracts: no framework, business policy, transport or renderer.
import {canonical,shape,text,copy,frozen} from '@hathq/projection-contracts/client'
import {validateSnapshot} from '@hathq/projection-contracts/client'
import {validateInputValues} from '@zixcel/interaction/input'
export const bounds=Object.freeze({documentBytes:1048576,assets:8,assetBytes:1048576,requirements:16,requestBytes:32768,requests:16,bodyMs:5000})
export class DeliveryError extends Error {constructor(code){super(code);this.code=code}}
const fail=code=>{throw new DeliveryError(code)}
const list=(v,maximum)=>{if(!Array.isArray(v)||v.length>maximum)fail('DeliveryLimitExceeded');return v}
export function validateSubmission(v){
 const fields=['projectionKey','projectionRevision','sceneId','actionId','interactionRef','generation','inputContractRef','values']
 if(!v||Object.getPrototypeOf(v)!==Object.prototype||Object.keys(v).length!==fields.length||fields.some(k=>!Object.hasOwn(v,k)))fail('InvalidInput')
 for(const k of fields.filter(k=>k!=='values'))if(typeof v[k]!=='string'||!v[k]||v[k].length>512)fail('InvalidInput')
 if(!v.values||Object.getPrototypeOf(v.values)!==Object.prototype||Object.keys(v.values).length>32||Object.values(v.values).some(x=>!['string','boolean','number'].includes(typeof x)||typeof x==='number'&&!Number.isFinite(x)))fail('InvalidInput')
 canonical(v,bounds.requestBytes);return v
}
export function inputAction(snapshot,submission){
 validateSubmission(submission);validateSnapshot(snapshot)
 if(snapshot.kind!=='Scene'||snapshot.key!==submission.sceneId||snapshot.revision!==submission.projectionRevision)fail('StaleSceneAction')
 const action=snapshot.data.actions.find(a=>a.id===submission.actionId),binding=action?.interaction
 if(!binding)fail('InteractionUnavailable')
 if(binding.ref!==submission.interactionRef||binding.generation!==submission.generation||binding.inputContractRef!==submission.inputContractRef)fail('StaleSceneAction')
 if(validateInputValues(binding.input,submission.values).length)fail('InvalidInput')
 return action
}
export function requirement(v){
 shape(v,['ref','owner','state','failure','setup']);text(v.ref);text(v.owner)
 if(!['Ready','SetupRequired','Unavailable'].includes(v.state))fail('InvalidReadiness')
 if(v.state==='Ready'){if(v.failure!==null||v.setup!==null)fail('InvalidReadiness')}
 else{
  shape(v.failure,['owner','operation','code','requirementRef','detail'])
  for(const k of ['owner','operation','code','requirementRef'])text(v.failure[k])
  if(v.failure.owner!==v.owner||v.failure.requirementRef!==v.ref)fail('InvalidReadiness')
  canonical(v.failure.detail,32768)
  if(v.setup!==null){shape(v.setup,['id','owner','operation']);for(const x of Object.values(v.setup))text(x)}
 }
 return frozen(copy(v))
}
export function readiness(refs,owners){
 list(refs,bounds.requirements);list(owners,bounds.requirements)
 const inventory=owners.map(requirement)
 if(new Set(refs).size!==refs.length||new Set(inventory.map(v=>v.ref)).size!==inventory.length)fail('InvalidReadiness')
 const required=refs.map(ref=>{text(ref);const found=inventory.find(v=>v.ref===ref);if(!found)fail('UndeclaredRequirement');return found})
 return frozen({state:required.some(v=>v.state==='Unavailable')?'Unavailable':required.some(v=>v.state==='SetupRequired')?'SetupRequired':'Ready',requirements:required})
}
export function validateDelivery(v){
 canonical(v,bounds.documentBytes);shape(v,['contract','site','initial','snapshot','readiness','assets','transport'])
 if(v.contract!=='hatter/delivery/1')fail('InvalidDelivery')
 shape(v.site,['id','revision']);text(v.site.id);text(v.site.revision)
 if(!/^[a-f0-9]{64}$/.test(v.site.revision))fail('InvalidDelivery')
 if(v.snapshot===null){if(v.initial!==null)fail('InitialSnapshotMismatch')}
 else{
  validateSnapshot(v.snapshot)
  if(v.snapshot.kind!=='Scene'||canonical(v.initial)!==canonical({key:v.snapshot.key,revision:v.snapshot.revision,lineage:v.snapshot.lineage}))fail('InitialSnapshotMismatch')
 }
 shape(v.readiness,['state','requirements'])
 if(canonical(readiness(v.readiness.requirements.map(r=>r.ref),v.readiness.requirements))!==canonical(v.readiness))fail('InvalidReadiness')
 list(v.assets,bounds.assets)
 if(new Set(v.assets.map(a=>a.path)).size!==v.assets.length)fail('InvalidAsset')
 for(const a of v.assets){
  shape(a,['path','digest','bytes','kind'])
  if(!/^\/assets\/[a-zA-Z0-9._-]{1,100}$/.test(a.path)||!['script','style'].includes(a.kind)
   ||!Number.isSafeInteger(a.bytes)||a.bytes<1||a.bytes>bounds.assetBytes||!/^[a-f0-9]{64}$/.test(a.digest))fail('InvalidAsset')
 }
 if(canonical(v.transport)!==canonical({path:'/api/projection-live',classes:['STATE']}))fail('InvalidDelivery')
 return frozen(copy(v))
}
