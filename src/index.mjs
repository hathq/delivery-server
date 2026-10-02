// Hatter-owned delivery only. Crowsi owns framing/session/ACK/recovery mechanisms.
import http from 'node:http'
import {createHash,timingSafeEqual,randomUUID} from 'node:crypto'
import {WebSocketServer} from 'ws'
import {StateSocketServer} from '@crowsi/transport-foundation/state-socket'
import {Budget,limitsFor} from '@crowsi/transport-foundation'
import {SessionAuthority} from '@crowsi/browser-security/access'
import {parseOwnerOrigin,assessRequestBoundary} from '@crowsi/browser-security/boundary'
import {validateDelivery,bounds,requirement} from '@hathq/delivery-contracts'

const fail=code=>{throw Object.assign(Error(code),{code})}
const cookieName='hatter_delivery_session'
const headers={
 'content-security-policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'",
 'referrer-policy':'no-referrer','x-content-type-options':'nosniff','x-frame-options':'DENY',
 'permissions-policy':'camera=(), microphone=(), geolocation=(), payment=()','cache-control':'no-store'
}
const encode=(value,maximum=bounds.documentBytes)=>{
 // Site/owner outputs are already bounded data. Refuse expansion before sending.
 let nodes=0,total=0
 const add=bytes=>{total+=bytes;if(total>maximum)fail('DeliveryLimitExceeded')}
 function check(v,depth){
  if(++nodes>32768||depth>20)fail('DeliveryLimitExceeded')
  if(typeof v==='string'){if(v.length>maximum)fail('DeliveryLimitExceeded');add(Buffer.byteLength(v)+2);return}
  if(v===null||typeof v==='boolean'){add(5);return}
  if(typeof v==='number'&&Number.isFinite(v)){add(24);return}
  if(!v||typeof v!=='object'||!Array.isArray(v)&&Object.getPrototypeOf(v)!==Object.prototype)fail('InvalidDeliveryData')
  const keys=Object.keys(v);if(keys.length>4096)fail('DeliveryLimitExceeded');add(keys.length+2)
  for(const key of keys){const d=Object.getOwnPropertyDescriptor(v,key);if(d.get||d.set||key==='toJSON')fail('InvalidDeliveryData');add(Buffer.byteLength(key)+3);check(d.value,depth+1)}
 }
 check(value,0);const bytes=Buffer.from(JSON.stringify(value));if(bytes.length>maximum)fail('DeliveryLimitExceeded');return bytes
}
async function body(request,signal){
 const h=request.headers,raw=h['content-length']
 if(h['content-encoding']||h['transfer-encoding']||!/^application\/json(?:\s*;.*)?$/i.test(h['content-type']??'')||!(/^[1-9][0-9]{0,5}$/).test(raw??''))fail('InvalidInput')
 const size=Number(raw);if(size>bounds.requestBytes)fail('DeliveryLimitExceeded')
 const data=Buffer.alloc(size);let used=0
 for await(const chunk of request){if(signal.aborted)fail('DeliveryCancelled');if(used+chunk.length>size)fail('DeliveryLimitExceeded');chunk.copy(data,used);used+=chunk.length}
 if(used!==size)fail('InvalidInput')
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data))}catch{fail('InvalidInput')}
}
function sessionId(request){
 const cookie=request.headers.cookie??'';if(cookie.length>8192)fail('SessionRejected')
 const values=cookie.split(';').map(s=>s.trim()).filter(s=>s.startsWith(cookieName+'='))
 if(values.length!==1)fail('SessionRejected');return values[0].slice(cookieName.length+1)
}
// Crowsi's access contract currently uses closed Error messages, not .code.
// Recognize only those published constants; never expose arbitrary exception text.
const accessCodes=new Set(['host-rejected','origin-rejected','origin-required','fetch-site-rejected','session-capacity-reached','session-rejected','session-expired','csrf-rejected',
 'request-nonce-invalid','request-replayed','request-nonce-capacity-reached'].map(c=>'crowsi-browser-security-'+c))
const deliveryCodes=new Set(['SessionRejected','InvalidInput','DeliveryLimitExceeded','DeliveryCancelled','DeliveryTimedOut','InvalidDeliveryData',
 'InvalidAsset','NotFound','MethodNotAllowed','ProjectionCancelled','ProjectionRuntimeClosed','ProjectionQueueFull',
 'ProjectionStoreBusy','ProjectionStoreCorrupt','SourceUnavailable','SourceNotRetained','SourceRevisionMismatch',
 'ProjectionUnavailable','ProjectionLimitExceeded','ProjectionExecutionTimeout','StaleSceneAction','SceneUnavailable',
 'InteractionUnavailable','InvalidProjection','OriginRequired','SocketUnavailable'])
