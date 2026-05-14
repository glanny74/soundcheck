import { motion } from 'framer-motion'
import {
  EASE_OUT,
  fadeUpChild,
  pageTransition,
  staggerContainer,
} from '../../utils/motion'

/*
  AuthLayout — wrapper editorial commun aux écrans Login / Register / Forgot.
  ---------------------------------------------------------------------------
  Split-screen :
    - Colonne gauche (desktop) : numéro d'étape + gros titre éditorial,
      slogan, accroche
    - Colonne droite : formulaire compact

  Sur mobile : layout stack vertical, titre puis form.
*/

export default function AuthLayout({
  step,
  title,
  italicWord,
  accent = 'green',
  description,
  children,
  footer,
}) {
  const accentText =
    accent === 'green'
      ? 'text-accent-green'
      : accent === 'purple'
      ? 'text-accent-purple'
      : accent === 'pink'
      ? 'text-accent-pink'
      : 'text-accent-blue'

  return (
    <motion.main
      key={`auth-${step}`}
      {...pageTransition}
      className="relative min-h-screen w-full overflow-hidden px-4 sm:px-10 py-6 sm:py-10"
    >
      {/* Halo coloré en fond — couleur selon l'accent de l'écran */}
      <div
        className={`pointer-events-none absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full blur-[120px] animate-drift
          ${accent === 'green' ? 'bg-accent-green/15' : ''}
          ${accent === 'purple' ? 'bg-accent-purple/20' : ''}
          ${accent === 'pink' ? 'bg-accent-pink/20' : ''}
          ${accent === 'blue' ? 'bg-accent-blue/20' : ''}
        `}
        aria-hidden="true"
      />

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="relative z-10 grid grid-cols-12 gap-8 lg:gap-16 items-start"
      >
        {/* Colonne gauche : titre éditorial */}
        <div className="col-span-12 lg:col-span-6">
          <motion.p
            variants={fadeUpChild}
            className="text-[11px] uppercase tracking-[0.3em] text-text-tertiary mb-6"
          >
            SoundCheck —{' '}
            <span className="serif-italic normal-case tracking-normal text-text-secondary">
              {step}
            </span>
          </motion.p>

          <motion.h1
            variants={fadeUpChild}
            className="font-display font-extrabold leading-[0.85] tracking-[-0.04em]
                       text-[56px] sm:text-[96px] lg:text-[120px]"
          >
            <span className="block text-text-primary">{title}</span>
            <span className={`block serif-italic ${accentText} ml-[6%] sm:ml-[8%]`}>
              {italicWord}
            </span>
          </motion.h1>

          {description && (
            <motion.p
              variants={fadeUpChild}
              className="mt-8 max-w-[400px] text-text-secondary text-base leading-relaxed"
            >
              {description}
            </motion.p>
          )}
        </div>

        {/* Colonne droite : formulaire */}
        <motion.div
          variants={fadeUpChild}
          transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.2 }}
          className="col-span-12 lg:col-span-6"
        >
          {children}

          {footer && (
            <div className="mt-8 pt-6 border-t border-white/5 text-sm text-text-secondary">
              {footer}
            </div>
          )}
        </motion.div>
      </motion.div>
    </motion.main>
  )
}
