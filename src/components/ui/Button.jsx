/*
  Bouton réutilisable avec plusieurs "variantes" de style.
  On utilise les props pour configurer son apparence :
    - variant : 'primary' (vert), 'secondary' (gris foncé), 'ghost' (transparent)
    - size    : 'md' (défaut) ou 'lg' (grand bouton mis en avant)
    - fullWidth : true pour occuper toute la largeur du parent
  Tout le reste des props (onClick, type, disabled, children...) est transmis
  au <button> natif grâce au spread `...rest`.
*/

const VARIANTS = {
  primary:
    'bg-accent-green text-black hover:bg-accent-green-hover hover:scale-[1.02] active:scale-[0.98]',
  secondary:
    'bg-bg-elevated text-text-primary hover:bg-[#2e2e2e] border border-white/10',
  ghost:
    'bg-transparent text-text-secondary hover:text-text-primary hover:bg-white/5',
  danger:
    'bg-accent-pink text-white hover:opacity-90',
}

const SIZES = {
  md: 'px-5 py-2.5 text-sm rounded-lg',
  lg: 'px-8 py-4 text-base rounded-xl',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...rest
}) {
  const base =
    'font-semibold tracking-tight transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'

  return (
    <button
      className={`${base} ${VARIANTS[variant]} ${SIZES[size]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
