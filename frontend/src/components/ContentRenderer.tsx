import styles from './ContentRenderer.module.css'

/**
 * 게시글 본문을 그린다.
 *
 * **본문은 평문이다. HTML 도 마크다운도 아니다.** 여기서 `dangerouslySetInnerHTML`
 * 을 쓰지 않기 때문에 사용자가 무엇을 적든 문자 그대로 보이고, 그래서 XSS 가
 * 성립하지 않는다. 서식이 필요해지더라도 이 성질을 깨는 방향(HTML 삽입)이 아니라
 * 파서를 두고 안전한 노드만 만드는 방향으로 가야 한다.
 *
 * 빈 줄로 문단을 나누고, 문단 안의 줄바꿈은 `pre-line` 으로 살린다.
 */
export function ContentRenderer({ content }: { content: string }) {
  const paragraphs = content.split(/\n{2,}/).filter((block) => block.trim() !== '')

  return (
    <div className={styles.root}>
      {paragraphs.map((block, index) => (
        <p key={index} className={styles.paragraph}>
          {block}
        </p>
      ))}
    </div>
  )
}
