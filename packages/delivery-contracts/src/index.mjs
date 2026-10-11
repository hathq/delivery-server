// Product wire compatibility; generic mechanics are owned by Zixcel.
export {bounds,DeliveryError,validateSubmission,inputAction,requirement,readiness} from '@zixcel/view-delivery-contracts'
import {validateDelivery as validateGenericDelivery} from '@zixcel/view-delivery-contracts'
export function validateDelivery(value){return validateGenericDelivery(value,'hatter/delivery/1')}
