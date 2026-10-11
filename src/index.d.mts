import type {DeliveryServerOptions as GenericOptions,DeliveryServer} from '@zixcel/view-delivery'
export type {RequestContext,DocumentContext,CommandContext,DeliverySite,TrustedAsset,DeliveryServer} from '@zixcel/view-delivery'
export type DeliveryServerOptions = Omit<GenericOptions, 'policy'>
export function createDeliveryServer(options:DeliveryServerOptions):DeliveryServer
