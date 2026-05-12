import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import {
  AVAILABLE_GENRES,
  AVAILABLE_LANGUAGES,
  searchArtist,
} from '../services/deezerApi'
import {
  EASE_OUT,
  fadeUpChild,
  pageTransition,
  staggerContainer,
} from '../utils/motion'

/*
  Écran ModeSelect V2 — editorial magazine.
  ===========================================================================
  - Titre "02 / Choisissez un mode" avec "Choisissez" en italique serif
  - Grille asymétrique des 4 modes (taille variable selon importance) :
      * Artiste solo : grande, en haut-gauche (col-span-7, row-span-2)
      * Multi-artistes : moyenne, haut-droite (col-span-5)
      * Par genre : moyenne, milieu-droite (col-span-5)
      * Aléatoire : pleine largeur en bas, hauteur réduite
  - Chaque carte : numéro Instrument Serif géant en fond (01, 02, 03, 04)
  - Bloc config sous les cartes (slide-down, bordure top colorée)
  - Segmented control iOS pour le nombre de manches (capsule qui glisse)
  - CTA "Démarrer →" en bas à droite, style éditorial
*/

const MODES = [
  {
    id: 'artist',
    number: '01',
    label: 'Artiste solo',
    description: 'Tous les titres viennent d\'un seul artiste.',
    accent: 'purple',
    bg: 'bg-accent-purple/10',
    hoverBg: 'hover:bg-accent-purple/15',
    border: 'border-accent-purple',
    text: 'text-accent-purple',
  },
  {
    id: 'multi',
    number: '02',
    label: 'Multi-artistes',
    description: 'Mélange plusieurs catalogues.',
    accent: 'blue',
    bg: 'bg-accent-blue/10',
    hoverBg: 'hover:bg-accent-blue/15',
    border: 'border-accent-blue',
    text: 'text-accent-blue',
  },
  {
    id: 'genre',
    number: '03',
    label: 'Par genre',
    description: 'Un style musical, une langue.',
    accent: 'pink',
    bg: 'bg-accent-pink/10',
    hoverBg: 'hover:bg-accent-pink/15',
    border: 'border-accent-pink',
    text: 'text-accent-pink',
  },
  {
    id: 'random',
    number: '04',
    label: 'Aléatoire',
    description: 'Surprise totale.',
    accent: 'green',
    bg: 'bg-accent-green/10',
    hoverBg: 'hover:bg-accent-green/15',
    border: 'border-accent-green',
    text: 'text-accent-green',
  },
]

const ROUNDS_OPTIONS = [5, 10, 15]

