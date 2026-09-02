import { Modal } from '@/components/Modal'
import type { PollOption } from '@/types/board'

import styles from './VoterModal.module.css'

type VoterModalProps = {
  /** null 이면 닫힌 상태 */
  option: PollOption | null
  onClose: () => void
}

/**
 * 옵션별 투표자 명단.
 *
 * **익명 투표에서는 열릴 수 없다.** 서버가 명단을 아예 내려주지 않아
 * `voters` 가 항상 빈 배열이고, 호출부가 빈 배열이면 여는 버튼을 만들지 않는다.
 * 이 컴포넌트가 스스로 숨기는 게 아니라 데이터가 없는 것이다(§12-9).
 */
export function VoterModal({ option, onClose }: VoterModalProps) {
  return (
    <Modal
      open={option !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={option ? `"${option.text}" 투표자` : ''}
      description={option ? `${option.voters.length}명` : undefined}
    >
      <ul className={styles.list}>
        {option?.voters.map((name, index) => (
          <li key={`${name}-${index}`} className={styles.item}>
            {name}
          </li>
        ))}
      </ul>
    </Modal>
  )
}
