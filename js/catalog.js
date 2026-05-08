// Catalog of missions and terrain sets — single source of truth.
// Board canvas is 1524 x 1125 px (matches the original Kill Team app).

export const BOARD_WIDTH = 1524;
export const BOARD_HEIGHT = 1125;

export const MISSIONS = [
  { id: "map-op-1",     label: "Map - 1",                img: "img/missions/map-op-1.png" },
  { id: "map-op-2",     label: "Map - 2",                img: "img/missions/map-op-2.png" },
  { id: "map-op-3",     label: "Map - 3",                img: "img/missions/map-op-3.png" },
  { id: "map-op-4",     label: "Map - 4",                img: "img/missions/map-op-4.png" },
  { id: "map-op-5",     label: "Map - 5",                img: "img/missions/map-op-5.png" },
  { id: "map-op-6",     label: "Map - 6",                img: "img/missions/map-op-6.png" },
  { id: "map-cq-short", label: "Close Quarters - Short", img: "img/missions/map-cq-short.png" },
  { id: "map-cq-long",  label: "Close Quarters - Long",  img: "img/missions/map-cq-long.png" },
  { id: "narrative",    label: "Narrative",              img: "img/missions/narrative.png" },
];

// All 106 terrain pieces across 9 sets.
// Piece IDs follow {set}_{category}_{number}; categories:
//   b=barricade, m=medium, lr=large-ruin, sr=small-ruin, obs=obstacle,
//   v=vehicle, g=generator, t=tower, p=platform, s=structure, a=aux,
//   c=container, z=zone-marker.
// Image files are PNGs at img/terrain/{id}.png.

const VOLKUS = [
  "volkus_lr_1","volkus_lr_2",
  "volkus_obs_1","volkus_obs_2","volkus_obs_3","volkus_obs_4","volkus_obs_5",
  "volkus_sr_1","volkus_sr_2",
  "volkus_v_1","volkus_v_2",
];
const OCTARIUS = [
  "octarius_b_1","octarius_b_2","octarius_b_3","octarius_b_4",
  "octarius_g_1",
  "octarius_m_1","octarius_m_2","octarius_m_3",
  "octarius_p_1","octarius_p_2","octarius_p_3",
  "octarius_t_1","octarius_t_2","octarius_t_3",
];
const CHALNATH = [
  "chalnath_b_1","chalnath_b_2",
  "chalnath_m_1","chalnath_m_2","chalnath_m_3","chalnath_m_4","chalnath_m_5","chalnath_m_6",
];
const MOROCH = [
  "moroch_a_1","moroch_a_2",
  "moroch_b_1","moroch_b_2",
  "moroch_m_1","moroch_m_2","moroch_m_3",
];
const NACHMUNT = [
  "nachmunt_b_1","nachmunt_b_2",
  "nachmunt_g_1",
  "nachmunt_s_1","nachmunt_s_2",
  "nachmunt_t_1","nachmunt_t_2","nachmunt_t_3","nachmunt_t_4","nachmunt_t_5","nachmunt_t_6","nachmunt_t_7",
];
const WTC = [
  "wtc_b_1","wtc_b_2","wtc_b_3","wtc_b_4","wtc_b_5","wtc_b_6",
  "wtc_c_2",
  "wtc_m_1","wtc_m_2","wtc_m_3","wtc_m_4","wtc_m_5","wtc_m_6","wtc_m_7","wtc_m_8","wtc_m_9","wtc_m_10",
  "wtc_p_1",
];
const GALLOWDARK = [
  "gallowdark_a_1","gallowdark_a_2","gallowdark_a_3","gallowdark_a_4",
  "gallowdark_b_1","gallowdark_b_2","gallowdark_b_3",
  "gallowdark_s_1","gallowdark_s_2","gallowdark_s_3","gallowdark_s_4",
  "gallowdark_z",
];
const TOMB_WORLD = [
  "tomb_world_a_1","tomb_world_a_2","tomb_world_a_3","tomb_world_a_4",
  "tomb_world_b_1","tomb_world_b_2","tomb_world_b_3","tomb_world_b_4",
  "tomb_world_c_1","tomb_world_c_2","tomb_world_c_3","tomb_world_c_4","tomb_world_c_5",
  "tomb_world_s_1","tomb_world_s_2",
  "tomb_world_t",
];
const OTHERS = [
  "others_a_1",
  "others_b_1","others_b_2","others_b_3","others_b_4","others_b_5",
  "others_m_1",
  "others_t_1",
];

export const TERRAIN_SETS = [
  { id: "volkus",     label: "Volkus",     pieces: VOLKUS     },
  { id: "octarius",   label: "Octarius",   pieces: OCTARIUS   },
  { id: "chalnath",   label: "Chalnath",   pieces: CHALNATH   },
  { id: "moroch",     label: "Moroch",     pieces: MOROCH     },
  { id: "nachmunt",   label: "Nachmund",   pieces: NACHMUNT   },
  { id: "wtc",        label: "WTC",        pieces: WTC        },
  { id: "gallowdark", label: "Gallowdark", pieces: GALLOWDARK },
  { id: "tomb_world", label: "Tomb World", pieces: TOMB_WORLD },
  { id: "others",     label: "Others",     pieces: OTHERS     },
];

export function findMission(id) {
  return MISSIONS.find(m => m.id === id) || MISSIONS[0];
}
export function findTerrainSet(id) {
  return TERRAIN_SETS.find(t => t.id === id) || TERRAIN_SETS[0];
}
export function pieceImagePath(src, ext = "png") {
  return `img/terrain/${src}.${ext}`;
}
