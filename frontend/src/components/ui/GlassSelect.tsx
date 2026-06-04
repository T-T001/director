import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

export type GlassSelectOption = {
  value: string
  label: string
  caption?: string
  disabled?: boolean
}

export type GlassSelectGroup = {
  label: string
  options: GlassSelectOption[]
}

type GlassSelectItem = GlassSelectOption | GlassSelectGroup

type GlassSelectProps = {
  value: string
  onChange: (value: string) => void
  options: GlassSelectItem[]
  className?: string
  disabled?: boolean
  placeholder?: string
  ariaLabel?: string
  menuClassName?: string
}

function isGroup(item: GlassSelectItem): item is GlassSelectGroup {
  return 'options' in item
}

function flattenOptions(items: GlassSelectItem[]) {
  return items.flatMap((item) => (isGroup(item) ? item.options : [item]))
}

const MENU_GAP = 8
const MENU_MAX_HEIGHT = 360
const VIEWPORT_MARGIN = 12

export function GlassSelect({
  value,
  onChange,
  options,
  className,
  disabled = false,
  placeholder = '请选择',
  ariaLabel,
  menuClassName,
}: GlassSelectProps) {
  const id = useId()
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [menuRect, setMenuRect] = useState({
    top: 0 as number | undefined,
    bottom: undefined as number | undefined,
    left: 0,
    width: 0,
    maxHeight: MENU_MAX_HEIGHT,
  })

  const flatOptions = useMemo(() => flattenOptions(options), [options])
  const selectedOption = flatOptions.find((option) => option.value === value)
  const enabledOptions = flatOptions.filter((option) => !option.disabled)

  const updateMenuRect = () => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth
    const belowSpace = Math.max(0, viewportHeight - rect.bottom - MENU_GAP - VIEWPORT_MARGIN)
    const aboveSpace = Math.max(0, rect.top - MENU_GAP - VIEWPORT_MARGIN)
    const openAbove = belowSpace < 180 && aboveSpace > belowSpace
    const maxHeight = Math.min(MENU_MAX_HEIGHT, Math.max(140, openAbove ? aboveSpace : belowSpace))
    const width = Math.max(rect.width, 180)
    const left = Math.min(Math.max(VIEWPORT_MARGIN, rect.left), Math.max(VIEWPORT_MARGIN, viewportWidth - width - VIEWPORT_MARGIN))

    setMenuRect({
      top: openAbove ? undefined : rect.bottom + MENU_GAP,
      bottom: openAbove ? viewportHeight - rect.top + MENU_GAP : undefined,
      left,
      width,
      maxHeight,
    })
  }

  const openMenu = () => {
    if (disabled) return
    const selectedIndex = flatOptions.findIndex((option) => option.value === value && !option.disabled)
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : Math.max(0, flatOptions.findIndex((option) => !option.disabled)))
    updateMenuRect()
    setOpen(true)
  }

  const closeMenu = () => setOpen(false)

  const selectOption = (option: GlassSelectOption) => {
    if (option.disabled) return
    onChange(option.value)
    closeMenu()
    buttonRef.current?.focus()
  }

  const moveActive = (direction: 1 | -1) => {
    if (enabledOptions.length === 0) return
    const currentValue = flatOptions[activeIndex]?.value
    const enabledIndex = enabledOptions.findIndex((option) => option.value === currentValue)
    const nextEnabled = enabledOptions[(enabledIndex + direction + enabledOptions.length) % enabledOptions.length]
    setActiveIndex(flatOptions.findIndex((option) => option.value === nextEnabled.value))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        openMenu()
        return
      }
      moveActive(event.key === 'ArrowDown' ? 1 : -1)
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!open) {
        openMenu()
        return
      }
      const option = flatOptions[activeIndex]
      if (option) selectOption(option)
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      closeMenu()
    }
  }

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return
      closeMenu()
    }
    const handleLayoutChange = () => updateMenuRect()

    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('resize', handleLayoutChange)
    window.addEventListener('scroll', handleLayoutChange, true)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('resize', handleLayoutChange)
      window.removeEventListener('scroll', handleLayoutChange, true)
    }
  }, [open])

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          id={`${id}-listbox`}
          role="listbox"
          className={['glass-select-menu animate-modal-in', menuClassName ?? ''].filter(Boolean).join(' ')}
          style={{
            top: menuRect.top,
            bottom: menuRect.bottom,
            left: menuRect.left,
            width: menuRect.width,
            maxHeight: menuRect.maxHeight,
          }}
        >
          {options.map((item) =>
            isGroup(item) ? (
              <div key={item.label} className="glass-select-group">
                <div className="glass-select-group-label">{item.label}</div>
                {item.options.map((option) => (
                  <SelectOptionRow
                    key={option.value}
                    option={option}
                    selected={option.value === value}
                    active={flatOptions[activeIndex]?.value === option.value}
                    onSelect={selectOption}
                  />
                ))}
              </div>
            ) : (
              <SelectOptionRow
                key={item.value}
                option={item}
                selected={item.value === value}
                active={flatOptions[activeIndex]?.value === item.value}
                onSelect={selectOption}
              />
            ),
          )}
        </div>,
        document.body,
      )
    : null

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={['glass-select-trigger', className ?? ''].filter(Boolean).join(' ')}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        disabled={disabled}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleKeyDown}
      >
        <span className={selectedOption ? 'glass-select-value' : 'glass-select-placeholder'}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown className={['glass-select-caret', open ? 'glass-select-caret-open' : ''].filter(Boolean).join(' ')} />
      </button>
      {menu}
    </>
  )
}

function SelectOptionRow({
  option,
  selected,
  active,
  onSelect,
}: {
  option: GlassSelectOption
  selected: boolean
  active: boolean
  onSelect: (option: GlassSelectOption) => void
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      disabled={option.disabled}
      className={[
        'glass-select-option',
        selected ? 'glass-select-option-selected' : '',
        active ? 'glass-select-option-active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => onSelect(option)}
    >
      <span className="min-w-0">
        <span className="glass-select-option-label">{option.label}</span>
        {option.caption ? <span className="glass-select-option-caption">{option.caption}</span> : null}
      </span>
      {selected ? <Check className="glass-select-check" /> : null}
    </button>
  )
}
