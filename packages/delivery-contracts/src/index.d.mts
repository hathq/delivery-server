import type {Action, Json, ProjectionIdentity, SceneProjection} from '@hathq/projection-contracts/client'

export interface Submission {
  readonly projectionKey:string
  readonly projectionRevision:string
  readonly sceneId:string
  readonly actionId:string
  readonly interactionRef:string
  readonly generation:string
  readonly inputContractRef:string
  readonly values:Readonly<Record<string,string|boolean|number>>
}
export interface OwnerFailure {
  readonly owner:string
  readonly operation:string
  readonly code:string
  readonly requirementRef:string
  readonly detail:Json
}
export interface Setup {readonly id:string;readonly owner:string;readonly operation:string}
export type Requirement =
  | {readonly ref:string;readonly owner:string;readonly state:'Ready';readonly failure:null;readonly setup:null}
  | {readonly ref:string;readonly owner:string;readonly state:'SetupRequired'|'Unavailable';readonly failure:OwnerFailure;readonly setup:Setup|null}
export interface Readiness {
  readonly state:'Ready'|'SetupRequired'|'Unavailable'
  readonly requirements:readonly Requirement[]
}
export interface Asset {readonly path:string;readonly digest:string;readonly bytes:number;readonly kind:'script'|'style'}
export interface Delivery {
  readonly contract:'hatter/delivery/1'
  readonly site:{readonly id:string;readonly revision:string}
  readonly initial:ProjectionIdentity|null
  readonly snapshot:SceneProjection|null
  readonly readiness:Readiness
  readonly assets:readonly Asset[]
  readonly transport:{readonly path:'/api/projection-live';readonly classes:readonly ['STATE']}
}
export const bounds:Readonly<{documentBytes:1048576;assets:8;assetBytes:1048576;requirements:16;requestBytes:32768;requests:16;bodyMs:5000}>
export class DeliveryError extends Error {readonly code:string;constructor(code:string)}
export function validateSubmission(value:unknown):Submission
export function inputAction(snapshot:SceneProjection,submission:Submission):Action
export function requirement(value:unknown):Requirement
export function readiness(refs:readonly string[],owners:readonly Requirement[]):Readiness
export function validateDelivery(value:unknown):Delivery
