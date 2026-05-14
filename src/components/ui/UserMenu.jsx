import { useAuth } from '../../hooks/useAuth'

/*
  UserMenu — bandeau d'identité (avatar + pseudo) en haut à droite.
  ---------------------------------------------------------------------------
  Note historique : ce composant exposait initialement une dropdown avec
  Mon profil / Historique / Classement / Se déconnecter. Les clics sur les
  items de la dropdown ne déclenchaient jamais leur onClick (bug en cours
  d'investigation — voir mémoire projet). En attendant le fix, la dropdown
  est retirée et les 4 actions sont exposées via des liens éditoriaux dans
  Home.jsx directement, juste en dessous de ce bandeau.

  Ne pas remettre de dropdown ici tant que le bug n'est pas résolu.
*/

export default function UserMenu({ isGuest }) {
  const { user, profile } = useAuth()

  const displayName = isGuest
    ? 'Invité'
    : profile?.username || user?.displayName || user?.email?.split('@')[0] || 'Joueur'
  const initial = displayName.charAt(0).toUpperCase()
  const photoURL = !isGuest && (profile?.photoURL || user?.photoURL)

  return (
    <div
      className="flex items-center gap-3 px-2 py-1.5 rounded-full border border-white/10"
    >
      {/* Avatar : photo Google si dispo, sinon initiale dans un cercle coloré */}
      {photoURL ? (
        <img
          src={photoURL}
          alt=""
          className="w-8 h-8 rounded-full object-cover"
        />
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
        <p className="font-display font-semibold text-sm text-text-primary truncate max-w-[160px]">
          {displayName}
        </p>
      </div>
    </div>
  )
}
