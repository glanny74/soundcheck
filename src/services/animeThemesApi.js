/*
  Service d'accès à l'API AnimeThemes.moe — mode « Otaku ».
  ----------------------------------------------------------------------------
  Principe du mode : on fait écouter un opening d'anime et le joueur doit
  deviner DE QUEL ANIME il s'agit (et non le titre de la chanson).

  L'API est publique (aucune clé) et renvoie les bons en-têtes CORS, donc on
  l'appelle directement depuis le navigateur, sans proxy. (Rate limit ~90/min.)

  --------------------------------------------------------------------------
  Trois niveaux de difficulté (taille/obscurité du « réservoir » d'animes) :

   - Facile        : ~70 animes ultra-connus (haut du classement)
   - Intermédiaire : ~180 animes populaires (toute la liste curée)
   - Difficile     : tout le catalogue AnimeThemes (milliers d'animes, dont
                     beaucoup d'obscurs) → vrai défi d'otaku

  Pourquoi une liste curée pour Facile/Intermédiaire : AnimeThemes n'a aucune
  notion de popularité. La liste POPULAR_ANIME ci-dessous a été construite à
  partir du classement de popularité d'AniList (top ~300), puis chaque slug a
  été VALIDÉ contre AnimeThemes (audio dispo) et les doublons de franchise
  (saisons/films) retirés. L'ordre = ordre de popularité décroissante.
  --------------------------------------------------------------------------

  Format renvoyé : identique à un « titre » Deezer, pour réutiliser le moteur
  de jeu tel quel :
    { id, title (= nom de l'anime), artist:{name (= chanson)}, album:{cover_*}, preview }

  Mention légale (exigée par AnimeThemes), affichée côté UI (ModeSelect) :
    « Audio fourni par AnimeThemes.moe. Projet non commercial à des fins
      éducatives. »
*/

const API_BASE = 'https://api.animethemes.moe'

