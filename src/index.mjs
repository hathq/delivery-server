// Hatter supplies product policy; Zixcel owns the bounded delivery host.
import {createDeliveryServer as createGenericDeliveryServer} from '@zixcel/view-delivery'
const policy=Object.freeze({owner:'hatter/delivery',title:'Hatter',contract:'hatter/delivery/1',
 allowedOwners:Object.freeze(['hatter/control','hatter/semantic','hatter/catalog','hatter/models','hatter/projection','hatter/world']),
 cookieName:'hatter_delivery_session',csrfHeader:'x-hatter-csrf',nonceHeader:'x-hatter-request-nonce',readinessHeader:'x-hatter-readiness'})
export function createDeliveryServer(options){return createGenericDeliveryServer({...options,policy})}
