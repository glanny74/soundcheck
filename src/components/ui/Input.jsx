/*
  Champ texte stylé. On l'utilise dans le formulaire des joueurs et dans
  la barre de recherche d'artistes.
  Le composant accepte un `label` optionnel, et transmet toutes les autres
  props (value, onChange, placeholder, type...) à l'input natif.
*/

export default function Input({ label, id, className = '', ...rest }) {
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="block mb-2 text-sm text-text-secondary font-medium"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={`
          w-full px-4 py-3 rounded-lg
          bg-bg-elevated text-text-primary
          border border-white/10
          placeholder:text-text-muted
          focus:outline-none focus:border-accent-green focus:ring-2 focus:ring-accent-green/30
          transition-all duration-150
          ${className}
        `}
        {...rest}
      />
    </div>
  )
}
