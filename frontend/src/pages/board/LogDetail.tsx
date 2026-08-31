import { PagePlaceholder } from '@/components/PagePlaceholder'

export default function LogDetail() {
  return (
    <PagePlaceholder
      title="로그 상세"
      phase="6-9"
      note="구 구현은 location.state 에만 의존해 새로고침하면 깨졌다(§12-11). URL 의 logId 로 조회한다."
    />
  )
}
