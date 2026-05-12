/*
  Conteneur "Carte" stylé. On l'utilise pour les cartes de mode, les blocs
  de score, l'affichage de la pochette de fin de question, etc.
  La prop `hover` active un effet de hover (élévation + scale léger).
  La prop `selected` met en avant la carte (bordure colorée).
  La prop `accent` change la couleur d'accent (vert/violet/rose/bleu).
*/

const ACCENT_BORDER = {
  green: 'border-accent-green',
  purple: 'border-accent-purple',
  pink: 'border-accent-pink',
  blue: 'border-accent-blue',
}

export default function Card({
  children,
  hover = false,
  selected = false,
  accent = 'green',
  className = '',
  ...rest
}) {
  const base = 'bg-bg-card rounded-2xl border transition-all duration-200'
  const hoverStyles = hover
    ? 'cursor-pointer hover:scale-[1.02] hover:bg-[#1f1f1f]'
    : ''
  const borderStyles = selected
    ? `${ACCENT_BORDER[accent]} border-2`
    : 'border-white/5'

  return (
    <div
      className={`${base} ${borderStyles} ${hoverStyles} ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
