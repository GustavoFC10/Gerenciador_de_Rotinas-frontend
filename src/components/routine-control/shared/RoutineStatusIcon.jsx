import { ROUTINE_STATUS } from '../../../constants/routineStatus.js'

function RoutineStatusIcon({ status, className = 'size-4' }) {
  const iconProps = {
    viewBox: '0 0 24 24',
    className,
    fill: 'none',
    stroke: 'currentColor',
    'aria-hidden': true,
  }

  if (status === ROUTINE_STATUS.COMPLETED) {
    return (
      <svg {...iconProps}>
        <path
          d="m5 12.5 4.2 4.2L19 7"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (status === ROUTINE_STATUS.ERROR) {
    return (
      <svg {...iconProps}>
        <path d="M12 4 21 20H3L12 4Z" strokeWidth="2" strokeLinejoin="round" />
        <path d="M12 9v5" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M12 17h.01" strokeWidth="3" strokeLinecap="round" />
      </svg>
    )
  }

  if (status === ROUTINE_STATUS.IN_PROGRESS) {
    return (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="7" strokeWidth="2" />
        <path
          d="M12 8.5V12l2.8 1.8"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (status === ROUTINE_STATUS.NO_MOVEMENT) {
    return (
      <svg {...iconProps}>
        <path d="M6 12h12" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    )
  }

  if (status === ROUTINE_STATUS.NOT_APPLICABLE) {
    return (
      <svg {...iconProps}>
        <path
          d="m7 7 10 10M17 7 7 17"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
      </svg>
    )
  }

  return (
    <svg {...iconProps}>
      <path
        d="M8 5.5h8A2.5 2.5 0 0 1 18.5 8v8a2.5 2.5 0 0 1-2.5 2.5H8A2.5 2.5 0 0 1 5.5 16V8A2.5 2.5 0 0 1 8 5.5Z"
        strokeWidth="1.9"
      />
      <path d="M9 10h6" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 14h4" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default RoutineStatusIcon