// Liste curée, classée par popularité décroissante (source : AniList).
const POPULAR_ANIME = [
  'shingeki_no_kyojin', 'kimetsu_no_yaiba', 'jujutsu_kaisen', 'death_note',
  'boku_no_hero_academia', 'one_punch_man', 'one_piece', 'tokyo_ghoul',
  'naruto', 'sword_art_online', 'kimi_no_na_wa', 'koe_no_katachi',
  'yakusoku_no_neverland', 'mob_psycho_100', 'chainsaw_man',
  'shigatsu_wa_kimi_no_uso', 'boku_dake_ga_inai_machi', 'haikyuu',
  'seishun_buta_yarou_wa_bunny_girl_senpai_no_yume_wo_minai', 'dr_stone',
  'violet_evergarden', 'no_game_no_life', 'noragami', 'toradora',
  'akame_ga_kill', 'vinland_saga', 'horimiya', 'nanatsu_no_taizai',
  'kono_subarashii_sekai_ni_shukufuku_wo', 'bleach', 'kiseijuu_sei_no_kakuritsu',
  'darling_in_the_franxx', 'code_geass_hangyaku_no_lelouch', 'enen_no_shouboutai',
  'sen_to_chihiro_no_kamikakushi', 'death_parade', 'cowboy_bebop',
  'ao_no_exorcist', 'sousou_no_frieren', 'tate_no_yuusha_no_nariagari',
  'kakegurui', 'tensei_shitara_slime_datta_ken', 'tokyo_revengers',
  'angel_beats', 'mushoku_tensei_isekai_ittara_honki_dasu',
  'youkoso_jitsuryoku_shijou_shugi_no_kyoushitsu_e', 'mirai_nikki', 'charlotte',
  'ore_dake_level_up_na_ken', 'bungou_stray_dogs', 'kill_la_kill',
  'sono_bisque_doll_wa_koi_wo_suru', 'made_in_abyss', 'overlord',
  'hataraku_maou_sama',
  'ano_hi_mita_hana_no_namae_wo_bokutachi_wa_mada_shiranai',
  'dungeon_ni_deai_wo_motomeru_no_wa_machigatteiru_darou_ka', 'soul_eater',
  'another', 'fairy_tail', 'tengen_toppa_gurren_lagann', 'dororo', 'dandadan',
  'kimi_no_suizou_wo_tabetai', 'cyberpunk_edgerunners', 'psycho_pass',
  'tenki_no_ko', 'hyouka', 'devilman_crybaby', 'jigokuraku',
  // ----- au-delà = Intermédiaire -----
  'chuunibyou_demo_koi_ga_shitai', 'bakemonogatari', 'monster',
  'owari_no_seraph', 'wotaku_ni_koi_wa_muzukashii', 'oshi_no_ko', 'blue_lock',
  'fumetsu_no_anata_e', 'high_school_dxd', 'banana_fish', 'kanojo_okarishimasu',
  'kusuriya_no_hitorigoto', 'kage_no_jitsuryokusha_ni_naritakute',
  'goblin_slayer', 'mononoke_hime', 'the_god_of_high_school', 'clannad',
  'durarara', 'gintama', 'kaguya_sama_wa_kokurasetai_ultra_romantic',
  'zankyou_no_terror', 'kaichou_wa_maid_sama', 'wonder_egg_priority',
  'kuroko_no_basket', 'kyoukai_no_kanata', 'mashle', 'samurai_champloo', 'k_on',
  'sakurasou_no_pet_na_kanojo', 'elfen_lied', 'yofukashi_no_uta', 'kaijuu_8_gou',
  'nisekoi', 'youjo_senki', 'ijiranaide_nagatoro_san', 'golden_time',
  'shokugeki_no_souma_ni_no_sara', 'kuroshitsuji', 'tonari_no_kaibutsu_kun',
  'beastars', 'mahouka_koukou_no_rettousei', 'bocchi_the_rock',
  'seishun_buta_yarou_wa_yumemiru_shoujo_no_yume_wo_minai', 'plastic_memories',
  'relife', 'dragon_ball_z', 'ouran_koukou_host_club', 'deadman_wonderland',
  'black_lagoon', 'byousoku_5_centimeter', 'serial_experiments_lain',
  'mushoku_tensei_ii_isekai_ittara_honki_dasu', 'kotonoha_no_niwa',
  'kimi_ni_todoke', 'prison_school', 'mahoutsukai_no_yome', 'date_a_live',
  'ao_haru_ride', 'tonikaku_kawaii', 'perfect_blue', 'rakudai_kishi_no_cavalry',
  'guilty_crown', 'masamune_kun_no_revenge', 'nichijou',
  'jibaku_shounen_hanako_kun', 'gachiakuta', 'log_horizon', 'sk',
  'zom_100_zombie_ni_naru_made_ni_shitai_100_no_koto', 'orange',
  'danganronpa_kibou_no_gakuen_to_zetsubou_no_koukousei_the_animation',
  'magi_the_labyrinth_of_magic', 'dragon_ball', 'great_pretender', 'grand_blue',
  'kekkai_sensen', 'shokugeki_no_souma_san_no_sara',
  'arifureta_shokugyou_de_sekai_saikyou', 'boruto_naruto_next_generations',
  'gekkan_shoujo_nozaki_kun', 'ousama_ranking', 'domestic_na_kanojo',
  'summer_time_render', 'dungeon_meshi', 'satsuriku_no_tenshi', 'akatsuki_no_yona',
  '3_gatsu_no_lion', 'sakamoto_days', 'given', 'kawaii_dake_ja_nai_shikimori_san',
  'tengoku_daimakyou', 'lycoris_recoil', 'flcl',
  'shimoneta_to_iu_gainen_ga_sonzai_shinai_taikutsu_na_sekai',
  'isekai_maou_to_shoukan_shoujo_no_dorei_majutsu', 'nana', 'hataraku_saibou',
  'kiznaiver', 'suzumiya_haruhi_no_yuuutsu', 'nhk_ni_youkoso',
  'rokudenashi_majutsu_koushi_to_akashic_records',
  'sekai_saikou_no_ansatsusha_isekai_kizoku_ni_tensei_suru',
  'shinchou_yuusha_kono_yuusha_ga_ore_tueee_kuse_ni_shinchou_sugiru',
  'yamada_kun_to_lv999_no_koi_wo_suru', 'trinity_seven', 'black_bullet',
  'tsurezure_children', 'suzume_no_tojimari',
  'gate_jieitai_kanochi_nite_kaku_tatakaeri', 'koutetsujou_no_kabaneri',
]

// Frontière du niveau Facile : on ne pioche que dans les N premiers (les plus
// connus). Au-delà = Intermédiaire (toute la liste).
const EASY_COUNT = 70

// Nombre d'animes piochés par partie (assez pour 15 manches, sans surcharger
// le réseau, et varié d'une partie à l'autre).
const PICK_PER_GAME = 24

const SLUG_INCLUDE =
  'images,animethemes.song,animethemes.animethemeentries.videos.audio'
const THEME_INCLUDE = 'anime.images,song,animethemeentries.videos.audio'

