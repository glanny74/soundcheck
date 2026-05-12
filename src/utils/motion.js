/*
  Variants et easings partagés pour Framer Motion.
  ---------------------------------------------------------------------------
  On centralise les courbes d'easing et les patterns de transition (entrée
  de page, stagger reveal, fade-up...) pour garantir une cohérence visuelle
  sur l'ensemble de l'application.
*/

// Courbes d'easing custom — pas les defaults insipides
export const EASE_OUT = [0.22, 1, 0.36, 1] // smooth, entrées
export const EASE_IN = [0.64, 0, 0.78, 0] // sharp, sorties

/**
 * Transition de page : entrée slide+fade depuis le bas, sortie discrète.
 * Utilisée sur le wrapper principal de chaque écran.
 */
export const pageTransition = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.7, ease: EASE_OUT },
}

/**
 * Container avec stagger : les enfants apparaissent en cascade.
 * À combiner avec `fadeUpChild` sur chaque enfant motion.
 */
export const staggerContainer = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
}

export const fadeUpChild = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
}

/** Variante plus marquée pour les titres héroïques */
export const heroTitle = {
  initial: { opacity: 0, y: 60, scale: 0.96 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.9, ease: EASE_OUT },
  },
}
