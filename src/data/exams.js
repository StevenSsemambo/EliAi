// ── UNEB Exam Centre Data ─────────────────────────────────────────
// Timetables + comprehensive mock tests organised by subject & level

// ── Official Timetables ──────────────────────────────────────────
export const EXAM_TIMETABLES = {
  UCE: {
    name: 'Uganda Certificate of Education (UCE)',
    level: 'S4', year: 2025, duration_days: 14,
    papers: [
      { id:'uce_math_p1', subject:'mathematics', paper:'Paper 1 — Algebra, Sets & Vectors',    date:'Oct 6',  start:'09:00', duration_mins:150 },
      { id:'uce_math_p2', subject:'mathematics', paper:'Paper 2 — Geometry, Stats & Calculus', date:'Oct 7',  start:'14:00', duration_mins:150 },
      { id:'uce_bio_p1',  subject:'biology',     paper:'Paper 1 — Theory',                     date:'Oct 8',  start:'09:00', duration_mins:120 },
      { id:'uce_bio_p2',  subject:'biology',     paper:'Paper 2 — Practical',                  date:'Oct 9',  start:'14:00', duration_mins:90  },
      { id:'uce_chem_p1', subject:'chemistry',   paper:'Paper 1 — Theory',                     date:'Oct 10', start:'09:00', duration_mins:120 },
      { id:'uce_chem_p2', subject:'chemistry',   paper:'Paper 2 — Practical',                  date:'Oct 13', start:'14:00', duration_mins:90  },
      { id:'uce_phy_p1',  subject:'physics',     paper:'Paper 1 — Theory',                     date:'Oct 14', start:'09:00', duration_mins:120 },
      { id:'uce_phy_p2',  subject:'physics',     paper:'Paper 2 — Practical',                  date:'Oct 15', start:'14:00', duration_mins:90  },
    ]
  },
  UACE: {
    name: 'Uganda Advanced Certificate of Education (UACE)',
    level: 'S6', year: 2025, duration_days: 16,
    papers: [
      { id:'uace_math_p1', subject:'mathematics', paper:'Pure Mathematics Paper 1',   date:'Nov 3',  start:'09:00', duration_mins:180 },
      { id:'uace_math_p2', subject:'mathematics', paper:'Pure Mathematics Paper 2',   date:'Nov 4',  start:'14:00', duration_mins:180 },
      { id:'uace_bio_p1',  subject:'biology',     paper:'Paper 1 — Theory',           date:'Nov 5',  start:'09:00', duration_mins:180 },
      { id:'uace_bio_p2',  subject:'biology',     paper:'Paper 2 — Practical',        date:'Nov 6',  start:'14:00', duration_mins:120 },
      { id:'uace_chem_p1', subject:'chemistry',   paper:'Paper 1 — Theory',           date:'Nov 7',  start:'09:00', duration_mins:180 },
      { id:'uace_chem_p2', subject:'chemistry',   paper:'Paper 2 — Practical',        date:'Nov 10', start:'14:00', duration_mins:120 },
      { id:'uace_phy_p1',  subject:'physics',     paper:'Paper 1 — Theory',           date:'Nov 11', start:'09:00', duration_mins:180 },
      { id:'uace_phy_p2',  subject:'physics',     paper:'Paper 2 — Practical',        date:'Nov 12', start:'14:00', duration_mins:120 },
    ]
  }
}

// ── Mock Test Definitions ─────────────────────────────────────────
// type: 'term' | 'full_mock' | 'past_paper' | 'topic_drill' | 'mixed'
// badge: short label shown on the card

function t(id, name, subject, level, mins, nq, topics, type, badge) {
  return { id, name, subject, level, duration_mins: mins, num_questions: nq, topics, type: type||'term', badge: badge||null }
}