export default function ModeSelect({ onStart, onBack }) {
  const [mode, setMode] = useState(null)
  const [rounds, setRounds] = useState(10)

  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)

  const [selectedArtists, setSelectedArtists] = useState([])
  const [selectedGenre, setSelectedGenre] = useState(null)
  const [selectedLanguage, setSelectedLanguage] = useState('all')

  const [error, setError] = useState('')

  // Recherche d'artiste avec debounce 350ms
  useEffect(() => {
    if (mode !== 'artist' && mode !== 'multi') return
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const results = await searchArtist(query)
        setSearchResults(results)
      } catch (err) {
        console.error('Erreur recherche artiste :', err)
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [query, mode])

  const handleModeChange = (newMode) => {
    setMode(newMode)
    setQuery('')
    setSearchResults([])
    setSelectedArtists([])
    setSelectedGenre(null)
    setSelectedLanguage('all')
    setError('')
  }

  const handleSelectArtist = (artist) => {
    if (mode === 'artist') {
      setSelectedArtists([artist])
      setQuery('')
      setSearchResults([])
    } else if (mode === 'multi') {
      if (selectedArtists.some((a) => a.id === artist.id)) return
      setSelectedArtists((prev) => [...prev, artist])
      setQuery('')
      setSearchResults([])
    }
  }

  const handleRemoveArtist = (id) => {
    setSelectedArtists((prev) => prev.filter((a) => a.id !== id))
  }

  const handleStart = () => {
    if (!mode) {
      setError('Choisis un mode de jeu.')
      return
    }
    if (mode === 'artist' && selectedArtists.length !== 1) {
      setError('Choisis un artiste pour ce mode.')
      return
    }
    if (mode === 'multi' && selectedArtists.length < 2) {
      setError('Sélectionne au moins 2 artistes.')
      return
    }
    if (mode === 'genre' && !selectedGenre) {
      setError('Choisis un genre.')
      return
    }

    onStart({
      mode,
      totalRounds: rounds,
      artists: selectedArtists,
      genre: selectedGenre,
      language: selectedLanguage,
    })
  }

  const currentMode = MODES.find((m) => m.id === mode)

  return (
    <motion.main
      key="mode_select"
      {...pageTransition}
      className="relative min-h-screen w-full overflow-hidden px-6 sm:px-10 py-8"
    >
      <div
        className="pointer-events-none absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-accent-pink/15 blur-[120px] animate-drift"
        aria-hidden="true"
      />

      {/* === Header === */}
      <header className="relative z-10 flex items-start justify-between gap-6">
        <button
          onClick={onBack}
          className="editorial-link group cursor-pointer text-text-secondary hover:text-text-primary text-sm"
        >
          <span className="arrow text-accent-pink text-xl leading-none rotate-180 inline-block">
            →
          </span>
          <span>Retour</span>
        </button>

        <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.3em]">
          <span className="text-text-secondary">01</span>
          <span className="text-text-tertiary">—</span>
          <span className="serif-italic normal-case tracking-normal text-accent-pink">
            02
          </span>
          <span className="text-text-tertiary">—</span>
          <span className="text-text-tertiary">03</span>
        </div>
      </header>

      {/* === Titre === */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="relative z-10 mt-10"
      >
        <motion.p
          variants={fadeUpChild}
          className="text-[11px] uppercase tracking-[0.3em] text-text-tertiary mb-4"
        >
          Étape{' '}
          <span className="serif-italic normal-case tracking-normal text-text-secondary">
            02
          </span>{' '}
          sur 03
        </motion.p>

        <motion.h1
          variants={fadeUpChild}
          className="font-display font-extrabold leading-[0.85] tracking-[-0.04em]
                     text-[56px] sm:text-[88px] lg:text-[120px]"
        >
          <span className="serif-italic text-accent-pink">Choisissez</span>{' '}
          <br className="sm:hidden" />
          <span className="text-text-primary">un mode.</span>
        </motion.h1>
      </motion.div>

      {/* === Grille asymétrique des 4 modes === */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="relative z-10 mt-12 grid grid-cols-12 gap-4 sm:gap-5"
      >
        {/* Artiste solo : grande, haut-gauche */}
        <ModeCard
          variants={fadeUpChild}
          mode={MODES[0]}
          selected={mode === 'artist'}
          onClick={() => handleModeChange('artist')}
          className="col-span-12 sm:col-span-7 row-span-2 min-h-[280px]"
          numberSize="text-[260px]"
        />

        {/* Multi-artistes : moyenne, haut-droite */}
        <ModeCard
          variants={fadeUpChild}
          mode={MODES[1]}
          selected={mode === 'multi'}
          onClick={() => handleModeChange('multi')}
          className="col-span-12 sm:col-span-5 min-h-[140px]"
          numberSize="text-[180px]"
        />

        {/* Genre : moyenne, milieu-droite */}
        <ModeCard
          variants={fadeUpChild}
          mode={MODES[2]}
          selected={mode === 'genre'}
          onClick={() => handleModeChange('genre')}
          className="col-span-12 sm:col-span-5 min-h-[140px]"
          numberSize="text-[180px]"
        />

        {/* Aléatoire : pleine largeur en bas */}
        <ModeCard
          variants={fadeUpChild}
          mode={MODES[3]}
          selected={mode === 'random'}
          onClick={() => handleModeChange('random')}
          className="col-span-12 min-h-[110px]"
          numberSize="text-[160px]"
          horizontal
        />
      </motion.div>

      {/* === Bloc config (slide-down avec bordure top colorée) === */}
      <AnimatePresence mode="wait">
        {mode && (
          <motion.div
            key={mode}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            className="relative z-10 mt-10 overflow-hidden"
          >
            <div
              className={`border-t-2 ${currentMode.border} pt-8`}
            >
              {(mode === 'artist' || mode === 'multi') && (
                <ArtistPicker
                  mode={mode}
                  query={query}
                  onQueryChange={setQuery}
                  results={searchResults}
                  searching={searching}
                  selected={selectedArtists}
                  onSelect={handleSelectArtist}
                  onRemove={handleRemoveArtist}
                  accentColor={currentMode.text}
                />
              )}

              {mode === 'genre' && (
                <GenrePicker
                  selectedGenre={selectedGenre}
                  onSelectGenre={setSelectedGenre}
                  selectedLanguage={selectedLanguage}
                  onSelectLanguage={setSelectedLanguage}
                />
              )}

              {mode === 'random' && (
                <p className="text-text-secondary text-sm">
                  <span className="serif-italic">Aucun paramètre.</span> On
                  pioche dans un large éventail de titres populaires.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === Sélecteur de manches (segmented control iOS) === */}
      <motion.div
        variants={fadeUpChild}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.3 }}
        className="relative z-10 mt-12"
      >
        <p className="text-[10px] uppercase tracking-[0.3em] text-text-tertiary mb-4">
          Nombre de manches
        </p>
        <SegmentedControl
          options={ROUNDS_OPTIONS}
          value={rounds}
          onChange={setRounds}
          renderOption={(n) => (
            <>
              <span className="font-display font-bold text-2xl tabular-nums">
                {n}
              </span>
              <span className="serif-italic text-text-tertiary text-sm ml-1.5">
                manches
              </span>
            </>
          )}
        />
      </motion.div>

      {/* === Erreur + CTA === */}
      <div className="relative z-10 mt-10 flex flex-col sm:flex-row justify-between items-center gap-6 pb-8">
        {error ? (
          <p className="text-accent-pink text-sm">
            <span className="serif-italic">erreur —</span> {error}
          </p>
        ) : (
          <div />
        )}

        <button
          onClick={handleStart}
          className="editorial-link group cursor-pointer font-display font-medium text-2xl text-text-primary"
        >
          <span>Démarrer la partie</span>
          <span className="arrow text-accent-green text-3xl leading-none">→</span>
        </button>
      </div>
    </motion.main>
  )
}

/* ============================================================ */
/* SOUS-COMPOSANTS                                               */
/* ============================================================ */

/* ----- Carte de mode : grand numéro italique en fond ----- */
function ModeCard({
  mode,
  selected,
  onClick,
  className = '',
  numberSize,
  horizontal = false,
  variants,
}) {
  return (
    <motion.button
      variants={variants}
      onClick={onClick}
      type="button"
      className={`
        group relative overflow-hidden text-left cursor-pointer
        rounded-2xl p-6 sm:p-8
        border transition-all duration-500
        ${className}
        ${
          selected
            ? `${mode.bg} ${mode.border} border-2`
            : `bg-bg-card ${mode.hoverBg} border-white/5 hover:border-white/15`
        }
      `}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Grand numéro italique en fond, transparent */}
      <span
        className={`
          absolute serif-italic leading-none
          ${numberSize}
          ${horizontal ? '-right-8 -bottom-12' : '-right-8 -bottom-20'}
          transition-colors duration-500 pointer-events-none
          ${selected ? `${mode.text} opacity-30` : 'text-white/[0.05] group-hover:text-white/[0.08]'}
        `}
        aria-hidden="true"
      >
        {mode.number}
      </span>

      {/* Contenu */}
      <div className={`relative ${horizontal ? 'flex items-center justify-between' : ''}`}>
        <div>
          <p
            className={`text-[10px] uppercase tracking-[0.3em] mb-3 transition-colors ${
              selected ? mode.text : 'text-text-tertiary'
            }`}
          >
            Mode{' '}
            <span className="serif-italic normal-case tracking-normal">
              n°{mode.number}
            </span>
          </p>
          <h3 className="font-display font-bold text-2xl sm:text-3xl text-text-primary leading-tight">
            {mode.label}
          </h3>
          <p className="mt-2 text-sm text-text-secondary leading-relaxed max-w-[300px]">
            {mode.description}
          </p>
        </div>
      </div>
    </motion.button>
  )
}

/* ----- Segmented control style iOS avec capsule glissante ----- */
function SegmentedControl({ options, value, onChange, renderOption }) {
  return (
    <div className="inline-flex bg-bg-elevated/60 backdrop-blur-sm border border-white/10 rounded-full p-1.5 gap-1">
      {options.map((opt) => {
        const active = value === opt
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className="relative px-6 py-2.5 cursor-pointer"
          >
            {active && (
              <motion.span
                layoutId="rounds-capsule"
                className="absolute inset-0 bg-bg-card rounded-full border border-white/10"
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                aria-hidden="true"
              />
            )}
            <span className="relative flex items-baseline">
              {renderOption ? renderOption(opt) : opt}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ----- Sélecteur d'artistes (mode artist + multi) ----- */
function ArtistPicker({
  mode,
  query,
  onQueryChange,
  results,
  searching,
  selected,
  onSelect,
  onRemove,
  accentColor,
}) {
  const multi = mode === 'multi'
  return (
    <div>
      <h3 className="font-display font-bold text-2xl mb-2">
        {multi ? (
          <>
            Choisis tes{' '}
            <span className="serif-italic text-text-secondary">artistes</span>.
          </>
        ) : (
          <>
            Un{' '}
            <span className="serif-italic text-text-secondary">artiste</span>{' '}
            unique.
          </>
        )}
      </h3>
      <p className="text-sm text-text-secondary mb-6">
        {multi
          ? 'Sélectionne au moins 2 artistes pour mélanger leurs catalogues.'
          : 'Tous les morceaux de la partie viendront de cet artiste.'}
      </p>

      {/* Input style ligne tracée (pas une boîte) */}
      <div className="flex items-baseline gap-4 border-b border-white/10 pb-3 focus-within:border-accent-blue transition-colors">
        <span className={`serif-italic ${accentColor} text-xl shrink-0`}>
          recherche
        </span>
        <input
          type="text"
          placeholder="Tape un nom d'artiste sur Deezer…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="flex-1 bg-transparent text-text-primary placeholder:text-text-tertiary
                     text-xl py-2 focus:outline-none font-medium"
        />
      </div>

      {/* Résultats */}
      {searching && (
        <p className="mt-4 text-sm text-text-tertiary">
          <span className="serif-italic">Recherche…</span>
        </p>
      )}
      {!searching && results.length > 0 && (
        <ul className="mt-4 space-y-1 max-h-64 overflow-y-auto">
          {results.map((a) => (
            <li
              key={a.id}
              onClick={() => onSelect(a)}
              className="flex items-center gap-4 p-2 rounded-lg hover:bg-white/[0.04] cursor-pointer transition-colors"
            >
              <img
                src={a.picture_medium || a.picture}
                alt=""
                className="w-12 h-12 rounded-full object-cover"
              />
              <span className="font-medium text-lg">{a.name}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Sélection */}
      {selected.length > 0 && (
        <div className="mt-8">
          <p className="text-[10px] uppercase tracking-[0.3em] text-text-tertiary mb-3">
            Sélectionnés{' '}
            <span className="serif-italic normal-case tracking-normal">
              ({selected.length})
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {selected.map((a) => (
              <button
                key={a.id}
                onClick={() => onRemove(a.id)}
                className="flex items-center gap-2 pl-1 pr-3 py-1
                           bg-bg-elevated border border-white/10 rounded-full
                           hover:border-accent-pink transition-colors cursor-pointer"
                title="Cliquer pour retirer"
              >
                <img
                  src={a.picture_small || a.picture}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover"
                />
                <span className="text-sm font-medium">{a.name}</span>
                <span className="text-text-tertiary text-xs">×</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ----- Sélecteur genre + langue ----- */
function GenrePicker({
  selectedGenre,
  onSelectGenre,
  selectedLanguage,
  onSelectLanguage,
}) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-display font-bold text-2xl mb-2">
          Langue des{' '}
          <span className="serif-italic text-text-secondary">morceaux</span>.
        </h3>
        <p className="text-sm text-text-secondary mb-5">
          Filtre les titres selon la langue principale.
        </p>
        <SegmentedControl
          options={AVAILABLE_LANGUAGES.map((l) => l.id)}
          value={selectedLanguage}
          onChange={onSelectLanguage}
          renderOption={(id) => {
            const lang = AVAILABLE_LANGUAGES.find((l) => l.id === id)
            return <span className="font-semibold">{lang.label}</span>
          }}
        />
      </div>

      <div>
        <h3 className="font-display font-bold text-2xl mb-2">
          Un{' '}
          <span className="serif-italic text-text-secondary">genre</span>.
        </h3>
        <p className="text-sm text-text-secondary mb-5">
          Les titres seront piochés dans ce style musical.
        </p>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_GENRES.map((g) => {
            const active = selectedGenre === g
            return (
              <button
                key={g}
                type="button"
                onClick={() => onSelectGenre(g)}
                className={`
                  px-5 py-2 rounded-full text-sm font-medium capitalize transition-all cursor-pointer
                  ${
                    active
                      ? 'bg-accent-pink text-white border border-accent-pink'
                      : 'bg-bg-elevated text-text-secondary hover:bg-bg-card border border-white/10'
                  }
                `}
              >
                {g}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
