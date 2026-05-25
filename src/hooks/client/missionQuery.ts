import type { ILibraryRes } from '../../models/interface/res/ILibraryRes'

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export async function fetchLibrary(): Promise<ILibraryRes> {
  const response = await fetch(`${API_BASE}/api/library`)
  if (!response.ok) {
    throw new Error('저장된 작업 목록을 불러올 수 없습니다.')
  }
  return response.json()
}