/** Mélange un tableau (Fisher-Yates), sans muter l'original. */
function shuffle(array) {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** Extrait l'URL de la pochette (grande de préférence) depuis anime.images. */
function pickCover(images) {
  const list = images || []
  return (
    list.find((i) => i.facet === 'Large Cover')?.link ||
    list.find((i) => i.facet === 'Small Cover')?.link ||
    list[0]?.link ||
    null
  )
}

/** Extrait la première URL audio exploitable d'un thème. */
function pickAudio(theme) {
  for (const entry of theme.animethemeentries || []) {
    for (const video of entry.videos || []) {
      if (video.audio?.link) return video.audio.link
    }
  }
  return null
}

/** Construit un objet « titre » du jeu à partir d'un anime + un de ses OP. */
function buildTrack(anime, theme) {
  const cover = pickCover(anime?.images)
  const audio = pickAudio(theme)
  if (!anime?.name || !cover || !audio) return null
  return {
    id: theme.id,
    title: anime.name,
    artist: { name: theme.song?.title || 'Opening' },
    album: { cover_xl: cover, cover_big: cover, cover_medium: cover },
    preview: audio,
    _animeId: anime.id,
  }
}

/**
 * Récupère un anime par son slug et le transforme en « titre » jouable (à
 * partir de son premier opening exploitable). Renvoie null en cas d'échec.
 * Utilisé pour les niveaux Facile/Intermédiaire (liste curée).
 */
async function fetchAnimeAsTrack(slug) {
  try {
    const url = `${API_BASE}/anime/${slug}?include=${encodeURIComponent(SLUG_INCLUDE)}`
    const response = await fetch(url)
    if (!response.ok) return null

    const { anime } = await response.json()
    if (!anime) return null

    const openings = (anime.animethemes || []).filter((t) => t.type === 'OP')
    for (const theme of openings) {
      const track = buildTrack(anime, theme)
      if (track) return track
    }
    return null
  } catch {
    return null
  }
}

/*
  Exécute `fn` sur chaque élément en limitant le nombre d'appels SIMULTANÉS.
  Indispensable ici : lancer 24 requêtes d'un coup fait échouer beaucoup de
  navigateurs mobiles (limite de connexions simultanées) et déclenche le
  rate-limit d'AnimeThemes. En limitant à quelques-unes à la fois, c'est fiable.
*/
async function mapWithConcurrency(items, fn, limit) {
  const results = new Array(items.length)
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++
      results[i] = await fn(items[i])
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, worker)
  await Promise.all(workers)
  return results
}

/** Dédoublonne une liste de « titres » par anime. */
function dedupByAnime(tracks) {
  return Array.from(new Map(tracks.map((t) => [t._animeId, t])).values())
}

/** Pioche dans une liste de slugs curés (Facile / Intermédiaire). */
async function getCuratedOpenings(slugs) {
  const picked = shuffle(slugs).slice(0, PICK_PER_GAME)
  // Concurrence limitée (5) pour rester fiable sur mobile.
  const results = await mapWithConcurrency(picked, fetchAnimeAsTrack, 5)
  let tracks = results.filter(Boolean)

  // Filet de secours : si trop de requêtes ont échoué (réseau mobile capricieux,
  // rate-limit...), on complète avec une pioche large (1 seule requête) pour
  // toujours pouvoir lancer une partie plutôt que d'afficher une erreur.
  if (tracks.length < 4) {
    try {
      const broad = await getBroadOpenings()
      tracks = dedupByAnime(tracks.concat(broad))
    } catch {
      // tant pis, on renvoie ce qu'on a
    }
  }

  return shuffle(tracks)
}

/**
 * Niveau Difficile : pioche dans TOUT le catalogue AnimeThemes via une page
 * aléatoire d'openings. Beaucoup d'animes obscurs → vrai défi. Une seule
 * requête (le endpoint /animetheme imbrique l'anime + l'audio).
 */
async function getBroadOpenings() {
  const page = Math.floor(Math.random() * 40) + 1
  const url =
    `${API_BASE}/animetheme` +
    `?include=${encodeURIComponent(THEME_INCLUDE)}` +
    `&filter[type]=OP&page[size]=100&page[number]=${page}`

  const response = await fetch(url)
  if (!response.ok) throw new Error(`Erreur AnimeThemes (${response.status})`)

  const data = await response.json()
  const themes = data.animethemes || []
  const tracks = themes.map((t) => buildTrack(t.anime, t)).filter(Boolean)

  // Un seul opening par anime
  const uniqueByAnime = Array.from(
    new Map(tracks.map((t) => [t._animeId, t])).values()
  )
  return shuffle(uniqueByAnime).slice(0, PICK_PER_GAME)
}

/**
 * Point d'entrée : renvoie un pool d'openings prêt à jouer, selon la difficulté.
 * @param {'easy'|'medium'|'hard'} difficulty
 */
export async function getAnimeOpenings(difficulty = 'easy') {
  if (difficulty === 'hard') {
    return getBroadOpenings()
  }
  const source =
    difficulty === 'medium' ? POPULAR_ANIME : POPULAR_ANIME.slice(0, EASY_COUNT)
  return getCuratedOpenings(source)
}
