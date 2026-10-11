import type {Json} from '@zixcel/projection-contracts/client'
import type {ClientProjectionRuntime} from '@zixcel/projection-client'
import type {Delivery} from '@hathq/delivery-contracts'

/** Owner-supplied bootstrap data serialized in the delivery document. */
export interface Bootstrap {
  readonly csrf:string
  readonly [field:string]:Json
}
export interface DeliveryInitial {
  readonly envelope:Delivery
  readonly bootstrap:Bootstrap
}
export interface DeliveryClient {
  readonly runtime:ClientProjectionRuntime
  close():void
}
export function startDelivery(root:HTMLElement,initial:DeliveryInitial):DeliveryClient
