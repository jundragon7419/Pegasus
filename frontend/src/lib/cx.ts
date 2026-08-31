/** CSS Modules 클래스 이름을 합친다. falsy 값은 무시한다. */
export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}
