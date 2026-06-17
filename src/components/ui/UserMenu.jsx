import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'

/*
  UserMenu — bouton avatar + dropdown menu (Mon profil, Historique, Classement,
  Se déconnecter). Utilisé sur Home.
  ---------------------------------------------------------------------------
  Comportement :
   - Au clic sur l'avatar/pseudo : ouverture du panneau
   - Click outside ou Échap : fermeture
   - Mode invité : pas de Profile/Historique/Classement, juste "Quitter"

  Le composant ne sait pas naviguer lui-même : il reçoit les callbacks
  onProfile / onHistory / onLeaderboard / onLogout en props.

  HISTORIQUE DU BUG : pendant plusieurs sessions, les clics sur les 4 items
  de la dropdown ne déclenchaient pas leur onClick (les console.log placés
  dans handleAction ne sortaient jamais dans la console). Hypothèse retenue
  pour ce fix : `backdrop-blur-md` sur le motion.div animé créait un problème
  de hit-testing CSS dans le navigateur (issue documentée Chromium/Webkit
  avec backdrop-filter dans des conteneurs transformés).
  Fix appliqué : retrait de `backdrop-blur-md`, fond du dropdown rendu plus
  opaque (bg-bg-card sans transparence) pour compenser le retrait visuel
  du blur sans perdre en lisibilité.
*/

export default function UserMenu({
  isGuest,
  onProfile,
  onHistory,
  onLogout,
  onHelp,
}) {
  const { user, profile } = useAuth()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  const displayName = isGuest
    ? 'Invité'
    : profile?.username || user?.displayName || user?.email?.split('@')[0] || 'Joueur'
  const initial = displayName.charAt(0).toUpperCase()
  const photoURL = !isGuest && (profile?.photoURL || user?.photoURL)

  // Fermeture au clic en dehors du menu
  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  function handleAction(action) {
    setOpen(false)
    action?.()
  }

  return (
    <div ref={menuRef} className="relative">
      {/* Trigger : avatar + pseudo */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 px-2 py-1.5 rounded-full
                   border border-white/10 hover:border-white/30
                   transition-colors cursor-pointer"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {/* Avatar : photo Google si dispo, sinon initiale dans un cercle coloré */}
        {photoURL ? (
          <img src={photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <span
            className={`
              w-8 h-8 rounded-full flex items-center justify-center
              font-display font-bold text-sm
              ${isGuest ? 'bg-accent-pink/20 text-accent-pink' : 'bg-accent-green/20 text-accent-green'}
            `}
          >
            {initial}
          </span>
        )}

        <div className="text-left hidden sm:block">
          <p className="text-[9px] uppercase tracking-[0.25em] text-text-tertiary">
            {isGuest ? (
              <>
                Mode{' '}
                <span className="serif-italic normal-case tracking-normal text-accent-pink">
                  invité
                </span>
              </>
            ) : (
              'Connecté'
            )}
          </p>
          <p className="font-display font-semibold text-sm text-text-primary truncate max-w-[120px]">
            {displayName}
          </p>
        </div>

        <span
          className={`
            text-text-tertiary text-xs ml-1 transition-transform duration-200
            ${open ? 'rotate-180' : ''}
          `}
        >
          ▾
        </span>
      </button>

      {/* Dropdown — note : pas de backdrop-blur (bug de hit-testing avec les
          conteneurs transformés via framer-motion). On compense avec un fond
          opaque (bg-bg-card sans alpha). */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="absolute top-full right-0 mt-2 w-60
                       bg-bg-card border border-white/10 rounded-2xl
                       shadow-2xl shadow-black/50
                       overflow-hidden z-50"
          >
            {!isGuest ? (
              <>
                <MenuHeader displayName={displayName} email={user?.email} />
                <MenuItem
                  number="01"
                  accent="text-accent-green"
                  label="Mon profil"
                  onClick={() => handleAction(onProfile)}
                />
                <MenuItem
                  number="02"
                  accent="text-accent-purple"
                  label="Mon historique"
                  onClick={() => handleAction(onHistory)}
                />
                {/* Séparateur + entrée d'aide. onHelp est facultatif (la
                    Home le passe ; d'autres écrans ne le passeront peut-être
                    pas) — on cache simplement l'entrée si absent. */}
                {onHelp && (
                  <>
                    <div className="border-t border-white/5" />
                    <MenuItem
                      number="03"
                      accent="text-text-secondary"
                      label="Comment jouer ?"
                      onClick={() => handleAction(onHelp)}
                    />
                  </>
                )}
                <div className="border-t border-white/5" />
                <MenuItem
                  number={onHelp ? '04' : '03'}
                  accent="text-accent-pink"
                  label="Se déconnecter"
                  onClick={() => handleAction(onLogout)}
                />
              </>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-white/5">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-text-tertiary mb-1">
                    Mode{' '}
                    <span className="serif-italic normal-case tracking-normal">
                      invité
                    </span>
                  </p>
                  <p className="text-sm text-text-secondary">
                    Tes parties ne sont pas sauvegardées.
                  </p>
                </div>
                {onHelp && (
                  <MenuItem
                    number="01"
                    accent="text-text-secondary"
                    label="Comment jouer ?"
                    onClick={() => handleAction(onHelp)}
                  />
                )}
                <MenuItem
                  number={onHelp ? '02' : '01'}
                  accent="text-accent-pink"
                  label="Quitter le mode invité"
                  onClick={() => handleAction(onLogout)}
                />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MenuHeader({ displayName, email }) {
  return (
    <div className="px-4 py-3 border-b border-white/5">
      <p className="text-[10px] uppercase tracking-[0.25em] text-text-tertiary mb-1">
        Connecté{' '}
        <span className="serif-italic normal-case tracking-normal">en tant que</span>
      </p>
      <p className="font-display font-semibold text-sm text-text-primary truncate">
        {displayName}
      </p>
      {email && (
        <p className="text-xs text-text-tertiary truncate mt-0.5">{email}</p>
      )}
    </div>
  )
}

function MenuItem({ number, accent, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group w-full flex items-center gap-3 px-4 py-3 text-left
                 hover:bg-white/[0.04] transition-colors cursor-pointer"
    >
      <span className={`serif-italic ${accent} text-sm w-6`}>{number}</span>
      <span className="font-medium text-sm text-text-primary">{label}</span>
      <span className="ml-auto text-text-tertiary text-xs group-hover:translate-x-1 transition-transform">
        →
      </span>
    </button>
  )
}
