import { motion } from "framer-motion"
import { EnersaveMonogram } from "@/components/common/EnersaveMonogram"

export function SipsLoadingAnimation() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-10"
      role="status"
      aria-live="polite"
      aria-label="Consultando SIPS"
    >
      <div className="relative flex h-28 w-28 items-center justify-center">
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-cyan-500/25 border-t-cyan-500"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-2 rounded-full border border-brand-border/60 border-b-cyan-400/80"
          animate={{ rotate: -360 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          initial={{ scale: 0.92, opacity: 0.6 }}
          animate={{ scale: [0.92, 1, 0.92], opacity: [0.65, 1, 0.65] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <EnersaveMonogram className="h-14 w-auto relative z-10" />
        </motion.div>
      </div>
      <p className="text-xs font-mono font-bold uppercase tracking-wider text-brand-subtext">
        Consultando SIPS…
      </p>
    </div>
  )
}
