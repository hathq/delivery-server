// Only a published Scene whose exact focus is this Role may appear inside its
// person panel. Regions and display labels come from the producer's RenderPlan.
export function personInformation(plan,snapshot,roleId){
 if(!plan||snapshot?.kind!=='Scene'||snapshot.data?.focus!==roleId)return []
 const seen=new Set(),groups=[]
 for(const region of [...plan.regions,...(plan.unplaced.length?[{id:'unplaced',role:'Other information',items:plan.unplaced}]:[])]){
  const items=region.items.filter(item=>{
   if(seen.has(item.id))return false
   seen.add(item.id);return true
  })
  if(items.length)groups.push({id:region.id,label:region.role,items})
 }
 return groups
}
