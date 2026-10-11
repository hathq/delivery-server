import test from 'node:test'
import assert from 'node:assert/strict'
import {roleInferenceStatus} from '../src/activity-view.mjs'

const work=(id,state,acceptedSequence=1,detail=null,kind='inference')=>({roleRef:{id},state,acceptedSequence,detail,kind,requestRef:`request:${id}:${acceptedSequence}`})

test('person review status distinguishes owner reservation, uncertain result and another person’s work',()=>{
 const role='personal',other=work('learning','Running')
 const observe=(roles,driverFailed=false)=>roleInferenceStatus({available:true,roles:[other,...roles],driverFailed},role)
 assert.equal(observe([]).state,'Idle')
 assert.equal(observe([work(role,'Runnable')]).state,'Queued')
 assert.equal(observe([work(role,'Blocked',1,'InputUnavailable')]).state,'InputNeeded')
 assert.match(observe([work(role,'Blocked',1,'InputUnavailable')],true).detail,/dispatcher has also stopped/)
 assert.equal(observe([work(role,'Blocked',1,{Dependency:{request_ref:'prerequisite'}})]).state,'Waiting')
 assert.equal(observe([work(role,'Running')]).state,'AwaitingResult')
 assert.equal(observe([work(role,'Runnable')],true).state,'Paused')
 const uncertain=observe([work(role,'Running',1),work(role,'Blocked',2,'InputUnavailable')],true)
 assert.equal(uncertain.state,'Uncertain')
 assert.equal(uncertain.work.requestRef,'request:personal:1')
 assert.match(uncertain.detail,/not retried automatically/)
 assert.equal(observe([work(role,'Completed',1,{result_ref:'result'})]).state,'Completed')
 assert.equal(observe([work(role,'Failed',1,{source:{code:'failure'}})]).state,'Failed')
 assert.equal(observe([work(role,'Completed')],true).state,'Paused')
 assert.equal(observe([work(role,'Running',1,null,'resolution')]).state,'Idle','non-inference Work does not imply a model is running')
 assert.equal(roleInferenceStatus({available:false},role).state,'Unavailable')
})
