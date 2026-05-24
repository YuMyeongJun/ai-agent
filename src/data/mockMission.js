export function buildMissionScript(mission) {
  return [
    {
      delay: 500,
      type: 'status',
      agentId: 'main',
      status: 'THINKING',
    },
    {
      delay: 900,
      type: 'chat',
      speaker: 'main',
      message: '명령 확인했습니다, CEO님. 업무를 배분합니다.',
    },
    {
      delay: 1600,
      type: 'assign',
      agentId: 'musicDev',
      cardLabel: 'Music Pipeline',
      workMessage: '코드를 작성 중입니다...',
      duration: 3500,
      chat: {
        speaker: 'main',
        message: '@Music Dev, 마르코프 체인 기반 Lo-fi 트랙 코드를 작성해.',
      },
      response: {
        speaker: 'musicDev',
        message: '알겠습니다! Python + music21 파이프라인 가동합니다.',
      },
    },
    {
      delay: 2800,
      type: 'assign',
      agentId: 'score',
      cardLabel: 'Score Export',
      workMessage: 'MIDI → MusicXML 변환 중...',
      duration: 2800,
      chat: {
        speaker: 'main',
        message: '@Score, Music Dev 결과물을 악보로 변환해줘.',
      },
      response: {
        speaker: 'score',
        message: 'MusicXML + PDF 렌더링 시작합니다.',
      },
    },
    {
      delay: 4000,
      type: 'assign',
      agentId: 'marketer',
      cardLabel: 'Blog Draft',
      workMessage: '블로그 포스팅 초안을 잡는 중입니다...',
      duration: 3200,
      chat: {
        speaker: 'main',
        message: '@Marketer, 네이버 블로그용 포스팅 초안 작성해.',
      },
      response: {
        speaker: 'marketer',
        message: 'Hook + 알고리즘 설명 + CTA 구조로 진행할게요!',
      },
    },
    {
      delay: 5200,
      type: 'assign',
      agentId: 'legal',
      cardLabel: 'Legal Audit',
      workMessage: '저작권 리스크 검토 중...',
      duration: 2500,
      chat: {
        speaker: 'main',
        message: '@Legal, 알고리즘 생성물 저작권 안전성 검토 부탁.',
      },
      response: {
        speaker: 'legal',
        message: '마르코프/유클리드 알고리즘 — 카피라이트 이슈 없음 확인.',
      },
    },
    {
      delay: 8500,
      type: 'report',
      agentId: 'musicDev',
      message: 'C Major Lo-fi 트랙 MIDI 생성 완료. seed=42',
    },
    {
      delay: 9200,
      type: 'report',
      agentId: 'score',
      message: 'MusicXML + PDF 악보 출력 완료.',
    },
    {
      delay: 9900,
      type: 'report',
      agentId: 'marketer',
      message: '블로그 포스팅 초안 & Shorts 스크립트 완료.',
    },
    {
      delay: 10600,
      type: 'report',
      agentId: 'legal',
      message: '저작권 안전성 PASS — 배포 가능.',
    },
    {
      delay: 11500,
      type: 'status',
      agentId: 'main',
      status: 'REPORTING',
    },
    {
      delay: 11800,
      type: 'chat',
      speaker: 'main',
      message: `CEO님, "${mission}" 미션 결과물을 정리했습니다. 아래 브리핑을 확인해 주세요.`,
    },
    {
      delay: 12000,
      type: 'briefing',
      results: buildBriefingResults(mission),
    },
    {
      delay: 12500,
      type: 'status',
      agentId: 'main',
      status: 'IDLE',
    },
    {
      delay: 13000,
      type: 'reset',
    },
  ]
}

export function buildBriefingResults(mission) {
  return [
    {
      id: 'music-code',
      title: 'Lo-fi Track Generator',
      subtitle: 'Python · music21 · seed=42',
      icon: '🎹',
      type: 'code',
      tag: 'midi-ready',
      content: `# ${mission}\nfrom music21 import stream, note, chord, tempo\n\ns = stream.Stream()\ns.append(tempo.MetronomeMark(number=82))\n\n# Markov melody — C Major\nmelody = ['C4','E4','G4','A4','G4','E4','C4','D4']\nfor pitch in melody:\n    s.append(note.Note(pitch, quarterLength=1))\n\ns.write('midi', fp='output/lofi_c_major.mid')`,
    },
    {
      id: 'score',
      title: '악보 출력물',
      subtitle: 'MusicXML + PDF',
      icon: '🎼',
      type: 'file',
      tag: 'export-done',
      content: 'output/lofi_c_major.xml\noutput/lofi_c_major.pdf\n\n4/4 · C Major · 32 bars\nParts: Melody, Chords, Drums',
    },
    {
      id: 'blog',
      title: '블로그 포스팅 초안',
      subtitle: '네이버 블로그 · SEO 최적화',
      icon: '📝',
      type: 'text',
      tag: 'draft',
      content: '【Hook】이 멜로디, 코드 3줄로 만들었습니다\n\n마르코프 체인 + 유클리드 리듬으로 Lo-fi 힙합을 생성하는 방법을 소개합니다. seed=42로 재현 가능한 결과물...\n\n【CTA】GitHub에서 전체 코드 확인 →',
    },
    {
      id: 'legal',
      title: '저작권 안전성 검토',
      subtitle: 'Legal Auditor Report',
      icon: '⚖️',
      type: 'status',
      tag: 'pass',
      content: '✅ 알고리즘 기반 생성 (마르코프, 유클리드)\n✅ 기존 곡 카피 없음\n✅ 상업적 배포 가능\n\nRisk Level: LOW',
    },
  ]
}
