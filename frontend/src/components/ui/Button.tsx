import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

type ButtonVariant = 'primary' | 'secondary'

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant
    block?: boolean
  }
>

export function Button({ children, className, variant = 'primary', block = false, ...rest }: ButtonProps) {
  const variantClass = variant === 'primary' ? 'glass-btn-primary' : 'glass-btn-secondary'
  return (
    <button
      className={[
        'glass-btn px-4 py-2 text-sm',
        variantClass,
        block ? 'w-full' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </button>
  )
}
