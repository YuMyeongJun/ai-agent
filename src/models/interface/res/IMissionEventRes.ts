import type { AgentStatus } from '../../types/agentType'

export interface IArtifact {
  filename: string
  title?: string
  subtitle?: string
  kind: string
  url?: string
  preview?: string
  agentId?: string
}

export interface IBriefingItem {
  id: string
  title: string
  subtitle?: string
  icon?: string
  type: string
  tag: string
  content?: string
  kind?: string
  url?: string
}

export interface IMissionSessionEvent {
  type: 'session'
  sessionId: string
}

export interface IMissionStatusEvent {
  type: 'status'
  agentId: string
  status: AgentStatus
}

export interface IMissionChatStartEvent {
  type: 'chat_start'
  messageId: string
  speaker: string
}

export interface IMissionChatDeltaEvent {
  type: 'chat_delta'
  messageId: string
  delta: string
}

export interface IMissionChatEndEvent {
  type: 'chat_end'
  messageId: string
}

export interface IMissionMoveEvent {
  type: 'move'
  agentId: string
  x?: number
  y?: number
  zoneId?: string
  deskId?: string
  reason?: string
}

export interface IMissionAssignEvent {
  type: 'assign'
  agentId: string
  cardLabel: string
  stage?: number
  stageTotal?: number
  roleTemplateId?: string
}

export interface IMissionPipelineEvent {
  type: 'pipeline'
  stages: Array<{
    employeeId: string
    employeeName: string
    roleTemplateId: string
    roleLabel: string
    order: number
  }>
}

export interface IMissionWorkEvent {
  type: 'work'
  agentId: string
  message: string
  progress: number
}

export interface IMissionArtifactEvent extends IArtifact {
  type: 'artifact'
  agentId: string
}

export interface IMissionBriefingEvent {
  type: 'briefing'
  results?: IBriefingItem[]
}

export interface IMissionDoneEvent {
  type: 'done'
}

export interface IMissionErrorEvent {
  type: 'error'
  message: string
}

export interface IMissionDialogueEvent {
  type: 'dialogue'
  fromAgentId: string
  toAgentId: string
  fromName: string
  toName: string
  content: string
  context?: string
  stage?: number
}

export type IMissionEventRes =
  | IMissionSessionEvent
  | IMissionStatusEvent
  | IMissionChatStartEvent
  | IMissionChatDeltaEvent
  | IMissionChatEndEvent
  | IMissionAssignEvent
  | IMissionMoveEvent
  | IMissionPipelineEvent
  | IMissionWorkEvent
  | IMissionArtifactEvent
  | IMissionBriefingEvent
  | IMissionDoneEvent
  | IMissionErrorEvent
  | IMissionDialogueEvent
  | { type: 'intent'; intent: string }
  | { type: 'action'; action: string; command?: string; message?: string }
  | { type: 'move'; agentId: string; deskId: string }
