// Hatter downstream 2026: presentation wording for owner-reported reasons.
// The original reason and references remain available; this creates no action.
const descriptions={
 UnknownExpression:['Meaning not recognized','The current definitions could not interpret this expression. No correction or action has been chosen.'],
 MissingContext:['Context is missing','The owner needs more context before it can interpret this information.'],
 Ambiguous:['More than one meaning is possible','The owner has not selected one interpretation.'],
 ConflictingEvidence:['Information conflicts','The supplied evidence does not currently agree.'],
 CardinalityViolation:['Information does not fit the definition','The current definition does not allow this combination of values.'],
 CircularDependency:['Definitions depend on each other','The current definitions contain a dependency cycle.']
}
export function unresolvedPresentation(reason){
 const [label,detail]=descriptions[reason]??['Information not understood','The owner reported an unresolved reason. Inspect its exact reference before taking action.']
 return {label,detail,reason}
}