export const MOCK_TESTS = [

  // ═══════════════════════════════════════════════════════
  //  MATHEMATICS
  // ═══════════════════════════════════════════════════════

  // ── S1 Mathematics ──
  t('math_s1_term1',   'S1 Term 1 — Numbers & Algebra',   'mathematics','S1',40,15, ['numbers','algebra','linear_equations','sets']),
  t('math_s1_term2',   'S1 Term 2 — Geometry & Ratio',    'mathematics','S1',40,15, ['geometry','mensuration','ratio_indices','commercial_arithmetic']),
  t('math_s1_term3',   'S1 Term 3 — Stats & Bearings',    'mathematics','S1',40,15, ['statistics_intro','bearings_scale_drawing','number_theory']),
  t('math_s1_mock1',   'S1 Mock Exam I',                  'mathematics','S1',60,25, ['numbers','algebra','geometry','sets','ratio_indices','commercial_arithmetic','bearings_scale_drawing','statistics_intro','mensuration','linear_equations','number_theory'],'full_mock'),
  t('math_s1_mock2',   'S1 Mock Exam II',                 'mathematics','S1',60,25, ['numbers','algebra','geometry','sets','ratio_indices','commercial_arithmetic','bearings_scale_drawing','statistics_intro','mensuration','linear_equations','number_theory'],'full_mock'),
  t('math_s1_drill_nums','Drill: Numbers & Indices',      'mathematics','S1',20,10, ['numbers','ratio_indices','number_theory'],'topic_drill','Drill'),
  t('math_s1_drill_geo', 'Drill: Geometry & Mensuration', 'mathematics','S1',20,10, ['geometry','mensuration'],'topic_drill','Drill'),
  t('math_s1_drill_alg', 'Drill: Algebra & Equations',   'mathematics','S1',20,10, ['algebra','linear_equations','sets'],'topic_drill','Drill'),

  // ── S2 Mathematics ──
  t('math_s2_term1',   'S2 Term 1 — Quadratics & Logs',   'mathematics','S2',45,18, ['quadratic','simultaneous','logarithms']),
  t('math_s2_term2',   'S2 Term 2 — Trig & Coordinates',  'mathematics','S2',45,18, ['trigonometry','coordinate_geometry','vectors_intro']),
  t('math_s2_term3',   'S2 Term 3 — Stats & Matrices',    'mathematics','S2',45,18, ['statistics','matrices_intro','vectors_2d']),
  t('math_s2_mock1',   'S2 Mock Exam I',                  'mathematics','S2',65,25, ['quadratic','trigonometry','statistics','simultaneous','matrices_intro','coordinate_geometry','logarithms','vectors_intro','vectors_2d'],'full_mock'),
  t('math_s2_mock2',   'S2 Mock Exam II',                 'mathematics','S2',65,25, ['quadratic','trigonometry','statistics','simultaneous','matrices_intro','coordinate_geometry','logarithms','vectors_intro','vectors_2d'],'full_mock'),
  t('math_s2_drill_quad','Drill: Quadratics & Simultaneous','mathematics','S2',20,10,['quadratic','simultaneous'],'topic_drill','Drill'),
  t('math_s2_drill_trig','Drill: Trigonometry',           'mathematics','S2',20,10, ['trigonometry'],'topic_drill','Drill'),
  t('math_s2_drill_coord','Drill: Coordinate Geometry',   'mathematics','S2',20,10, ['coordinate_geometry','vectors_intro','vectors_2d'],'topic_drill','Drill'),

  // ── S3 Mathematics ──
  t('math_s3_term1',   'S3 Term 1 — Functions & Calculus','mathematics','S3',50,20, ['functions','differentiation','integration']),
  t('math_s3_term2',   'S3 Term 2 — Earth & Sequences',   'mathematics','S3',50,20, ['earth_geometry','coordinate_sequences','matrices_probability']),
  t('math_s3_term3',   'S3 Term 3 — Linear Programming',  'mathematics','S3',45,18, ['linear_programming','coordinate_sequences']),
  t('math_s3_mock1',   'S3 Mock Exam I',                  'mathematics','S3',75,30, ['functions','coordinate_sequences','matrices_probability','earth_geometry','linear_programming','differentiation','integration'],'full_mock'),
  t('math_s3_mock2',   'S3 Mock Exam II',                 'mathematics','S3',75,30, ['functions','coordinate_sequences','matrices_probability','earth_geometry','linear_programming','differentiation','integration'],'full_mock'),
  t('math_s3_drill_calc','Drill: Differentiation & Integration','mathematics','S3',25,10,['differentiation','integration'],'topic_drill','Drill'),
  t('math_s3_drill_func','Drill: Functions & Sequences',  'mathematics','S3',20,10, ['functions','coordinate_sequences'],'topic_drill','Drill'),
  t('math_s3_drill_lp', 'Drill: Linear Programming',      'mathematics','S3',20,10, ['linear_programming'],'topic_drill','Drill'),

  // ── S4 Mathematics (UCE) ──
  t('math_s4_term1',   'S4 Term 1 — Calculus & Vectors',  'mathematics','S4',50,20, ['calculus','vectors','trigonometry_advanced']),
  t('math_s4_term2',   'S4 Term 2 — Permutations & Inequalities','mathematics','S4',50,20,['permcomb','inequalities','transformation_geometry']),
  t('math_s4_term3',   'S4 Term 3 — Financial & Loci',    'mathematics','S4',45,18, ['financial_maths','loci_construction']),
  t('math_s4_mock1',   'S4 UCE Mock Exam I',               'mathematics','S4',90,35, ['calculus','vectors','permcomb','inequalities','transformation_geometry','trigonometry_advanced','financial_maths','loci_construction'],'full_mock','UCE Mock'),
  t('math_s4_mock2',   'S4 UCE Mock Exam II',              'mathematics','S4',90,35, ['calculus','vectors','permcomb','inequalities','transformation_geometry','trigonometry_advanced','financial_maths','loci_construction'],'full_mock','UCE Mock'),
  t('math_s4_paper1',  'UCE Paper 1 Simulation',           'mathematics','S4',150,45,['algebra','sets','calculus','vectors','permcomb','inequalities','trigonometry_advanced'],'past_paper','Past Paper'),
  t('math_s4_paper2',  'UCE Paper 2 Simulation',           'mathematics','S4',150,45,['transformation_geometry','loci_construction','financial_maths','statistics','earth_geometry'],'past_paper','Past Paper'),
  t('math_s4_drill_calc','Drill: Calculus Mastery',        'mathematics','S4',30,12, ['calculus'],'topic_drill','Drill'),
  t('math_s4_drill_vec','Drill: Vectors & Transformation', 'mathematics','S4',25,10, ['vectors','transformation_geometry'],'topic_drill','Drill'),
  t('math_s4_drill_perm','Drill: Permutations & Combinations','mathematics','S4',20,10,['permcomb','inequalities'],'topic_drill','Drill'),

  // ── S5 Mathematics ──
  t('math_s5_term1',   'S5 Term 1 — Further Calculus',    'mathematics','S5',55,22, ['further_calculus','differential_equations']),
  t('math_s5_term2',   'S5 Term 2 — Complex Numbers',     'mathematics','S5',55,22, ['complex_numbers','numerical_methods']),
  t('math_s5_term3',   'S5 Term 3 — Mechanics & Probability','mathematics','S5',55,22,['mechanics','probability_advanced']),
  t('math_s5_mock1',   'S5 Mock Exam I',                  'mathematics','S5',90,32, ['further_calculus','differential_equations','complex_numbers','mechanics','numerical_methods','probability_advanced'],'full_mock'),
  t('math_s5_mock2',   'S5 Mock Exam II',                 'mathematics','S5',90,32, ['further_calculus','differential_equations','complex_numbers','mechanics','numerical_methods','probability_advanced'],'full_mock'),
  t('math_s5_drill_calc','Drill: Further Calculus',        'mathematics','S5',30,12, ['further_calculus','differential_equations'],'topic_drill','Drill'),
  t('math_s5_drill_cx', 'Drill: Complex Numbers',         'mathematics','S5',25,10, ['complex_numbers'],'topic_drill','Drill'),
  t('math_s5_drill_mech','Drill: Mechanics',              'mathematics','S5',25,10, ['mechanics'],'topic_drill','Drill'),

  // ── S6 Mathematics (UACE) ──
  t('math_s6_term1',   'S6 Term 1 — Pure Mathematics',    'mathematics','S6',65,25, ['pure_mathematics','further_pure','number_theory']),
  t('math_s6_term2',   'S6 Term 2 — Statistics & Probability','mathematics','S6',65,25,['statistics_probability']),
  t('math_s6_term3',   'S6 Term 3 — Applied Mathematics', 'mathematics','S6',65,25, ['applied_mathematics']),
  t('math_s6_mock1',   'S6 UACE Mock Exam I',             'mathematics','S6',120,42,['pure_mathematics','statistics_probability','applied_mathematics','further_pure','number_theory'],'full_mock','UACE Mock'),
  t('math_s6_mock2',   'S6 UACE Mock Exam II',            'mathematics','S6',120,42,['pure_mathematics','statistics_probability','applied_mathematics','further_pure','number_theory'],'full_mock','UACE Mock'),
  t('math_s6_paper1',  'UACE Pure Maths Paper 1 Sim',     'mathematics','S6',180,50,['pure_mathematics','further_pure','number_theory'],'past_paper','Past Paper'),
  t('math_s6_paper2',  'UACE Applied Maths Paper 2 Sim',  'mathematics','S6',180,50,['applied_mathematics','statistics_probability'],'past_paper','Past Paper'),
  t('math_s6_drill_pure','Drill: Pure Mathematics',       'mathematics','S6',35,14, ['pure_mathematics','further_pure'],'topic_drill','Drill'),
  t('math_s6_drill_stats','Drill: Statistics & Probability','mathematics','S6',30,12,['statistics_probability'],'topic_drill','Drill'),

  // ═══════════════════════════════════════════════════════
  //  BIOLOGY
  // ═══════════════════════════════════════════════════════

  // ── S1 Biology ──
  t('bio_s1_term1',    'S1 Term 1 — Cells & Classification','biology','S1',30,12, ['cells','classification']),
  t('bio_s1_term2',    'S1 Term 2 — Nutrition & Transport','biology','S1',30,12,  ['diffusion_osmosis','nutrition_plants_animals','movement_in_plants']),
  t('bio_s1_term3',    'S1 Term 3 — Photosynthesis & Respiration','biology','S1',30,12,['photosynthesis_respiration']),
  t('bio_s1_mock1',    'S1 Biology Mock Exam I',            'biology','S1',50,20, ['cells','classification','diffusion_osmosis','movement_in_plants','nutrition_plants_animals','photosynthesis_respiration'],'full_mock'),
  t('bio_s1_mock2',    'S1 Biology Mock Exam II',           'biology','S1',50,20, ['cells','classification','diffusion_osmosis','movement_in_plants','nutrition_plants_animals','photosynthesis_respiration'],'full_mock'),
  t('bio_s1_drill_cells','Drill: Cell Structure & Function','biology','S1',15,8,  ['cells','classification'],'topic_drill','Drill'),
  t('bio_s1_drill_photo','Drill: Photosynthesis & Respiration','biology','S1',15,8,['photosynthesis_respiration'],'topic_drill','Drill'),

  // ── S2 Biology ──
  t('bio_s2_term1',    'S2 Term 1 — Nutrition & Digestion','biology','S2',35,14, ['nutrition','digestion_ecology']),
  t('bio_s2_term2',    'S2 Term 2 — Transport & Gas Exchange','biology','S2',35,14,['transport','gaseous_exchange']),
  t('bio_s2_term3',    'S2 Term 3 — Nervous System & Reproduction','biology','S2',35,14,['nervous_system','reproduction']),
  t('bio_s2_mock1',    'S2 Biology Mock Exam I',            'biology','S2',55,22, ['transport','digestion_ecology','gaseous_exchange','nervous_system','nutrition','reproduction'],'full_mock'),
  t('bio_s2_mock2',    'S2 Biology Mock Exam II',           'biology','S2',55,22, ['transport','digestion_ecology','gaseous_exchange','nervous_system','nutrition','reproduction'],'full_mock'),
  t('bio_s2_drill_trans','Drill: Transport Systems',        'biology','S2',15,8,  ['transport'],'topic_drill','Drill'),
  t('bio_s2_drill_dig', 'Drill: Digestion & Ecology',       'biology','S2',15,8,  ['digestion_ecology'],'topic_drill','Drill'),

  // ── S3 Biology ──
  t('bio_s3_term1',    'S3 Term 1 — Genetics',             'biology','S3',40,16, ['genetics']),
  t('bio_s3_term2',    'S3 Term 2 — Homeostasis & Excretion','biology','S3',40,16,['hormones_homeostasis','excretion']),
  t('bio_s3_term3',    'S3 Term 3 — Support, Movement & Ecology','biology','S3',40,16,['support_and_movement','ecology','reproduction']),
  t('bio_s3_mock1',    'S3 Biology Mock Exam I',            'biology','S3',65,26, ['genetics','hormones_homeostasis','support_and_movement','ecology','excretion','reproduction'],'full_mock'),
  t('bio_s3_mock2',    'S3 Biology Mock Exam II',           'biology','S3',65,26, ['genetics','hormones_homeostasis','support_and_movement','ecology','excretion','reproduction'],'full_mock'),
  t('bio_s3_drill_gen', 'Drill: Genetics & Heredity',       'biology','S3',20,10, ['genetics'],'topic_drill','Drill'),
  t('bio_s3_drill_home','Drill: Homeostasis & Hormones',    'biology','S3',20,10, ['hormones_homeostasis','excretion'],'topic_drill','Drill'),

  // ── S4 Biology (UCE) ──
  t('bio_s4_term1',    'S4 Term 1 — Cell Division & Biotech','biology','S4',40,16,['cell_division','biotechnology']),
  t('bio_s4_term2',    'S4 Term 2 — Coordination & Health','biology','S4',40,16, ['coordination','disease_health']),
  t('bio_s4_term3',    'S4 Term 3 — Evolution & Ecology',  'biology','S4',40,16, ['evolution_immunity','ecology']),
  t('bio_s4_mock1',    'S4 UCE Biology Mock I',             'biology','S4',65,26, ['biotechnology','cell_division','coordination','disease_health','ecology','evolution_immunity'],'full_mock','UCE Mock'),
  t('bio_s4_mock2',    'S4 UCE Biology Mock II',            'biology','S4',65,26, ['biotechnology','cell_division','coordination','disease_health','ecology','evolution_immunity'],'full_mock','UCE Mock'),
  t('bio_s4_paper1',   'UCE Biology Paper 1 Simulation',    'biology','S4',120,40,['cells','diffusion_osmosis','photosynthesis_respiration','transport','digestion_ecology','genetics','hormones_homeostasis','gaseous_exchange','support_and_movement','biotechnology','evolution_immunity'],'past_paper','Past Paper'),
  t('bio_s4_drill_evo','Drill: Evolution & Immunity',       'biology','S4',20,10, ['evolution_immunity'],'topic_drill','Drill'),
  t('bio_s4_drill_bio','Drill: Biotechnology & Cell Division','biology','S4',20,10,['biotechnology','cell_division'],'topic_drill','Drill'),

  // ── S5 Biology ──
  t('bio_s5_term1',    'S5 Term 1 — Biochemistry',         'biology','S5',50,20, ['biochemistry','bioenergetics']),
  t('bio_s5_term2',    'S5 Term 2 — Advanced Cell Biology','biology','S5',50,20, ['cell_biology_advanced','genetics_advanced']),
  t('bio_s5_term3',    'S5 Term 3 — Microbiology & Ecology','biology','S5',50,20,['microbiology','ecology_advanced']),
  t('bio_s5_mock1',    'S5 Biology Mock Exam I',            'biology','S5',80,32, ['biochemistry','bioenergetics','cell_biology_advanced','genetics_advanced','microbiology','ecology_advanced'],'full_mock'),
  t('bio_s5_mock2',    'S5 Biology Mock Exam II',           'biology','S5',80,32, ['biochemistry','bioenergetics','cell_biology_advanced','genetics_advanced','microbiology','ecology_advanced'],'full_mock'),
  t('bio_s5_drill_gen','Drill: Advanced Genetics',          'biology','S5',25,10, ['genetics_advanced'],'topic_drill','Drill'),
  t('bio_s5_drill_bio','Drill: Biochemistry & Bioenergetics','biology','S5',25,10,['biochemistry','bioenergetics'],'topic_drill','Drill'),

  // ── S6 Biology (UACE) ──
  t('bio_s6_term1',    'S6 Term 1 — Molecular Biology',    'biology','S6',55,22, ['molecular_biology']),
  t('bio_s6_term2',    'S6 Term 2 — Immunology & Bioethics','biology','S6',55,22,['immunology','bioethics']),
  t('bio_s6_term3',    'S6 Term 3 — Developmental Biology','biology','S6',55,22, ['developmental_biology']),
  t('bio_s6_mock1',    'S6 UACE Biology Mock I',            'biology','S6',95,38, ['molecular_biology','immunology','developmental_biology','bioethics'],'full_mock','UACE Mock'),
  t('bio_s6_mock2',    'S6 UACE Biology Mock II',           'biology','S6',95,38, ['molecular_biology','immunology','developmental_biology','bioethics'],'full_mock','UACE Mock'),
  t('bio_s6_paper1',   'UACE Biology Paper 1 Simulation',   'biology','S6',180,50,['biochemistry','cell_biology_advanced','genetics_advanced','molecular_biology','immunology','developmental_biology','bioenergetics','bioethics'],'past_paper','Past Paper'),
  t('bio_s6_drill_mol','Drill: Molecular Biology',          'biology','S6',30,12, ['molecular_biology'],'topic_drill','Drill'),
  t('bio_s6_drill_imm','Drill: Immunology',                 'biology','S6',25,10, ['immunology'],'topic_drill','Drill'),

  // ═══════════════════════════════════════════════════════
  //  CHEMISTRY
  // ═══════════════════════════════════════════════════════

  // ── S1 Chemistry ──
  t('chem_s1_term1',   'S1 Term 1 — Atoms & Matter',       'chemistry','S1',30,12, ['atoms','matter']),
  t('chem_s1_term2',   'S1 Term 2 — Bonding & Water',      'chemistry','S1',30,12, ['bonding','water']),
  t('chem_s1_term3',   'S1 Term 3 — Separation Techniques','chemistry','S1',25,10, ['separation_techniques']),
  t('chem_s1_mock1',   'S1 Chemistry Mock Exam I',          'chemistry','S1',50,20, ['atoms','bonding','matter','separation_techniques','water'],'full_mock'),
  t('chem_s1_mock2',   'S1 Chemistry Mock Exam II',         'chemistry','S1',50,20, ['atoms','bonding','matter','separation_techniques','water'],'full_mock'),
  t('chem_s1_drill_atom','Drill: Atomic Structure',         'chemistry','S1',15,8,  ['atoms'],'topic_drill','Drill'),
  t('chem_s1_drill_bond','Drill: Chemical Bonding',         'chemistry','S1',15,8,  ['bonding'],'topic_drill','Drill'),

  // ── S2 Chemistry ──
  t('chem_s2_term1',   'S2 Term 1 — Acids & Periodic Table','chemistry','S2',35,14,['acids_periodic','reactions_metals']),
  t('chem_s2_term2',   'S2 Term 2 — Metals & Extraction',  'chemistry','S2',35,14, ['extraction_of_metals','energy_changes']),
  t('chem_s2_term3',   'S2 Term 3 — Moles & Gases',        'chemistry','S2',35,14, ['mole_calculations','gases_solutions']),
  t('chem_s2_mock1',   'S2 Chemistry Mock Exam I',          'chemistry','S2',55,22, ['acids_periodic','energy_changes','extraction_of_metals','gases_solutions','mole_calculations','reactions_metals'],'full_mock'),
  t('chem_s2_mock2',   'S2 Chemistry Mock Exam II',         'chemistry','S2',55,22, ['acids_periodic','energy_changes','extraction_of_metals','gases_solutions','mole_calculations','reactions_metals'],'full_mock'),
  t('chem_s2_drill_acid','Drill: Acids, Bases & Salts',     'chemistry','S2',15,8,  ['acids_periodic'],'topic_drill','Drill'),
  t('chem_s2_drill_mol','Drill: Mole Calculations',         'chemistry','S2',20,10, ['mole_calculations'],'topic_drill','Drill'),

  // ── S3 Chemistry ──
  t('chem_s3_term1',   'S3 Term 1 — Electrochemistry',     'chemistry','S3',40,16, ['electrochemistry','stoichiometry']),
  t('chem_s3_term2',   'S3 Term 2 — Organic Chemistry',    'chemistry','S3',40,16, ['organic_rates','gases']),
  t('chem_s3_term3',   'S3 Term 3 — Nitrogen Compounds',   'chemistry','S3',35,14, ['nitrogen_compounds']),
  t('chem_s3_mock1',   'S3 Chemistry Mock Exam I',          'chemistry','S3',65,26, ['electrochemistry','gases','nitrogen_compounds','organic_rates','stoichiometry'],'full_mock'),
  t('chem_s3_mock2',   'S3 Chemistry Mock Exam II',         'chemistry','S3',65,26, ['electrochemistry','gases','nitrogen_compounds','organic_rates','stoichiometry'],'full_mock'),
  t('chem_s3_drill_elec','Drill: Electrochemistry',         'chemistry','S3',20,10, ['electrochemistry'],'topic_drill','Drill'),
  t('chem_s3_drill_org','Drill: Organic Chemistry Intro',   'chemistry','S3',20,10, ['organic_rates'],'topic_drill','Drill'),

  // ── S4 Chemistry (UCE) ──
  t('chem_s4_term1',   'S4 Term 1 — Thermochemistry',      'chemistry','S4',40,16, ['thermochemistry','chemical_analysis']),
  t('chem_s4_term2',   'S4 Term 2 — Organic & Halogens',   'chemistry','S4',40,16, ['organic_chemistry','halogens']),
  t('chem_s4_term3',   'S4 Term 3 — Fuels & Combustion',   'chemistry','S4',35,14, ['fuels_combustion']),
  t('chem_s4_mock1',   'S4 UCE Chemistry Mock I',           'chemistry','S4',65,26, ['chemical_analysis','fuels_combustion','halogens','organic_chemistry','thermochemistry'],'full_mock','UCE Mock'),
  t('chem_s4_mock2',   'S4 UCE Chemistry Mock II',          'chemistry','S4',65,26, ['chemical_analysis','fuels_combustion','halogens','organic_chemistry','thermochemistry'],'full_mock','UCE Mock'),
  t('chem_s4_paper1',  'UCE Chemistry Paper 1 Simulation',  'chemistry','S4',120,40,['atoms','matter','bonding','acids_periodic','reactions_metals','electrochemistry','organic_rates','thermochemistry','separation_techniques','extraction_of_metals','nitrogen_compounds','fuels_combustion','halogens'],'past_paper','Past Paper'),
  t('chem_s4_drill_therm','Drill: Thermochemistry',         'chemistry','S4',20,10, ['thermochemistry'],'topic_drill','Drill'),
  t('chem_s4_drill_org','Drill: Organic Chemistry',         'chemistry','S4',20,10, ['organic_chemistry','halogens'],'topic_drill','Drill'),

  // ── S5 Chemistry ──
  t('chem_s5_term1',   'S5 Term 1 — Chemical Equilibrium', 'chemistry','S5',50,20, ['equilibria','equilibrium']),
  t('chem_s5_term2',   'S5 Term 2 — Advanced Organic',     'chemistry','S5',50,20, ['advanced_organic']),
  t('chem_s5_term3',   'S5 Term 3 — Transition Metals & Spectroscopy','chemistry','S5',50,20,['transition_metals','spectroscopy']),
  t('chem_s5_mock1',   'S5 Chemistry Mock Exam I',          'chemistry','S5',80,32, ['advanced_organic','equilibria','equilibrium','spectroscopy','transition_metals'],'full_mock'),
  t('chem_s5_mock2',   'S5 Chemistry Mock Exam II',         'chemistry','S5',80,32, ['advanced_organic','equilibria','equilibrium','spectroscopy','transition_metals'],'full_mock'),
  t('chem_s5_drill_eq','Drill: Equilibrium',                'chemistry','S5',25,10, ['equilibria','equilibrium'],'topic_drill','Drill'),
  t('chem_s5_drill_org','Drill: Advanced Organic',          'chemistry','S5',25,10, ['advanced_organic'],'topic_drill','Drill'),

  // ── S6 Chemistry (UACE) ──
  t('chem_s6_term1',   'S6 Term 1 — Industrial Chemistry', 'chemistry','S6',55,22, ['industrial_chemistry','green_chemistry']),
  t('chem_s6_term2',   'S6 Term 2 — Polymers & Pharmaceuticals','chemistry','S6',55,22,['polymers','pharmaceuticals']),
  t('chem_s6_term3',   'S6 Term 3 — Biochemistry & Halogens','chemistry','S6',55,22,['biochemistry','halogens']),
  t('chem_s6_mock1',   'S6 UACE Chemistry Mock I',          'chemistry','S6',95,38, ['biochemistry','green_chemistry','halogens','industrial_chemistry','pharmaceuticals','polymers'],'full_mock','UACE Mock'),
  t('chem_s6_mock2',   'S6 UACE Chemistry Mock II',         'chemistry','S6',95,38, ['biochemistry','green_chemistry','halogens','industrial_chemistry','pharmaceuticals','polymers'],'full_mock','UACE Mock'),
  t('chem_s6_paper1',  'UACE Chemistry Paper 1 Simulation', 'chemistry','S6',180,50,['advanced_organic','transition_metals','spectroscopy','polymers','pharmaceuticals','green_chemistry','industrial_chemistry'],'past_paper','Past Paper'),
  t('chem_s6_drill_poly','Drill: Polymers & Pharmaceuticals','chemistry','S6',25,10,['polymers','pharmaceuticals'],'topic_drill','Drill'),
  t('chem_s6_drill_ind','Drill: Industrial Chemistry',      'chemistry','S6',25,10, ['industrial_chemistry','green_chemistry'],'topic_drill','Drill'),

  // ═══════════════════════════════════════════════════════
  //  PHYSICS
  // ═══════════════════════════════════════════════════════

  // ── S1 Physics ──
  t('phy_s1_term1',    'S1 Term 1 — Measurement & Forces', 'physics','S1',30,12, ['measurement','forces','properties_matter']),
  t('phy_s1_term2',    'S1 Term 2 — Energy & Machines',    'physics','S1',30,12, ['energy','simple_machines','density_flotation']),
  t('phy_s1_term3',    'S1 Term 3 — Light',                'physics','S1',25,10, ['light']),
  t('phy_s1_mock1',    'S1 Physics Mock Exam I',            'physics','S1',50,20, ['density_flotation','energy','forces','light','measurement','properties_matter','simple_machines'],'full_mock'),
  t('phy_s1_mock2',    'S1 Physics Mock Exam II',           'physics','S1',50,20, ['density_flotation','energy','forces','light','measurement','properties_matter','simple_machines'],'full_mock'),
  t('phy_s1_drill_force','Drill: Forces & Motion',          'physics','S1',15,8,  ['forces','measurement'],'topic_drill','Drill'),
  t('phy_s1_drill_energy','Drill: Energy & Machines',       'physics','S1',15,8,  ['energy','simple_machines'],'topic_drill','Drill'),

  // ── S2 Physics ──
  t('phy_s2_term1',    'S2 Term 1 — Electricity',          'physics','S2',35,14, ['current_electricity','waves_electricity']),
  t('phy_s2_term2',    'S2 Term 2 — Magnetism & Heat',     'physics','S2',35,14, ['magnetism_heat','heat_transfer']),
  t('phy_s2_term3',    'S2 Term 3 — Sound & Electronics',  'physics','S2',35,14, ['sound','electronics']),
  t('phy_s2_mock1',    'S2 Physics Mock Exam I',            'physics','S2',55,22, ['current_electricity','electronics','heat_transfer','magnetism_heat','sound','waves_electricity'],'full_mock'),
  t('phy_s2_mock2',    'S2 Physics Mock Exam II',           'physics','S2',55,22, ['current_electricity','electronics','heat_transfer','magnetism_heat','sound','waves_electricity'],'full_mock'),
  t('phy_s2_drill_elec','Drill: Current Electricity',       'physics','S2',15,8,  ['current_electricity','waves_electricity'],'topic_drill','Drill'),
  t('phy_s2_drill_heat','Drill: Heat Transfer',             'physics','S2',15,8,  ['magnetism_heat','heat_transfer'],'topic_drill','Drill'),

  // ── S3 Physics ──
  t('phy_s3_term1',    'S3 Term 1 — Kinematics',           'physics','S3',40,16, ['kinematics','motion_kinematics']),
  t('phy_s3_term2',    'S3 Term 2 — Electromagnetism',     'physics','S3',40,16, ['electromagnetic','pressure_fluids']),
  t('phy_s3_term3',    'S3 Term 3 — Radioactivity',        'physics','S3',35,14, ['radioactivity']),
  t('phy_s3_mock1',    'S3 Physics Mock Exam I',            'physics','S3',65,26, ['electromagnetic','kinematics','motion_kinematics','pressure_fluids','radioactivity'],'full_mock'),
  t('phy_s3_mock2',    'S3 Physics Mock Exam II',           'physics','S3',65,26, ['electromagnetic','kinematics','motion_kinematics','pressure_fluids','radioactivity'],'full_mock'),
  t('phy_s3_drill_kine','Drill: Kinematics & Motion',       'physics','S3',20,10, ['kinematics','motion_kinematics'],'topic_drill','Drill'),
  t('phy_s3_drill_rad','Drill: Radioactivity',              'physics','S3',20,10, ['radioactivity'],'topic_drill','Drill'),

  // ── S4 Physics (UCE) ──
  t('phy_s4_term1',    'S4 Term 1 — Circular Motion & Gravity','physics','S4',40,16,['circular_gravitation']),
  t('phy_s4_term2',    'S4 Term 2 — AC Circuits & Electricity','physics','S4',40,16,['ac_circuits','electricity_detail']),
  t('phy_s4_term3',    'S4 Term 3 — Optics & Electronics', 'physics','S4',40,16, ['optics_full','electronics']),
  t('phy_s4_mock1',    'S4 UCE Physics Mock I',             'physics','S4',65,26, ['ac_circuits','circular_gravitation','electricity_detail','electronics','optics_full'],'full_mock','UCE Mock'),
  t('phy_s4_mock2',    'S4 UCE Physics Mock II',            'physics','S4',65,26, ['ac_circuits','circular_gravitation','electricity_detail','electronics','optics_full'],'full_mock','UCE Mock'),
  t('phy_s4_paper1',   'UCE Physics Paper 1 Simulation',    'physics','S4',120,40,['measurement','forces','energy','light','waves_electricity','magnetism_heat','electromagnetic','radioactivity','circular_gravitation','simple_machines','heat_transfer','ac_circuits'],'past_paper','Past Paper'),
  t('phy_s4_drill_circ','Drill: Circular Motion & Gravity', 'physics','S4',20,10, ['circular_gravitation'],'topic_drill','Drill'),
  t('phy_s4_drill_opt','Drill: Optics',                     'physics','S4',20,10, ['optics_full'],'topic_drill','Drill'),
  t('phy_s4_drill_ac', 'Drill: AC Circuits',                'physics','S4',20,10, ['ac_circuits','electricity_detail'],'topic_drill','Drill'),

  // ── S5 Physics ──
  t('phy_s5_term1',    'S5 Term 1 — Advanced Mechanics',   'physics','S5',50,20, ['mechanics_advanced','thermal_physics']),
  t('phy_s5_term2',    'S5 Term 2 — Waves & Optics',       'physics','S5',50,20, ['waves_optics','optics_full']),
  t('phy_s5_term3',    'S5 Term 3 — Nuclear & Semiconductors','physics','S5',50,20,['nuclear_physics','semiconductor_physics']),
  t('phy_s5_mock1',    'S5 Physics Mock Exam I',            'physics','S5',80,32, ['mechanics_advanced','nuclear_physics','optics_full','semiconductor_physics','thermal_physics','waves_optics'],'full_mock'),
  t('phy_s5_mock2',    'S5 Physics Mock Exam II',           'physics','S5',80,32, ['mechanics_advanced','nuclear_physics','optics_full','semiconductor_physics','thermal_physics','waves_optics'],'full_mock'),
  t('phy_s5_drill_mech','Drill: Advanced Mechanics',        'physics','S5',25,10, ['mechanics_advanced'],'topic_drill','Drill'),
  t('phy_s5_drill_nuke','Drill: Nuclear Physics',           'physics','S5',25,10, ['nuclear_physics'],'topic_drill','Drill'),

  // ── S6 Physics (UACE) ──
  t('phy_s6_term1',    'S6 Term 1 — Modern Physics',       'physics','S6',55,22, ['modern_physics','quantum_mechanics']),
  t('phy_s6_term2',    'S6 Term 2 — Astrophysics & Relativity','physics','S6',55,22,['astrophysics','relativity']),
  t('phy_s6_term3',    'S6 Term 3 — Particle Physics',     'physics','S6',55,22, ['particle_physics']),
  t('phy_s6_mock1',    'S6 UACE Physics Mock I',            'physics','S6',95,38, ['astrophysics','modern_physics','particle_physics','quantum_mechanics','relativity'],'full_mock','UACE Mock'),
  t('phy_s6_mock2',    'S6 UACE Physics Mock II',           'physics','S6',95,38, ['astrophysics','modern_physics','particle_physics','quantum_mechanics','relativity'],'full_mock','UACE Mock'),
  t('phy_s6_paper1',   'UACE Physics Paper 1 Simulation',   'physics','S6',180,50,['mechanics_advanced','thermal_physics','waves_optics','modern_physics','quantum_mechanics','astrophysics','semiconductor_physics','nuclear_physics','particle_physics','relativity'],'past_paper','Past Paper'),
  t('phy_s6_drill_quant','Drill: Quantum & Modern Physics', 'physics','S6',30,12, ['quantum_mechanics','modern_physics'],'topic_drill','Drill'),
  t('phy_s6_drill_astro','Drill: Astrophysics',             'physics','S6',25,10, ['astrophysics','relativity'],'topic_drill','Drill'),

  // ═══════════════════════════════════════════════════════
  //  MIXED / ALL-SUBJECTS
  // ═══════════════════════════════════════════════════════
  t('mixed_s1_eoy',    'S1 End-of-Year Combined Exam',     'all','S1',120,40, ['all'],'mixed'),
  t('mixed_s2_eoy',    'S2 End-of-Year Combined Exam',     'all','S2',120,40, ['all'],'mixed'),
  t('mixed_s3_eoy',    'S3 End-of-Year Combined Exam',     'all','S3',120,40, ['all'],'mixed'),
  t('mixed_s4_uce',    'S4 Full UCE Combined Practice',    'all','S4',180,60, ['all'],'mixed','UCE Mock'),
  t('mixed_s5_eoy',    'S5 End-of-Year Combined Exam',     'all','S5',150,50, ['all'],'mixed'),
  t('mixed_s6_uace',   'S6 Full UACE Combined Practice',   'all','S6',180,60, ['all'],'mixed','UACE Mock'),
]