function sourceFailure(error,operation,observation){
 const access=accessCodes.has(error?.message),typed=error?.failure
 let original
 try{original=requirement({ref:typed.requirementRef,owner:typed.owner,state:'Unavailable',failure:typed,setup:null}).failure}catch{}
 const code=original?.code??(access?error.message:deliveryCodes.has(error?.code)?error.code:
  typeof typed?.code==='string'&&/^[a-z][a-z0-9-]{2,95}$/.test(typed.code)?typed.code:'UnhandledDeliveryFault')
 return {code,canonical:{state:observation.receiptRef?'Committed':['DELIVERY_REJECTED','NOT_DISPATCHED'].includes(observation.stage)?'NotDispatched':observation.stage==='OWNER_REJECTED'?'Rejected':'Unknown',receiptRef:observation.receiptRef},ownerFailure:{owner:original?.owner??(access?'crowsi/browser-security':observation.owner),operation:original?.operation??observation.operation??operation,
  code,requirementRef:original?.requirementRef??'delivery:server',outcomeStage:observation.stage,uncertain:observation.stage==='OUTCOME_UNCERTAIN',
  requestRef:observation.requestRef,managementRequestRef:observation.managementRequestRef??null,receiptRef:observation.receiptRef,detail:original?.detail??null}}
}
function safeDocument(envelope,bootstrap){
 const serialized=encode({envelope,bootstrap}).toString().replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026')
 const styles=envelope.assets.filter(a=>a.kind==='style').map(a=>`<link rel="stylesheet" href="${a.path}">`).join('')
 const scripts=envelope.assets.filter(a=>a.kind==='script').map(a=>`<script type="module" src="${a.path}"></script>`).join('')
 return Buffer.from(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hatter</title>${styles}</head><body><main id="app" aria-busy="true"><p role="status">Loading exact state…</p></main><script id="delivery-state" type="application/json">${serialized}</script>${scripts}</body></html>`)
}
export function createDeliveryServer({origin,site,assets,readinessToken=null,onFailure=null,onOutcome=null}){
 const boundary=parseOwnerOrigin(origin),authority=new SessionAuthority(),inflight=new Set(),controllers=new Set()
 const budget=new Budget(limitsFor(bounds.documentBytes,{pendingMessages:bounds.requests})),assetMap=new Map()
 for(const asset of assets){
  const {bytes,...descriptor}=asset,content=Buffer.from(bytes)
  if(content.length!==descriptor.bytesLength||content.length>bounds.assetBytes)fail('InvalidAsset')
  const digest=createHash('sha256').update(content).digest('hex')
  if(digest!==descriptor.digest||assetMap.has(descriptor.path)||!/^\/assets\/[a-zA-Z0-9._-]{1,100}$/.test(descriptor.path)||!['script','style'].includes(descriptor.kind))fail('InvalidAsset')
  assetMap.set(descriptor.path,{content,descriptor:{path:descriptor.path,digest,bytes:content.length,kind:descriptor.kind}})
 }
 if(assetMap.size<1||assetMap.size>bounds.assets)fail('InvalidAsset')
 let closing=false,closePromise=null
 const authorize=request=>{
  const reason=assessRequestBoundary(boundary,{method:request.method,host:request.headers.host,origin:request.headers.origin,fetchSite:request.headers['sec-fetch-site']})
  if(reason)fail(reason)
 }
 const authenticate=request=>{const id=sessionId(request);authority.authenticate(id);return id}
 const connection=(request,response)=>{
  let current
  try{const id=authenticate(request);current={sessionId:id,...authority.authenticate(id)}}catch{current=authority.issue()}
  response.setHeader('set-cookie',`${cookieName}=${current.sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${boundary.protocol==='https:'?'; Secure':''}`)
  return {csrf:current.csrfToken,expiresAtUnixMs:current.expiresAt}
 }
 const hub=new StateSocketServer({authorize:peer=>{authorize(peer.request);if(peer.request.headers.origin!==origin)fail('OriginRequired');return authenticate(peer.request)},read:request=>site.live(request)})
 const sockets=new WebSocketServer({noServer:true,maxPayload:1048578,perMessageDeflate:false,clientTracking:true})
 const send=(response,status,value)=>{const bytes=encode(value);response.writeHead(status,{'content-type':'application/json; charset=utf-8','content-length':bytes.length});response.end(bytes)}
 async function handle(request,response,signal,observation){
  for(const [key,value]of Object.entries(headers))response.setHeader(key,value)
  authorize(request)
  if(request.url.length>4096)fail('InvalidInput')
  const url=new URL(request.url,origin),pathname=url.pathname
  if(request.method==='GET'&&pathname==='/api/ready'){
   const provided=Buffer.from(String(request.headers['x-hatter-readiness']??'')),expected=Buffer.from(readinessToken??'')
   if(!expected.length||provided.length!==expected.length||!timingSafeEqual(provided,expected))return send(response,404,{error:{code:'NotFound'}})
   observation.stage='NOT_DISPATCHED';response.writeHead(204);response.end();return // liveness only, never ProductReady
  }
  if(request.method==='GET'&&assetMap.has(pathname)){
   observation.stage='NOT_DISPATCHED'
   const asset=assetMap.get(pathname);response.writeHead(200,{'content-type':asset.descriptor.kind==='script'?'text/javascript; charset=utf-8':'text/css; charset=utf-8','content-length':asset.content.length});response.end(asset.content);return
  }
  if(request.method==='POST'&&pathname==='/api/connection'){
   const value=await body(request,signal);if(!value||Array.isArray(value)||Object.keys(value).length)fail('InvalidInput')
   observation.stage='NOT_DISPATCHED';send(response,200,connection(request,response));return
  }
  if(request.method==='GET'&&!pathname.startsWith('/api/')){
   observation.stage='NOT_DISPATCHED'
   const csrf=connection(request,response)
   const {envelope,bootstrap}=await site.document(url,{signal,assets:[...assetMap.values()].map(a=>a.descriptor)})
   validateDelivery(envelope)
   if(JSON.stringify(envelope.assets)!==JSON.stringify([...assetMap.values()].map(a=>a.descriptor)))fail('InvalidAsset')
   const document=safeDocument(envelope,{...bootstrap,...csrf})
   if(document.length>bounds.documentBytes)fail('DeliveryLimitExceeded')
   response.writeHead(200,{'content-type':'text/html; charset=utf-8','content-length':document.length});response.end(document);return
  }
  authenticate(request)
  if(request.method==='GET'){observation.stage='NOT_DISPATCHED';send(response,200,await site.read(url,{signal}));return}
  if(request.method!=='POST')return send(response,405,{error:{code:'MethodNotAllowed'}})
  authority.authorizeMutation(sessionId(request),request.headers['x-hatter-csrf'],request.headers['x-hatter-request-nonce'])
  const value=await body(request,signal)
  observation.stage='OUTCOME_UNCERTAIN'
  // The site was entered, not proof of physical dispatch or canonical commit.
  // Only exact owner evidence may refine this transient observation.
  const observe=value=>{
   // Trusted site supplies evidence only. Ignore malformed observations; never
   // change execution branching, mint identity, or persist a competing receipt.
   if(!value||!['NOT_DISPATCHED','OWNER_REJECTED','OUTCOME_UNCERTAIN','OWNER_COMMITTED','PUBLICATION_FAILED_AFTER_COMMIT'].includes(value.stage))return
   if(typeof value.owner!=='string'||!['hatter/control','hatter/semantic','hatter/catalog','hatter/models','hatter/projection','hatter/world'].includes(value.owner))return
   if(typeof value.operation!=='string'||!/^[a-z][a-z0-9]*(?:\/[a-z][a-zA-Z0-9]*)+$/.test(value.operation))return
   if(value.receiptRef!==undefined&&value.receiptRef!==null&&!/^[a-f0-9]{64}$/.test(value.receiptRef))return
   if(['OWNER_COMMITTED','PUBLICATION_FAILED_AFTER_COMMIT'].includes(value.stage)&&!value.receiptRef)return
   if(observation.receiptRef&&value.receiptRef!==observation.receiptRef)return
   if(value.managementRequestRef!==undefined&&value.managementRequestRef!==null&&(!Number.isSafeInteger(value.managementRequestRef)||value.managementRequestRef<1))return
   Object.assign(observation,{stage:value.stage,owner:value.owner,operation:value.operation,receiptRef:value.receiptRef??null})
   if(value.managementRequestRef!==undefined)observation.managementRequestRef=value.managementRequestRef
  }
  const result=await site.command(url,value,{signal,observe,requestRef:observation.requestRef})
  const receipt=result?.canonical?.receiptRef
  if(typeof receipt==='string'&&/^[a-f0-9]{64}$/.test(receipt)){
   observation.receiptRef=receipt;observation.stage=result.projection?.state==='FailedTyped'?'PUBLICATION_FAILED_AFTER_COMMIT':'OWNER_COMMITTED'
  }
  if(!response.writableEnded&&!response.destroyed)send(response,200,result)
 }
 const server=http.createServer({maxHeaderSize:16384,headersTimeout:5000,requestTimeout:5000,keepAliveTimeout:2000},(request,response)=>{
  if(closing){response.writeHead(503);response.end();return}
  let release;try{release=budget.reserve(0)}catch{send(response,503,{error:{code:'DeliveryQueueFull'}});return}
  const controller=new AbortController();controllers.add(controller)
  const abort=()=>controller.abort();response.once('close',abort)
  const observation={requestRef:randomUUID(),owner:'hatter/delivery',stage:'DELIVERY_REJECTED',receiptRef:null}
  // Paths and query strings are caller input, not safe diagnostic labels.
  const path=request.url?.split('?')[0],operation=['/api/subjects','/api/interactions','/api/site-actions','/api/setup','/api/connection','/api/document'].includes(path)?path:'delivery/request'
  const recordFailure=error=>{
   const failure=sourceFailure(error,operation,observation)
   try{onFailure?.(failure)}catch{}
   return failure
  }
  // Preserve the finite HTTP observer deadline, but send a truthful outcome
  // rather than resetting a reused socket (browsers may retransmit that POST).
  // This does not cancel an accepted owner action or renew its execution budget.
  const timer=setTimeout(()=>{
   if(!response.writableEnded&&!response.destroyed){
    const failure=recordFailure(Object.assign(Error('DeliveryTimedOut'),{code:'DeliveryTimedOut'}))
    send(response,504,{error:failure})
   }
   controller.abort()
  },bounds.bodyMs)
  const work=handle(request,response,controller.signal,observation).catch(error=>{
   const failure=recordFailure(error)
   // Read-only diagnostic callback: no inherited preload, payload, credentials or
   // stack. A diagnostic consumer cannot alter the execution branch by throwing.
   if(!response.headersSent&&!response.destroyed)send(response,400,{error:failure})
   else if(!response.writableEnded&&!response.destroyed)response.destroy()
  }).finally(()=>{
   try{onOutcome?.({...observation,operation:observation.operation??operation,httpStatus:response.headersSent?response.statusCode:null})}catch{}
   clearTimeout(timer);response.off('close',abort);release();controllers.delete(controller);inflight.delete(work)
  });inflight.add(work)
 })
 server.maxConnections=32;server.maxRequestsPerSocket=128
 server.on('upgrade',(request,socket,head)=>{
  try{if(closing||request.url!=='/api/projection-live'||hub.inspect().connections>=8)fail('SocketUnavailable');authorize(request);authenticate(request);if(request.headers.origin!==origin)fail('OriginRequired')}
  catch{socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');return}
  sockets.handleUpgrade(request,socket,head,websocket=>{
   const peer={request,websocket,close:(code,reason)=>websocket.close(code,reason)}
   websocket.on('message',data=>hub.message(peer,data));websocket.on('close',()=>hub.disconnect(peer));websocket.on('error',()=>hub.disconnect(peer));hub.open(peer)
  })
 })
 return {server,notify:()=>hub.notify(),inspect:()=>({alive:server.listening,activeRequests:inflight.size,transport:hub.inspect()}),
  async listen(){await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(Number(boundary.port),'127.0.0.1',resolve)})},
  close(){
   if(closePromise)return closePromise
   closing=true
   // Closing delivery revokes intake and releases transport, not physical work.
   // Let the owning site close its resources BEFORE awaiting its pending calls:
   // their completion may depend on that close. Join one lifecycle promise even
   // for concurrent close callers, and preserve an owner cleanup failure.
   closePromise=Promise.resolve().then(async()=>{
    for(const c of controllers)c.abort()
    hub.close();for(const ws of sockets.clients)ws.terminate()
    const transportClosed=new Promise(resolve=>sockets.close(resolve))
    const httpClosed=new Promise(resolve=>server.close(resolve))
    server.closeIdleConnections();server.closeAllConnections()
    const ownerClosed=Promise.resolve().then(()=>site.close?.())
    const results=await Promise.allSettled([transportClosed,httpClosed,ownerClosed,...inflight])
    const failures=results.filter(result=>result.status==='rejected').map(result=>result.reason)
    if(failures.length)throw new AggregateError(failures,'Delivery shutdown failed')
   })
   return closePromise
  }}
}
