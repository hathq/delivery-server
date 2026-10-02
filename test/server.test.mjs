import test from 'node:test'
import assert from 'node:assert/strict'
import net from 'node:net'
import {createHash,randomUUID} from 'node:crypto'
import {createDeliveryServer} from '../src/index.mjs'
import {setTimeout as delay} from 'node:timers/promises'
const script=Buffer.from('document.documentElement.dataset.delivery="trusted"')
test('observer timeout sends an explicit uncertain response and retains late original commit evidence without resend', {timeout:8000},async()=>{
 const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r))
 const origin=`http://localhost:${port}`,receiptRef='d'.repeat(64),failures=[],outcomes=[]
 let finish,calls=0,effects=0,observedRequest
 const held=new Promise(r=>finish=r)
 const server=createDeliveryServer({origin,assets:[{path:'/assets/client.js',bytes:script,bytesLength:script.length,kind:'script',digest:createHash('sha256').update(script).digest('hex')}],
  onFailure:value=>failures.push(value),onOutcome:value=>outcomes.push(value),site:{
   async command(_url,_value,{requestRef}){observedRequest=requestRef;calls++;await held;effects++;return {canonical:{state:'Accepted',receiptRef}}},close:()=>finish()}})
 await server.listen()
 try{
  const connection=await fetch(origin+'/api/connection',{method:'POST',headers:{origin,'content-type':'application/json'},body:'{}'})
  const cookie=connection.headers.get('set-cookie').split(';')[0],{csrf}=await connection.json()
  const response=await fetch(origin+'/api/action',{method:'POST',headers:{origin,cookie,'content-type':'application/json',
   'x-hatter-csrf':csrf,'x-hatter-request-nonce':randomUUID()},body:'{}'})
  const timeout=await response.json()
  assert.equal(response.status,504);assert.equal(timeout.error.code,'DeliveryTimedOut')
  assert.equal(timeout.error.ownerFailure.outcomeStage,'OUTCOME_UNCERTAIN')
  assert.equal(timeout.error.ownerFailure.receiptRef,null);assert.equal(timeout.error.ownerFailure.uncertain,true)
  assert.equal(calls,1);assert.equal(effects,0)
  finish()
  for(let n=0;n<100&&server.inspect().activeRequests;n++)await delay(2)
  const final=outcomes.find(v=>v.requestRef===timeout.error.ownerFailure.requestRef)
  assert.equal(observedRequest,final.requestRef,'site observation and delivery outcome share the exact request identity')
  assert.equal(final.stage,'OWNER_COMMITTED');assert.equal(final.receiptRef,receiptRef);assert.equal(final.httpStatus,504)
  assert.deepEqual(failures,[timeout.error]);assert.equal(calls,1);assert.equal(effects,1)
  assert.equal(server.inspect().activeRequests,0)
 }finally{finish();await server.close()}
})
// D1: physical work is owned by the site, not by the HTTP response. This is a
// controlled owner lifecycle regression, not the complete product scheduler proof.
test('disconnect preserves owner completion; shutdown closes owner before draining and joins repeated closes', {timeout:5000},async()=>{
 const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r))
 const origin=`http://localhost:${port}`,assets=[{path:'/assets/client.js',bytes:script,bytesLength:script.length,kind:'script',digest:createHash('sha256').update(script).digest('hex')}]
 let entered,finish,ownerSignal,effects=0,ownerCloses=0
 const reset=()=>{const started=new Promise(r=>entered=r),completion=new Promise(r=>finish=r);return {started,completion}}
 let pending=reset()
 const server=createDeliveryServer({origin,assets,site:{
  async command(_url,_value,{signal}){ownerSignal=signal;const wait=pending.completion;entered();await wait;return {effects:++effects}},
  async close(){ownerCloses++;await delay(10);finish()}
 }})
 await server.listen()
 const connection=await fetch(origin+'/api/connection',{method:'POST',headers:{origin,'content-type':'application/json'},body:'{}'})
 const cookie=connection.headers.get('set-cookie').split(';')[0],{csrf}=await connection.json()
 const headers={cookie,origin,'content-type':'application/json','x-hatter-csrf':csrf}
 const request=signal=>fetch(origin+'/api/action',{method:'POST',headers:{...headers,'x-hatter-request-nonce':randomUUID()},body:'{}',signal}).then(async r=>({status:r.status,value:await r.json()}),error=>({error:error.name}))
 try{
  const abort=new AbortController(),first=request(abort.signal);await pending.started;abort.abort();await first
  // Transport cancellation is an observation, never fabricated physical cancel.
  for(let i=0;i<100&&!ownerSignal.aborted;i++)await delay(2)
  assert.equal(ownerSignal.aborted,true);assert.equal(effects,0);assert.equal(ownerCloses,0)
  finish();for(let i=0;i<100&&server.inspect().activeRequests;i++)await delay(2)
  assert.equal(effects,1);assert.equal(server.inspect().activeRequests,0)
  pending=reset();const second=request();await pending.started
  const closing=server.close(),repeated=server.close()
  assert.equal(closing,repeated,'concurrent disposal must share lifecycle completion')
  const result=await Promise.race([Promise.all([closing,repeated]).then(()=> 'closed'),delay(300).then(()=> 'blocked')])
  assert.equal(result,'closed','site.close must unblock owned work before delivery waits for it')
  await second
  assert.equal(ownerCloses,1);assert.equal(effects,2)
  assert.equal(server.inspect().activeRequests,0);assert.equal(server.inspect().alive,false)
  assert.equal(server.inspect().transport.connections,0)
 }finally{finish();await server.close()}
})
test('owner cleanup rejection is retained after transport release and repeated disposal',async()=>{
 const failure=Object.assign(Error('controlled cleanup failure'),{code:'OwnerCleanupFailed'})
 let calls=0
 const server=createDeliveryServer({origin:'http://localhost:3000',assets:[{path:'/assets/client.js',bytes:script,bytesLength:script.length,kind:'script',digest:createHash('sha256').update(script).digest('hex')}],site:{close(){calls++;throw failure}}})
 const closed=server.close()
 await assert.rejects(closed,error=>error instanceof AggregateError&&error.errors.length===1&&error.errors[0]===failure)
 assert.equal(server.close(),closed);assert.equal(calls,1)
 assert.equal(server.inspect().activeRequests,0);assert.equal(server.inspect().alive,false)
})
test('actual HTTP initial envelope, CSP, session command fencing, bounded intake, readiness and cleanup',async()=>{
 const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r))
 const origin=`http://localhost:${port}`,assets=[{path:'/assets/client.js',bytes:script,bytesLength:script.length,kind:'script',digest:createHash('sha256').update(script).digest('hex')}]
 let writes=0,closed=false
 const server=createDeliveryServer({origin,assets,readinessToken:'test-readiness',site:{
  async document(url,{assets}){return {envelope:{contract:'hatter/delivery/1',site:{id:'site:fixture',revision:'a'.repeat(64)},initial:null,snapshot:null,assets,transport:{path:'/api/projection-live',classes:['STATE']},
   readiness:{state:'SetupRequired',requirements:[{ref:'owner:test',owner:'test',state:'SetupRequired',setup:null,failure:{owner:'test',operation:'read',code:'Missing',requirementRef:'owner:test',detail:null}}]}},bootstrap:{label:'</script><script>alert(1)</script>'}}},
  read:async()=>({state:'SetupRequired'}),command:async()=>({writes:++writes}),live:async()=>({kind:'RecoveryUnavailable'}),close:async()=>{closed=true}}})
 await server.listen()
 try{
  const doc=await fetch(origin),html=await doc.text(),cookie=doc.headers.get('set-cookie').split(';')[0]
  assert.equal(doc.status,200);assert(!doc.headers.get('content-security-policy').includes('unsafe-inline'))
  assert(!html.includes('<script>alert'));assert(html.includes('\\u003c/script'))
  const initial=JSON.parse(html.match(/<script id="delivery-state" type="application\/json">(.*?)<\/script>/s)[1]);assert.equal(initial.envelope.readiness.state,'SetupRequired')
  assert.equal(writes,0);assert.equal((await fetch(origin+'/api/ready',{headers:{'x-hatter-readiness':'test-readiness'}})).status,204)
  const request={method:'POST',headers:{cookie,origin,'content-type':'application/json','x-hatter-csrf':initial.bootstrap.csrf,'x-hatter-request-nonce':randomUUID()},body:'{}'}
  assert.deepEqual(await(await fetch(origin+'/api/action',request)).json(),{writes:1})
  const replay=await fetch(origin+'/api/action',request)
  assert.equal(replay.status,400);assert.equal(writes,1)
  const rejected=await replay.json()
  assert.equal(rejected.error.code,'crowsi-browser-security-request-replayed')
  assert.equal(rejected.error.ownerFailure.owner,'crowsi/browser-security')
  assert.equal(rejected.error.ownerFailure.outcomeStage,'DELIVERY_REJECTED')
  assert.equal(rejected.error.ownerFailure.uncertain,false)
  assert.equal((await fetch(origin+'/api/action',{...request,headers:{...request.headers,origin:'http://evil.test','x-hatter-request-nonce':randomUUID()}})).status,400)
  const large=await fetch(origin+'/api/action',{...request,headers:{...request.headers,'x-hatter-request-nonce':randomUUID()},body:JSON.stringify({value:'x'.repeat(32768)})})
  assert.equal(large.status,400);assert.equal((await large.json()).error.code,'DeliveryLimitExceeded');assert.equal(writes,1)
  for(const rejected of [{'content-encoding':'gzip'},{'content-type':'text/plain'}]){
   const response=await fetch(origin+'/api/action',{...request,headers:{...request.headers,...rejected,'x-hatter-request-nonce':randomUUID()}})
   assert.equal(response.status,400);assert.equal((await response.json()).error.code,'InvalidInput')
  }
  // Exercise pre-allocation framing admission through raw HTTP. Missing or
  // noncanonical length is rejected by delivery; contradictory/invalid framing
  // may be rejected even earlier by Node's HTTP parser. Neither reaches owner.
  for(const framing of ['', 'Content-Length: 0\r\n', 'Content-Length: 01\r\n', 'Transfer-Encoding: chunked\r\n', 'Content-Length: 32769\r\n']){
   const response=await new Promise((resolve,reject)=>{
    const socket=net.connect(port,'127.0.0.1');let response=''
    socket.setTimeout(2000,()=>socket.destroy(Error('framing timeout')));socket.on('error',reject)
    socket.on('data',bytes=>{response+=bytes;if(response.includes('\r\n\r\n')){socket.destroy();resolve(response)}})
    socket.on('connect',()=>socket.write(`POST /api/action HTTP/1.1\r\nHost: localhost:${port}\r\nOrigin: ${origin}\r\nCookie: ${cookie}\r\nX-Hatter-Csrf: ${initial.bootstrap.csrf}\r\nX-Hatter-Request-Nonce: ${randomUUID()}\r\nContent-Type: application/json\r\n${framing}Connection: close\r\n\r\n`))
   });assert.match(response,/^HTTP\/1\.1 400 /)
  }
  assert.equal(writes,1)
  const status=await fetch(origin+'/api/status',{headers:{cookie}});assert.deepEqual(await status.json(),{state:'SetupRequired'});assert.equal(writes,1)
  assert.equal(await(await fetch(origin+'/assets/client.js')).text(),script.toString())
 }finally{await server.close()}
 assert(closed);assert.equal(server.inspect().alive,false);assert.equal(server.inspect().activeRequests,0);assert.equal(server.inspect().transport.connections,0)
})
