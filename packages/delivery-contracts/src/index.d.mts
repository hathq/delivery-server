import type {Delivery as GenericDelivery} from '@zixcel/view-delivery-contracts'
export * from '@zixcel/view-delivery-contracts'
export interface Delivery extends GenericDelivery {readonly contract:'hatter/delivery/1'}
export function validateDelivery(value:unknown):Delivery
