import test from 'node:test'
import assert from 'node:assert/strict'
import {personInformation} from '../src/person-information.mjs'

test('person shelves require an exact focused Scene and retain declared regions without inventing ownership',()=>{
 const item={id:'record:one',display:{title:'Original record'}},plan={regions:[{id:'primary',role:'Primary',items:[item]}],unplaced:[item]}
 const scene={kind:'Scene',data:{focus:'role:one'}}
 assert.deepEqual(personInformation(plan,scene,'role:one'),[{id:'primary',label:'Primary',items:[item]}])
 assert.deepEqual(personInformation(plan,scene,'role:two'),[])
 assert.deepEqual(personInformation(plan,{kind:'Data',data:{focus:'role:one'}},'role:one'),[])
 assert.deepEqual(personInformation(plan,null,'role:one'),[])
})