// ── Lookup helpers ────────────────────────────────────────────────

export function getMockTestsForLevel(classLevel) {
  const lvl = classLevel?.toString().toUpperCase().replace(/^(\d)$/, 'S$1')
  return MOCK_TESTS.filter(t => t.level === lvl || t.level === 'all')
}

export function getTestsBySubjectAndLevel(subject, classLevel) {
  const lvl = classLevel?.toString().toUpperCase().replace(/^(\d)$/, 'S$1')
  return MOCK_TESTS.filter(t =>
    (subject === 'all' ? true : t.subject === subject || t.subject === 'all') &&
    (t.level === lvl || t.level === 'all')
  )
}

export function getExamForStudent(classLevel) {
  const level = classLevel?.toString()
  if (level === 'S4' || level === '4') return EXAM_TIMETABLES.UCE
  if (level === 'S6' || level === '6') return EXAM_TIMETABLES.UACE
  return null
}

export const TEST_TYPE_META = {
  term:       { label: 'Term Test',    icon: '📝', color: '#64748B' },
  full_mock:  { label: 'Full Mock',    icon: '🎯', color: '#F59E0B' },
  past_paper: { label: 'Past Paper',   icon: '🏛',  color: '#8B5CF6' },
  topic_drill:{ label: 'Topic Drill',  icon: '⚡',  color: '#10B981' },
  mixed:      { label: 'Mixed Exam',   icon: '📚',  color: '#3B82F6' },
}

export const SUBJECT_META = {
  mathematics: { icon: '📐', color: '#3B82F6', grad: 'from-blue-600/25 to-blue-700/10',   border: 'rgba(59,130,246,0.25)'  },
  biology:     { icon: '🧬', color: '#10B981', grad: 'from-green-600/25 to-green-700/10', border: 'rgba(16,185,129,0.25)'  },
  chemistry:   { icon: '🧪', color: '#8B5CF6', grad: 'from-violet-600/25 to-violet-700/10',border:'rgba(139,92,246,0.25)'  },
  physics:     { icon: '⚡', color: '#F59E0B', grad: 'from-amber-600/25 to-amber-700/10', border: 'rgba(245,158,11,0.25)'  },
  all:         { icon: '📚', color: '#EC4899', grad: 'from-pink-600/25 to-pink-700/10',   border: 'rgba(236,72,153,0.25)'  },
}
