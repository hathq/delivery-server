import type {Server} from 'node:http'
import type {Asset,Delivery} from '@hathq/delivery-contracts'
import type {Json} from '@hathq/projection-contracts/client'

export interface RequestContext {readonly signal:AbortSignal}
export interface DocumentContext extends RequestContext {readonly assets:readonly Asset[]}
export interface CommandContext extends RequestContext {
  readonly requestRef:string
  observe(value:unknown):void
}
export interface DeliverySite {
  document(url:URL,context:DocumentContext):Promise<{envelope:Delivery;bootstrap:Readonly<Record<string,Json>>}>|{envelope:Delivery;bootstrap:Readonly<Record<string,Json>>}
  read(url:URL,context:RequestContext):unknown|Promise<unknown>
  command(url:URL,value:unknown,context:CommandContext):unknown|Promise<unknown>
  live(request:unknown):unknown|Promise<unknown>
  close?():void|Promise<void>
}
export interface TrustedAsset {
  readonly path:string
  readonly bytes:Uint8Array
  readonly bytesLength:number
  readonly digest:string
  readonly kind:'script'|'style'
}
export interface DeliveryServer {
  readonly server:Server
  notify():void
  inspect():{readonly alive:boolean;readonly activeRequests:number;readonly transport:unknown}
  listen():Promise<void>
  close():Promise<void>
}
export interface DeliveryServerOptions {
  readonly origin:string
  readonly site:DeliverySite
  readonly assets:readonly TrustedAsset[]
  readonly readinessToken?:string|null
  readonly onFailure?:((failure:unknown)=>void)|null
  readonly onOutcome?:((outcome:unknown)=>void)|null
}
export function createDeliveryServer(options:DeliveryServerOptions):DeliveryServer
