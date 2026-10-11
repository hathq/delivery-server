import test from 'node:test'
import assert from 'node:assert/strict'
import {unresolvedPresentation} from '../src/unresolved-presentation.mjs'

test('exact owner reasons receive plain presentation words without an invented action',()=>{
 const unknown=unresolvedPresentation('UnknownExpression')
 assert.equal(unknown.label,'Meaning not recognized')
 assert.equal(unknown.reason,'UnknownExpression')
 assert.equal(Object.hasOwn(unknown,'action'),false)
 const other=unresolvedPresentation('OwnerDefinedReason')
 assert.equal(other.reason,'OwnerDefinedReason')
 assert.equal(other.label,'Information not understood')
})
