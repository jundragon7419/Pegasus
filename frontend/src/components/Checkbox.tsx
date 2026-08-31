import { CheckIcon } from '@radix-ui/react-icons'
import type { ReactNode } from 'react'
import { Checkbox as RadixCheckbox } from 'radix-ui'

import styles from './Checkbox.module.css'

type CheckboxProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  children: ReactNode
}

export function Checkbox({ checked, onCheckedChange, children }: CheckboxProps) {
  return (
    <label className={styles.label}>
      <RadixCheckbox.Root
        className={styles.root}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      >
        <RadixCheckbox.Indicator className={styles.indicator}>
          <CheckIcon />
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
      {children}
    </label>
  )
}
