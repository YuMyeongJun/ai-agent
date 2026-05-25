export interface ILibrarySession {
  sessionId: string
  title: string
  artifactCount?: number
  updatedAt?: number
}

export interface ILibraryRes {
  sessions: ILibrarySession[]
}
