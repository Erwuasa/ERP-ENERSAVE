import { AnimatePresence, motion } from "framer-motion"
import { CheckCircle2 } from "lucide-react"
import { useEffect } from "react"
import { getMotionDuration } from "../../lib/ventas/motion-prefs"

export interface MiDiaAccomplishmentBurstProps {
  open: boolean
  message: string
  reducedMotion?: boolean
  onDone?: () => void
}

const PARTICLE_COUNT = 10

function buildParticles() {
  return Array.from({ length: PARTICLE_COUNT }, (_, index) => ({
    id: index,
    x: (Math.random() - 0.5) * 120,
    y: -(40 + Math.random() * 60),
    color: ["#06b6d4", "#8b5cf6", "#10b981", "#f59e0b"][index % 4],
    size: 4 + (index % 3),
  }))
}

const particles = buildParticles()

export function MiDiaAccomplishmentBurst({
  open,
  message,
  reducedMotion = false,
  onDone,
}: MiDiaAccomplishmentBurstProps) {
  useEffect(() => {
    if (!open) return
    const duration = getMotionDuration(2600, reducedMotion)
    if (duration === 0) {
      onDone?.()
      return
    }
    const timer = window.setTimeout(() => onDone?.(), duration)
    return () => window.clearTimeout(timer)
  }, [open, onDone, reducedMotion])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-x-0 top-20 z-[60] flex justify-center pointer-events-none px-4"
          initial={{ opacity: 0, y: reducedMotion ? 0 : -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reducedMotion ? 0 : -8 }}
          transition={{ duration: getMotionDuration(0.25, reducedMotion) / 1000 }}
          role="status"
          aria-live="polite"
        >
          <div className="relative flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-sm px-4 py-3 shadow-lg shadow-emerald-500/10 max-w-md">
            {!reducedMotion &&
              particles.map((particle) => (
                <motion.span
                  key={particle.id}
                  className="absolute left-1/2 top-1/2 rounded-full"
                  style={{
                    width: particle.size,
                    height: particle.size,
                    backgroundColor: particle.color,
                  }}
                  initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                  animate={{
                    opacity: 0,
                    x: particle.x,
                    y: particle.y,
                    scale: 0.2,
                  }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                />
              ))}

            <motion.div
              initial={{ scale: reducedMotion ? 1 : 0.6 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 420,
                damping: 16,
                duration: getMotionDuration(0.35, reducedMotion) / 1000,
              }}
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            </motion.div>
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
