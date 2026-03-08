/**
 * ELIMU LEARN — INTELLIGENT RULE-BASED AI  v3.0
 * ─────────────────────────────────────────────────────────────────
 * 100% offline. Works on all devices.
 *
 * v3 upgrades over v2:
 *   ✅ ALL 100+ curriculum files indexed (was ~20 before)
 *   ✅ Probability, simultaneous equations, logarithms, etc. all work now
 *   ✅ Multi-file search: tries every level (s1→s6) for each subject
 *   ✅ Keyword index built from actual file paths — never misses a file
 *   ✅ Conversation memory across messages
 *   ✅ Follow-up handling: "tell me more", "simpler", "another example", "why?"
 *   ✅ Real calculation solver for physics/chemistry problems
 *   ✅ Fuzzy matching catches typos
 *   ✅ Smart fallback — suggests closest match
 *   ✅ Quiz streak encouragement
 *   ✅ Exam tips per topic
 */

// ═══════════════════════════════════════════════════════════════════
// COMPLETE CURRICULUM INDEX
// Maps every keyword → { subject, file, level, title }
// Built from the actual file structure on disk
// ═══════════════════════════════════════════════════════════════════

const CURRICULUM_INDEX = [
  // ── MATHEMATICS ─────────────────────────────────────────────────
  { file:'algebra',             subject:'mathematics', level:'s1', title:'Algebra Basics',
    keys:['algebra','variable','expression','coefficient','like terms','simplify','expand','linear','solve for x'] },
  { file:'linear_equations',    subject:'mathematics', level:'s1', title:'Linear Equations',
    keys:['linear equation','solve for x','inequality','one variable','unknown'] },
  { file:'geometry',            subject:'mathematics', level:'s1', title:'Geometry & Measurement',
    keys:['geometry','angle','triangle','circle','polygon','parallel','perpendicular','rhombus','trapezium','congruent','quadrilateral','shape'] },
  { file:'mensuration',         subject:'mathematics', level:'s1', title:'Mensuration',
    keys:['mensuration','area','volume','perimeter','surface area','circumference','arc length','sector','cylinder','cone','sphere'] },
  { file:'number_theory',       subject:'mathematics', level:'s1', title:'Number Theory',
    keys:['factor','multiple','hcf','lcm','highest common factor','prime','composite','divisor','divisibility'] },
  { file:'numbers',             subject:'mathematics', level:'s1', title:'Real Numbers',
    keys:['real number','integer','fraction','decimal','percentage','irrational','rational','number line','directed number'] },
  { file:'ratio_indices',       subject:'mathematics', level:'s1', title:'Ratio, Proportion & Indices',
    keys:['ratio','proportion','indices','index notation','standard form','surd','power','root','square root'] },
  { file:'sets',                subject:'mathematics', level:'s1', title:'Sets & Venn Diagrams',
    keys:['set','union','intersection','complement','subset','universal set','venn diagram','element','empty set'] },
  { file:'statistics_intro',    subject:'mathematics', level:'s1', title:'Statistics',
    keys:['statistics','mean','median','mode','average','range','frequency','histogram','bar chart','pie chart','data','tally'] },

  { file:'quadratic',           subject:'mathematics', level:'s2', title:'Quadratic Equations',
    keys:['quadratic','quadratic equation','x squared','parabola','factorisation','completing the square','discriminant','quadratic formula'] },
  { file:'simultaneous',        subject:'mathematics', level:'s2', title:'Simultaneous Equations',
    keys:['simultaneous','simultaneous equation','two unknowns','system of equations','elimination method','substitution method'] },
  { file:'trigonometry',        subject:'mathematics', level:'s2', title:'Trigonometry',
    keys:['trigonometry','trig','sine','cosine','tangent','sin','cos','tan','sohcahtoa','pythagoras','hypotenuse','adjacent','opposite','bearing','elevation'] },
  { file:'coordinate_geometry', subject:'mathematics', level:'s2', title:'Coordinate Geometry',
    keys:['coordinate','gradient','straight line','equation of a line','midpoint','y-intercept','slope','cartesian','x-axis','y-axis'] },
  { file:'logarithms',          subject:'mathematics', level:'s2', title:'Logarithms',
    keys:['logarithm','log','ln','natural log','log base','antilog','laws of logarithms','exponential equation'] },
  { file:'statistics',          subject:'mathematics', level:'s2', title:'Statistics',
    keys:['probability','chance','likelihood','event','outcome','sample space','tree diagram','equally likely'] },
  { file:'vectors_intro',       subject:'mathematics', level:'s2', title:'Vectors',
    keys:['vector','scalar','magnitude','direction','resultant','position vector','column vector'] },

  { file:'coordinate_sequences', subject:'mathematics', level:'s3', title:'Sequences & Series',
    keys:['sequence','series','arithmetic progression','geometric progression','ap','gp','nth term','common difference','common ratio'] },
  { file:'differentiation',     subject:'mathematics', level:'s3', title:'Differentiation',
    keys:['differentiation','derivative','dy/dx','d/dx','rate of change','turning point','gradient of curve','stationary point','chain rule','product rule'] },
  { file:'integration',         subject:'mathematics', level:'s3', title:'Integration',
    keys:['integration','integral','indefinite','definite','area under curve','∫','antiderivative','integration by substitution'] },
  { file:'functions',           subject:'mathematics', level:'s3', title:'Functions & Graphs',
    keys:['function','domain','range','inverse function','composite function','graph','f(x)','mapping','transformation'] },
  { file:'matrices_probability', subject:'mathematics', level:'s3', title:'Matrices',
    keys:['matrix','matrices','determinant','inverse matrix','2×2','2x2','identity matrix','transformation matrix','matrix multiplication'] },

  { file:'vectors',             subject:'mathematics', level:'s4', title:'Vectors',
    keys:['3d vector','dot product','cross product','three dimensional','unit vector','vector equation'] },
  { file:'calculus',            subject:'mathematics', level:'s4', title:'Introduction to Calculus',
    keys:['calculus','differentiation and integration','rate of change','area','gradient of tangent','velocity from displacement'] },
  { file:'trigonometry_advanced', subject:'mathematics', level:'s4', title:'Advanced Trigonometry',
    keys:['sine rule','cosine rule','area of triangle','trigonometric graph','trigonometric equation','general solution','trig identity'] },
  { file:'permcomb',            subject:'mathematics', level:'s4', title:'Permutations & Combinations',
    keys:['permutation','combination','factorial','counting principle','arrangement','selection','binomial','ncr','npr','choosing'] },
  { file:'financial_maths',     subject:'mathematics', level:'s4', title:'Financial Mathematics',
    keys:['simple interest','compound interest','profit','loss','tax','depreciation','currency','hire purchase','financial'] },
  { file:'loci_construction',   subject:'mathematics', level:'s4', title:'Loci & Construction',
    keys:['locus','loci','construction','compass','bearing','scale drawing','region','bisector','perpendicular bisector'] },

  { file:'probability_advanced', subject:'mathematics', level:'s5', title:'Probability',
    keys:['probability distribution','binomial distribution','normal distribution','poisson','expected value','random variable','hypothesis test','statistical test'] },
  { file:'further_calculus',    subject:'mathematics', level:'s5', title:'Further Calculus',
    keys:['chain rule','product rule','quotient rule','parametric','implicit differentiation','integration by parts','maclaurin','taylor'] },
  { file:'mechanics',           subject:'mathematics', level:'s5', title:'Mechanics',
    keys:['mechanics','momentum','impulse','projectile','equilibrium','friction','inclined plane','resolution of forces'] },
  { file:'complex_numbers',     subject:'mathematics', level:'s5', title:'Complex Numbers',
    keys:['complex number','imaginary','real part','imaginary part','argand','modulus','argument','de moivre'] },
  { file:'differential_equations', subject:'mathematics', level:'s5', title:'Differential Equations',
    keys:['differential equation','first order','second order','separation of variables','particular solution','general solution'] },
  { file:'numerical_methods',   subject:'mathematics', level:'s5', title:'Numerical Methods',
    keys:['numerical method','newton-raphson','trapezium rule','iteration','fixed point','bisection method','approximation'] },

  { file:'statistics_probability', subject:'mathematics', level:'s6', title:'Statistics & Probability',
    keys:['regression','correlation','hypothesis testing','confidence interval','chi-squared','t-test','statistical distribution'] },
  { file:'pure_mathematics',    subject:'mathematics', level:'s6', title:'Pure Mathematics',
    keys:['proof','proof by induction','proof by contradiction','mathematical induction','series sum','binomial expansion'] },
  { file:'further_pure',        subject:'mathematics', level:'s6', title:'Further Pure Mathematics',
    keys:['partial fraction','maclaurin series','vectors in 3d','planes','lines in 3d','integration techniques'] },
  { file:'applied_mathematics', subject:'mathematics', level:'s6', title:'Applied Mathematics',
    keys:['linear programming','objective function','constraint','feasible region','simplex','optimization'] },

  // ── PHYSICS ──────────────────────────────────────────────────────
  { file:'measurement',         subject:'physics', level:'s1', title:'Measurement',
    keys:['measurement','unit','si unit','significant figure','error','accuracy','precision','instrument','physical quantity'] },
  { file:'forces',              subject:'physics', level:'s1', title:'Forces & Motion',
    keys:['force','newton','gravity','weight','friction','tension','normal force','resultant force','moment','turning effect','pressure'] },
  { file:'energy',              subject:'physics', level:'s1', title:'Work, Energy & Power',
    keys:['energy','work done','power','kinetic energy','potential energy','joule','conservation of energy','efficiency','watt'] },
  { file:'light',               subject:'physics', level:'s1', title:'Light & Optics',
    keys:['light','reflection','refraction','lens','mirror','ray','optics','prism','spectrum','critical angle','total internal reflection','concave','convex'] },
  { file:'properties_matter',   subject:'physics', level:'s1', title:'Properties of Matter',
    keys:['elasticity','hooke','spring constant','elastic limit','deformation','solid','liquid','gas','state','change of state'] },
  { file:'density_flotation',   subject:'physics', level:'s1', title:'Density & Flotation',
    keys:['density','archimedes','upthrust','flotation','buoyancy','relative density','float','sink','fluid'] },

  { file:'waves_electricity',   subject:'physics', level:'s2', title:'Waves & Sound',
    keys:['wave','frequency','amplitude','wavelength','transverse','longitudinal','period','wavefront','sound','echo','resonance','doppler'] },
  { file:'current_electricity', subject:'physics', level:'s2', title:'Current Electricity',
    keys:['current','voltage','resistance','circuit','ohm','series circuit','parallel circuit','ammeter','voltmeter','resistor','charge','electric power'] },
  { file:'magnetism_heat',      subject:'physics', level:'s2', title:'Magnetism & Heat',
    keys:['magnet','magnetism','magnetic field','electromagnet','solenoid','poles','compass','heat transfer','conduction','convection','radiation'] },
  { file:'sound',               subject:'physics', level:'s2', title:'Sound',
    keys:['sound wave','pitch','loudness','frequency of sound','ultrasound','noise','vibration','medium'] },
  { file:'electronics',         subject:'physics', level:'s2', title:'Electronics',
    keys:['diode','transistor','logic gate','semiconductor','rectification','and gate','or gate','not gate','digital'] },

  { file:'motion_kinematics',   subject:'physics', level:'s3', title:'Motion & Kinematics',
    keys:['motion','velocity','acceleration','speed','distance','displacement','kinematics','uniform','retardation','deceleration','equations of motion','suvat','v=u+at','newton law'] },
  { file:'pressure_fluids',     subject:'physics', level:'s3', title:'Pressure & Fluids',
    keys:['pressure in fluids','boyle law','atmospheric pressure','pascal','hydraulic','surface tension','viscosity','fluid pressure'] },
  { file:'radioactivity',       subject:'physics', level:'s3', title:'Radioactivity',
    keys:['radioactive','radiation','alpha','beta','gamma','half-life','nuclear decay','geiger','background radiation','isotope decay'] },
  { file:'electromagnetic',     subject:'physics', level:'s3', title:'Electromagnetic Induction',
    keys:['electromagnetic induction','faraday','generator','transformer','alternating current','ac','induced emf','lenz','motor'] },
  { file:'kinematics',          subject:'physics', level:'s3', title:'Kinematics',
    keys:['projectile motion','velocity-time graph','distance-time graph','equation of motion','displacement-time'] },

  { file:'electricity_detail',  subject:'physics', level:'s4', title:'Electricity (Advanced)',
    keys:['electric field','capacitor','capacitance','domestic electricity','fuse','earthing','electromagnetic induction advanced'] },
  { file:'optics_full',         subject:'physics', level:'s4', title:'Optics',
    keys:['lens formula','mirror formula','magnification','optical instrument','microscope','telescope','eye defect','short sight','long sight'] },
  { file:'circular_gravitation', subject:'physics', level:'s4', title:'Circular Motion & Gravitation',
    keys:['circular motion','centripetal','centrifugal','universal gravitation','orbital','satellite','gravitational field'] },

  { file:'thermal_physics',     subject:'physics', level:'s5', title:'Thermal Physics',
    keys:['thermodynamics','specific heat capacity','latent heat','gas law','ideal gas','boyle','charles','absolute zero','kelvin','thermal expansion'] },
  { file:'waves_optics',        subject:'physics', level:'s5', title:'Waves & Optics (Advanced)',
    keys:['interference','diffraction','polarization','young double slit','coherent','wave-particle duality','photoelectric effect'] },
  { file:'mechanics_advanced',  subject:'physics', level:'s5', title:'Advanced Mechanics',
    keys:['simple harmonic motion','shm','oscillation','pendulum','rotational motion','torque','angular velocity','moment of inertia'] },
  { file:'nuclear_physics',     subject:'physics', level:'s5', title:'Nuclear Physics',
    keys:['nuclear fission','nuclear fusion','nuclear reaction','binding energy','mass defect','atomic nucleus','radioactive decay series'] },

  { file:'modern_physics',      subject:'physics', level:'s6', title:'Modern Physics',
    keys:['quantum','photon','photoelectric','planck','wave particle duality','heisenberg','uncertainty','atomic spectra','energy levels'] },
  { file:'relativity',          subject:'physics', level:'s6', title:'Relativity',
    keys:['special relativity','general relativity','einstein','time dilation','length contraction','mass energy','e=mc2'] },
  { file:'astrophysics',        subject:'physics', level:'s6', title:'Astrophysics',
    keys:['star','galaxy','universe','black hole','big bang','cosmology','stellar','hertzsprung','main sequence'] },
  { file:'particle_physics',    subject:'physics', level:'s6', title:'Particle Physics',
    keys:['particle','quark','lepton','boson','standard model','hadron','proton structure','fundamental particle'] },
  { file:'quantum_mechanics',   subject:'physics', level:'s6', title:'Quantum Mechanics',
    keys:['quantum mechanics','wave function','schrodinger','energy level','orbital','quantum number','electron configuration advanced'] },

  // ── BIOLOGY ──────────────────────────────────────────────────────
  { file:'cells',               subject:'biology', level:'s1', title:'Cell Structure & Function',
    keys:['cell','nucleus','membrane','cytoplasm','organelle','mitochondria','chloroplast','vacuole','cell wall','ribosome','eukaryotic','prokaryotic'] },
  { file:'classification',      subject:'biology', level:'s1', title:'Classification',
    keys:['classification','kingdom','phylum','species','taxonomy','vertebrate','invertebrate','mammal','reptile','amphibian','binomial','five kingdoms'] },
  { file:'diffusion_osmosis',   subject:'biology', level:'s1', title:'Diffusion & Osmosis',
    keys:['diffusion','osmosis','active transport','concentration gradient','semi-permeable','turgor','plasmolysis','turgid','flaccid'] },
  { file:'photosynthesis_respiration', subject:'biology', level:'s1', title:'Photosynthesis & Respiration',
    keys:['photosynthesis','respiration','glucose','oxygen','carbon dioxide','chlorophyll','atp','light reaction','dark reaction','aerobic','anaerobic'] },

  { file:'digestion_ecology',   subject:'biology', level:'s2', title:'Digestion & Nutrition',
    keys:['digestion','stomach','enzyme','intestine','absorption','bile','amylase','pepsin','peristalsis','villi','duodenum','oesophagus'] },
  { file:'nutrition',           subject:'biology', level:'s2', title:'Nutrition',
    keys:['nutrition','nutrient','protein','carbohydrate','fat','vitamin','mineral','balanced diet','deficiency','malnutrition','food test'] },
  { file:'transport',           subject:'biology', level:'s2', title:'Transport in Living Organisms',
    keys:['transport','blood','heart','circulatory','xylem','phloem','haemoglobin','artery','vein','capillary','transpiration','pulse','heartbeat'] },
  { file:'reproduction',        subject:'biology', level:'s2', title:'Reproduction',
    keys:['reproduction','sexual','asexual','fertilisation','pollination','germination','seed','ovum','sperm','menstrual cycle','pregnancy'] },
  { file:'nervous_system',      subject:'biology', level:'s2', title:'Nervous System',
    keys:['nervous system','neuron','nerve','synapse','reflex arc','brain','spinal cord','receptor','effector','stimulus','response'] },

  { file:'genetics',            subject:'biology', level:'s3', title:'Genetics & Inheritance',
    keys:['genetics','gene','dna','chromosome','allele','dominant','recessive','inheritance','mendel','genotype','phenotype','mutation','monohybrid','dihybrid','punnett'] },
  { file:'ecology',             subject:'biology', level:'s3', title:'Ecology',
    keys:['ecology','ecosystem','food chain','food web','habitat','population','community','predator','prey','decomposer','nutrient cycle','carbon cycle','nitrogen cycle'] },
  { file:'excretion',           subject:'biology', level:'s3', title:'Excretion',
    keys:['excretion','kidney','nephron','urine','osmoregulation','filtration','reabsorption','liver','urea','dialysis'] },
  { file:'hormones_homeostasis', subject:'biology', level:'s3', title:'Homeostasis & Hormones',
    keys:['homeostasis','hormone','insulin','glucagon','diabetes','thermoregulation','negative feedback','endocrine','pituitary','adrenal'] },
  { file:'reproduction',        subject:'biology', level:'s3', title:'Reproduction (Advanced)',
    keys:['mitosis','meiosis','cell cycle','chromosome number','diploid','haploid','gamete formation'] },

  { file:'cell_division',       subject:'biology', level:'s4', title:'Cell Division',
    keys:['mitosis','meiosis','cell division','cell cycle','interphase','prophase','metaphase','anaphase','telophase','crossing over'] },
  { file:'ecology',             subject:'biology', level:'s4', title:'Ecology (Advanced)',
    keys:['biodiversity','conservation','human impact','pollution','deforestation','climate change','endangered species'] },
  { file:'evolution_immunity',  subject:'biology', level:'s4', title:'Evolution & Immunity',
    keys:['evolution','natural selection','darwin','adaptation','variation','mutation','immunity','vaccine','antibody','antigen','immune system'] },
  { file:'disease_health',      subject:'biology', level:'s4', title:'Disease & Health',
    keys:['disease','pathogen','bacteria','virus','infection','transmission','prevention','malaria','hiv','tuberculosis','epidemic'] },
  { file:'coordination',        subject:'biology', level:'s4', title:'Coordination',
    keys:['coordination','plant hormone','auxin','tropism','geotropism','phototropism','eye','ear','sense organ'] },

  { file:'biochemistry',        subject:'biology', level:'s5', title:'Biochemistry',
    keys:['biochemistry','enzyme kinetics','km','vmax','inhibitor','biological molecule','atp synthesis','metabolic pathway','enzyme active site'] },
  { file:'genetics_advanced',   subject:'biology', level:'s5', title:'Advanced Genetics',
    keys:['dna replication','gene expression','transcription','translation','mrna','trna','codon','genetic code','biotechnology','genetic engineering','pcr'] },
  { file:'cell_biology_advanced', subject:'biology', level:'s5', title:'Advanced Cell Biology',
    keys:['cell signalling','cell cycle control','apoptosis','cancer cell','stem cell','cell fractionation','ultrastructure'] },
  { file:'microbiology',        subject:'biology', level:'s5', title:'Microbiology',
    keys:['bacteria growth','virus replication','fungi','antibiotic','resistance','microbiology','culture medium','aseptic technique'] },
  { file:'ecology_advanced',    subject:'biology', level:'s5', title:'Advanced Ecology',
    keys:['population ecology','carrying capacity','logistic growth','mark recapture','diversity index','succession','climax community'] },

  { file:'molecular_biology',   subject:'biology', level:'s6', title:'Molecular Biology',
    keys:['molecular biology','gel electrophoresis','cloning','recombinant dna','gene therapy','crispr','dna sequencing','southern blot'] },
  { file:'immunology',          subject:'biology', level:'s6', title:'Immunology',
    keys:['immunology','b cell','t cell','lymphocyte','antibody production','immune response','humoral','autoimmune','monoclonal antibody'] },
  { file:'developmental_biology', subject:'biology', level:'s6', title:'Developmental Biology',
    keys:['developmental','embryo','gastrulation','morphogen','stem cell differentiation','hox gene','organogenesis','cloning'] },

  // ── CHEMISTRY ────────────────────────────────────────────────────
  { file:'atoms',               subject:'chemistry', level:'s1', title:'Atoms & Periodic Table',
    keys:['atom','element','proton','neutron','electron','atomic number','mass number','isotope','electron shell','valence electron','electron configuration'] },
  { file:'bonding',             subject:'chemistry', level:'s1', title:'Chemical Bonding',
    keys:['bond','ionic bond','covalent bond','metallic bond','electronegativity','dot and cross','lewis structure','dative bond','hydrogen bond','van der waals'] },
  { file:'matter',              subject:'chemistry', level:'s1', title:'States of Matter',
    keys:['state of matter','solid','liquid','gas','change of state','melting','boiling','sublimation','condensation','evaporation','kinetic theory'] },
  { file:'water',               subject:'chemistry', level:'s1', title:'Water',
    keys:['water','hard water','soft water','purification','distillation','filtration','chlorination','electrolysis of water','properties of water'] },

  { file:'mole_calculations',   subject:'chemistry', level:'s2', title:'Mole Calculations',
    keys:['mole','molar mass','avogadro','molar','relative molecular mass','empirical formula','molecular formula','stoichiometry','limiting reagent','percentage yield'] },
  { file:'reactions_metals',    subject:'chemistry', level:'s2', title:'Chemical Reactions & Metals',
    keys:['reactivity series','metal','displacement reaction','corrosion','rusting','extraction','oxidation','reduction','redox','oxidation state'] },
  { file:'acids_periodic',      subject:'chemistry', level:'s2', title:'Acids, Bases & Salts',
    keys:['acid','base','alkali','ph','indicator','neutralisation','litmus','universal indicator','strong acid','weak acid','salt','hydrochloric','sulphuric','nitric','periodic table','group','period'] },
  { file:'gases_solutions',     subject:'chemistry', level:'s2', title:'Gases & Solutions',
    keys:['gas law','solution','solute','solvent','solubility','concentration','dissolve','saturated','boyle','charles','ideal gas','preparation of gases'] },
  { file:'energy_changes',      subject:'chemistry', level:'s2', title:'Energy Changes',
    keys:['exothermic','endothermic','enthalpy','bond energy','activation energy','catalyst','energy profile','hess law','combustion','calorimetry'] },

  { file:'stoichiometry',       subject:'chemistry', level:'s3', title:'Stoichiometry',
    keys:['stoichiometry','mole ratio','titration','volumetric analysis','molarity','concentration calculation','balanced equation'] },
  { file:'organic_rates',       subject:'chemistry', level:'s3', title:'Organic Chemistry',
    keys:['hydrocarbon','alkane','alkene','alcohol','carboxylic acid','ester','addition reaction','substitution reaction','rate of reaction','reaction rate'] },
  { file:'electrochemistry',    subject:'chemistry', level:'s3', title:'Electrochemistry',
    keys:['electrolysis','electrolyte','electrode','anode','cathode','electroplating','faraday','discharge of ions','copper refining'] },
  { file:'gases',               subject:'chemistry', level:'s3', title:'Gases',
    keys:['preparation of gas','collection of gas','oxygen preparation','hydrogen preparation','carbon dioxide preparation','nitrogen','chlorine gas'] },

  { file:'organic_chemistry',   subject:'chemistry', level:'s4', title:'Organic Chemistry',
    keys:['organic chemistry','homologous series','functional group','polymer','nylon','polyethylene','alkene reaction','markovnikov','cracking','petrochemical'] },
  { file:'thermochemistry',     subject:'chemistry', level:'s4', title:'Thermochemistry & Equilibrium',
    keys:['thermochemistry','le chatelier','equilibrium constant','kc','kp','gibbs','entropy','spontaneous reaction','endothermic equilibrium'] },
  { file:'chemical_analysis',   subject:'chemistry', level:'s4', title:'Chemical Analysis',
    keys:['qualitative analysis','flame test','ion test','precipitation','identify ion','chemical test','spectroscopy basic','titration calculation'] },

  { file:'equilibria',          subject:'chemistry', level:'s5', title:'Chemical Equilibria',
    keys:['equilibrium','le chatelier principle','acid-base equilibria','buffer solution','ksp','solubility product','ph calculation'] },
  { file:'advanced_organic',    subject:'chemistry', level:'s5', title:'Advanced Organic Chemistry',
    keys:['reaction mechanism','nucleophilic substitution','elimination','sn1','sn2','carbonyl','aldehyde','ketone','grignard','benzene'] },
  { file:'transition_metals',   subject:'chemistry', level:'s5', title:'Transition Metals',
    keys:['transition metal','complex ion','ligand','coordination compound','colour of complex','redox of transition metal','iron','copper chemistry'] },
  { file:'spectroscopy',        subject:'chemistry', level:'s5', title:'Spectroscopy',
    keys:['infrared spectroscopy','mass spectrometry','nmr','chromatography','structure determination','fingerprint region'] },

  { file:'industrial_chemistry', subject:'chemistry', level:'s6', title:'Industrial Chemistry',
    keys:['haber process','contact process','industrial','electrolysis industry','blast furnace','smelting','manufacture of'] },
  { file:'polymers',            subject:'chemistry', level:'s6', title:'Polymers',
    keys:['polymer','addition polymer','condensation polymer','nylon','polyester','rubber','plastic','biodegradable','monomer'] },
  { file:'green_chemistry',     subject:'chemistry', level:'s6', title:'Green Chemistry',
    keys:['green chemistry','atom economy','sustainability','waste','e-factor','renewable','biofuel','carbon footprint'] },
  { file:'pharmaceuticals',     subject:'chemistry', level:'s6', title:'Pharmaceuticals',
    keys:['pharmaceutical','drug','medicinal chemistry','analgesic','antibiotic','aspirin','drug design','clinical trial'] },
]

// Build fast keyword lookup
const KEYWORD_MAP = new Map()  // keyword → array of topic entries
for (const entry of CURRICULUM_INDEX) {
  for (const key of entry.keys) {
    const k = key.toLowerCase()
    if (!KEYWORD_MAP.has(k)) KEYWORD_MAP.set(k, [])
    KEYWORD_MAP.get(k).push(entry)
  }
}

// ═══════════════════════════════════════════════════════════════════
// TOPIC EXTRACTOR  — searches ALL 100+ files
// ═══════════════════════════════════════════════════════════════════

function levenshtein(a, b) {
  if (Math.abs(a.length - b.length) > 3) return 99
  const m = a.length, n = b.length
  const dp = Array.from({ length: m+1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
  return dp[m][n]
}

export function extractTopic(input) {
  const text = input.toLowerCase()
  const scores = new Map()  // topic key → score

  // Pass 1: exact keyword matches
  for (const [keyword, entries] of KEYWORD_MAP) {
    if (text.includes(keyword)) {
      const weight = keyword.length * 2  // longer = more specific
      for (const e of entries) {
        const key = `${e.subject}/${e.file}`
        scores.set(key, (scores.get(key) || 0) + weight)
      }
    }
  }

  // Pass 2: fuzzy match on individual words (catches typos)
  if (scores.size === 0) {
    const words = text.split(/\s+/).filter(w => w.length > 4)
    for (const word of words) {
      for (const [keyword, entries] of KEYWORD_MAP) {
        if (keyword.split(' ').length > 1) continue  // only single-word fuzzy
        const dist = levenshtein(word, keyword)
        if (dist <= 2 && keyword.length > 4) {
          const weight = keyword.length - dist
          for (const e of entries) {
            const key = `${e.subject}/${e.file}`
            scores.set(key, (scores.get(key) || 0) + weight)
          }
        }
      }
    }
  }

  if (scores.size === 0) return null

  // Find highest scoring entry
  let bestKey = null, bestScore = 0
  for (const [key, score] of scores) {
    if (score > bestScore) { bestScore = score; bestKey = key }
  }

  const [subject, file] = bestKey.split('/')
  const entry = CURRICULUM_INDEX.find(e => e.subject === subject && e.file === file)
  return entry ? { topic: entry.file, subject: entry.subject, title: entry.title, level: entry.level } : null
}

// For smart fallback — find closest even with no match
function findClosestTopic(input) {
  const text = input.toLowerCase()
  let best = null, bestScore = 0
  for (const [keyword, entries] of KEYWORD_MAP) {
    for (const word of text.split(/\s+/)) {
      if (word.length < 4) continue
      const dist = levenshtein(word, keyword)
      if (dist <= 3 && keyword.length > 3) {
        const score = keyword.length - dist
        if (score > bestScore) {
          bestScore = score
          best = entries[0]
        }
      }
    }
  }
  return best
}

// ═══════════════════════════════════════════════════════════════════
// CURRICULUM KNOWLEDGE LOADER  — tries all levels
// ═══════════════════════════════════════════════════════════════════

const KNOWLEDGE_CACHE = {}

export async function loadTopicKnowledge(topic, subject, preferredLevel = null) {
  const cacheKey = `${subject}_${topic}`
  if (KNOWLEDGE_CACHE[cacheKey]) return KNOWLEDGE_CACHE[cacheKey]

  // Find all levels that have this file
  const entry = CURRICULUM_INDEX.find(e => e.file === topic && e.subject === subject)
  const startLevel = preferredLevel || entry?.level || 's1'
  const levels = ['s1','s2','s3','s4','s5','s6']
  // Try the expected level first, then all others
  const ordered = [startLevel, ...levels.filter(l => l !== startLevel)]

  for (const level of ordered) {
    try {
      const data = await import(`../curriculum/${subject}/${level}/${topic}.json`)
      const knowledge = extractKnowledge(data, topic, subject, entry?.title)
      KNOWLEDGE_CACHE[cacheKey] = knowledge
      return knowledge
    } catch {}
  }
  return null
}

function extractKnowledge(data, topic, subject, titleOverride = null) {
  const lessons = data.lessons || []
  const k = {
    topic, subject,
    title: titleOverride || data.topic_title || topic.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase()),
    definitions: [], keyFacts: [], formulas: [], examples: [],
    quizQuestions: [], steps: [], simplerExplanation: null,
  }
  for (const lesson of lessons) {
    for (const block of (lesson.content || [])) {
      if (block.type === 'text' && block.body)
        k.keyFacts.push(...block.body.split(/[.!]\s+/).filter(s => s.length > 20).slice(0, 3))
      else if (block.type === 'formula' && block.body)
        k.formulas.push({ label: block.title || 'Formula', content: block.body.trim() })
      else if (block.type === 'example' && block.body)
        k.examples.push({ title: block.title || 'Example', body: block.body })
      else if (block.type === 'definition' && block.term)
        k.definitions.push({ term: block.term, definition: block.definition })
      else if (block.type === 'steps' && block.items)
        k.steps.push({ title: block.title || 'Steps', items: block.items })
      else if ((block.type === 'simple' || block.type === 'analogy') && block.body)
        k.simplerExplanation = block.body
    }
    k.quizQuestions.push(...(lesson.quiz?.questions || []).slice(0, 5))
  }
  k.keyFacts = [...new Set(k.keyFacts)].slice(0, 8)
  k.formulas = k.formulas.slice(0, 5)
  k.examples = k.examples.slice(0, 4)
  k.quizQuestions = k.quizQuestions.slice(0, 30)
  return k
}

// ═══════════════════════════════════════════════════════════════════
// CONVERSATION MEMORY
// ═══════════════════════════════════════════════════════════════════

export const conversationMemory = {
  lastTopic: null, lastSubject: null, lastKnowledge: null,
  quizStreak: 0, quizTotal: 0, messageCount: 0,
  studentName: null, sessionTopics: [],
}
export function resetMemory() {
  Object.assign(conversationMemory, {
    lastTopic: null, lastSubject: null, lastKnowledge: null,
    quizStreak: 0, quizTotal: 0, messageCount: 0, studentName: null, sessionTopics: [],
  })
}

// ═══════════════════════════════════════════════════════════════════
// CALCULATION SOLVER
// ═══════════════════════════════════════════════════════════════════

const CALC_ENGINES = [
  { match: /speed|velocity|distance.*time|time.*distance/i,
    formulas: [
      { name: 'speed',    vars: ['d','t'], calc: v => v.d/v.t,   unit:'m/s',  form:'speed = distance ÷ time' },
      { name: 'distance', vars: ['s','t'], calc: v => v.s*v.t,   unit:'m',    form:'distance = speed × time' },
      { name: 'time',     vars: ['d','s'], calc: v => v.d/v.s,   unit:'s',    form:'time = distance ÷ speed' },
    ],
    extract: t => { const v={}; const d=t.match(/distance[=:\s]+([0-9.]+)/i),s=t.match(/(speed|velocity)[=:\s]+([0-9.]+)/i),tm=t.match(/time[=:\s]+([0-9.]+)/i); if(d)v.d=+d[1];if(s)v.s=+s[2];if(tm)v.t=+tm[1];return v },
  },
  { match: /force|mass.*accel|accel.*mass/i,
    formulas: [
      { name: 'force',        vars: ['m','a'], calc: v => v.m*v.a,  unit:'N',    form:'F = m × a' },
      { name: 'acceleration', vars: ['f','m'], calc: v => v.f/v.m,  unit:'m/s²', form:'a = F ÷ m' },
      { name: 'mass',         vars: ['f','a'], calc: v => v.f/v.a,  unit:'kg',   form:'m = F ÷ a' },
    ],
    extract: t => { const v={}; const f=t.match(/force[=:\s]+([0-9.]+)/i),m=t.match(/mass[=:\s]+([0-9.]+)/i),a=t.match(/acceleration[=:\s]+([0-9.]+)/i); if(f)v.f=+f[1];if(m)v.m=+m[1];if(a)v.a=+a[1];return v },
  },
  { match: /voltage|current|resistance|ohm/i,
    formulas: [
      { name: 'voltage',    vars: ['i','r'], calc: v => v.i*v.r, unit:'V', form:"V = I × R (Ohm's Law)" },
      { name: 'current',    vars: ['v','r'], calc: v => v.v/v.r, unit:'A', form:'I = V ÷ R' },
      { name: 'resistance', vars: ['v','i'], calc: v => v.v/v.i, unit:'Ω', form:'R = V ÷ I' },
    ],
    extract: t => { const v={}; const vv=t.match(/voltage[=:\s]+([0-9.]+)/i),i=t.match(/current[=:\s]+([0-9.]+)/i),r=t.match(/resistance[=:\s]+([0-9.]+)/i); if(vv)v.v=+vv[1];if(i)v.i=+i[1];if(r)v.r=+r[1];return v },
  },
  { match: /kinetic energy|work done|work=|power.*time/i,
    formulas: [
      { name: 'kinetic energy', vars: ['m','vel'], calc: v => 0.5*v.m*v.vel*v.vel, unit:'J', form:'KE = ½mv²' },
      { name: 'work done',      vars: ['f','d'],   calc: v => v.f*v.d,              unit:'J', form:'W = F × d' },
      { name: 'power',          vars: ['w','t'],   calc: v => v.w/v.t,             unit:'W', form:'P = W ÷ t' },
    ],
    extract: t => { const v={}; const m=t.match(/mass[=:\s]+([0-9.]+)/i),spd=t.match(/(velocity|speed)[=:\s]+([0-9.]+)/i),f=t.match(/force[=:\s]+([0-9.]+)/i),d=t.match(/distance[=:\s]+([0-9.]+)/i),w=t.match(/work[=:\s]+([0-9.]+)/i),tm=t.match(/time[=:\s]+([0-9.]+)/i); if(m)v.m=+m[1];if(spd)v.vel=+(spd[1]||spd[2]);if(f)v.f=+f[1];if(d)v.d=+d[1];if(w)v.w=+w[1];if(tm)v.t=+tm[1];return v },
  },
  { match: /density/i,
    formulas: [
      { name: 'density', vars: ['m','vol'], calc: v => v.m/v.vol, unit:'kg/m³', form:'ρ = m ÷ V' },
      { name: 'mass',    vars: ['den','vol'], calc: v => v.den*v.vol, unit:'kg', form:'m = ρ × V' },
      { name: 'volume',  vars: ['m','den'], calc: v => v.m/v.den,  unit:'m³',   form:'V = m ÷ ρ' },
    ],
    extract: t => { const v={}; const m=t.match(/mass[=:\s]+([0-9.]+)/i),vol=t.match(/volume[=:\s]+([0-9.]+)/i),den=t.match(/density[=:\s]+([0-9.]+)/i); if(m)v.m=+m[1];if(vol)v.vol=+vol[1];if(den)v.den=+den[1];return v },
  },
  { match: /mole|molar/i,
    formulas: [
      { name: 'moles',      vars: ['mass','mr'], calc: v => v.mass/v.mr, unit:'mol',   form:'n = mass ÷ Mr' },
      { name: 'molar mass', vars: ['mass','n'],  calc: v => v.mass/v.n,  unit:'g/mol', form:'Mr = mass ÷ n' },
      { name: 'mass',       vars: ['n','mr'],    calc: v => v.n*v.mr,    unit:'g',     form:'mass = n × Mr' },
    ],
    extract: t => { const v={}; const mass=t.match(/mass[=:\s]+([0-9.]+)/i),mr=t.match(/(molar mass|mr)[=:\s]+([0-9.]+)/i),n=t.match(/moles?[=:\s]+([0-9.]+)/i); if(mass)v.mass=+mass[1];if(mr)v.mr=+(mr[1]||mr[2]);if(n)v.n=+n[1];return v },
  },
  { match: /pressure.*volume|boyle/i,
    formulas: [
      { name: 'pressure',      vars: ['f','a'],   calc: v => v.f/v.a,    unit:'Pa',  form:'P = F ÷ A' },
      { name: "Boyle's Law P₂", vars: ['p1','v1','v2'], calc: v => v.p1*v.v1/v.v2, unit:'Pa', form:'P₂ = P₁V₁ ÷ V₂' },
    ],
    extract: t => { const v={}; const p1=t.match(/p1[=:\s]+([0-9.]+)/i),v1=t.match(/v1[=:\s]+([0-9.]+)/i),v2=t.match(/v2[=:\s]+([0-9.]+)/i),f=t.match(/force[=:\s]+([0-9.]+)/i),a=t.match(/area[=:\s]+([0-9.]+)/i); if(p1)v.p1=+p1[1];if(v1)v.v1=+v1[1];if(v2)v.v2=+v2[1];if(f)v.f=+f[1];if(a)v.a=+a[1];return v },
  },
]

function tryAutoCalculate(input) {
  for (const engine of CALC_ENGINES) {
    if (!engine.match.test(input)) continue
    const vars = engine.extract(input)
    if (Object.keys(vars).length < 2) continue
    for (const formula of engine.formulas) {
      if (formula.vars.every(v => vars[v] !== undefined)) {
        try {
          const result = formula.calc(vars)
          if (!isFinite(result) || isNaN(result)) continue
          return { name: formula.name, formula: formula.form, result: Math.round(result*10000)/10000, unit: formula.unit, vars }
        } catch {}
      }
    }
  }
  return null
}

// ═══════════════════════════════════════════════════════════════════
// INTENT CLASSIFIER
// ═══════════════════════════════════════════════════════════════════

const INTENT_PATTERNS = [
  { intent:'FOLLOWUP_MORE',    patterns: [/^(tell me more|more|continue|go on|elaborate|expand)[\s.!?]*$/i, /^more (about|on|please)[\s.!?]*$/i] },
  { intent:'FOLLOWUP_SIMPLER', patterns: [/^(simpler|easier|i (still )?don'?t get it)[\s.!?]*$/i, /explain (it )?differently|in simple(r)? terms/i, /simpler (please|explanation)/i, /can you (explain|say) (it|that) (differently|simpler|again)/i] },
  { intent:'FOLLOWUP_EXAMPLE', patterns: [/^give me (an?|another) example[\s.!?]*$/i, /^(example please|another example|show me (an? )?example)[\s.!?]*$/i] },
  { intent:'FOLLOWUP_WHY',     patterns: [/^(why\??|but why\??|why is (that|this|it)\??)[\s.!?]*$/i, /^why does (that|this|it) (happen|work)/i] },
  { intent:'FOLLOWUP_NEXT_QUIZ', patterns: [/^(next (question)?|another (question)?|again|one more|next one|continue quiz)[\s.!?]*$/i, /^ask me (another|again)[\s.!?]*$/i] },
  { intent:'EXPLAIN',   patterns: [/what is (.+)/i, /what are (.+)/i, /define (.+)/i, /explain (.+)/i, /tell me about (.+)/i, /describe (.+)/i, /how does (.+) work/i, /teach me (.+)/i, /what do you know about (.+)/i] },
  { intent:'CALCULATE', patterns: [/calculate (.+)/i, /solve (.+)/i, /how do (i|you|we) (calculate|solve|find|work out) (.+)/i, /formula for (.+)/i, /find (.+) (if|when|given) (.+)/i, /what is (.+) if (.+)/i] },
  { intent:'QUIZ',      patterns: [/quiz me (on )?(.+)/i, /test me (on )?(.+)/i, /ask me .*(about|on) (.+)/i, /practice (.+)/i, /revise (.+)/i, /drill me on (.+)/i] },
  { intent:'HINT',      patterns: [/i('?m| am) stuck/i, /give me a hint/i, /i don'?t (understand|get)/i, /help me (with|understand)/i, /i need help/i, /i'?m? confused/i, /hint/i, /struggling with/i, /not sure (about|how)/i] },
  { intent:'EXAM_TIP',  patterns: [/exam tip/i, /how (do i|should i|to) (pass|study for|prepare for)/i, /uneb (tip|advice)/i, /common (mistake|error)s?/i] },
  { intent:'COMPARE',   patterns: [/difference between (.+) and (.+)/i, /compare (.+) (and|with|to) (.+)/i, /(.+) vs (.+)/i] },
  { intent:'GREET',     patterns: [/^(hi|hello|hey|good morning|good evening|good afternoon|helo|hi there|howdy)[\s!.]*$/i, /^(how are you|what can you do|who are you)[\s?]*$/i, /^(start|begin)[\s!.]*$/i] },
  { intent:'THANKS',    patterns: [/^(thanks?|thank you|ok thanks?|great|awesome|cool|perfect|got it|i see|understood)[\s!.]*$/i, /^(nice|brilliant|excellent|wonderful|fantastic|that helps?)[\s!.]*$/i] },
  { intent:'RECOMMEND', patterns: [/what should i (study|learn|do) (next|now)?/i, /recommend/i, /where do i start/i, /what'?s? next/i, /guide me/i] },
]

export function classifyIntent(input) {
  const text = input.trim()
  for (const { intent, patterns } of INTENT_PATTERNS) {
    for (const p of patterns) {
      if (text.match(p)) return { intent, raw: input }
    }
  }
  return { intent: 'EXPLAIN', raw: input }
}

// ═══════════════════════════════════════════════════════════════════
// RESPONSE GENERATORS
// ═══════════════════════════════════════════════════════════════════

function pick(arr) { return arr[Math.floor(Math.random()*arr.length)] }

function smartFallback(query) {
  const closest = findClosestTopic(query)
  const parts = []
  if (closest) {
    const name = closest.title || closest.file.replace(/_/g,' ')
    parts.push({ type:'heading', text:"🤔 Did you mean..." })
    parts.push({ type:'text', text:`I couldn't find _"${query}"_ exactly, but I think you may be asking about **${name}**?` })
    parts.push({ type:'suggestions', items:[`Explain ${name}`, `Quiz me on ${name}`, `How do I calculate ${name}?`, 'Show all topics'] })
  } else {
    parts.push({ type:'heading', text:"🤔 I'm not sure about that" })
    parts.push({ type:'text', text:`I specialise in the S1–S6 UNEB curriculum. Try asking about a specific topic:` })
    parts.push({ type:'list', items:['"What is photosynthesis?"','"Explain quadratic equations"','"Quiz me on forces"','"How do I calculate moles?"','"Exam tips for genetics"'] })
    parts.push({ type:'suggestions', items:['Explain photosynthesis','Quiz me on algebra','Explain electricity','How do I calculate force?'] })
  }
  return { parts }
}

export function generateExplainResponse(knowledge, query, simpler=false) {
  if (!knowledge) return smartFallback(query)
  const parts = []
  const t = knowledge.title
  parts.push({ type:'heading', text:`📖 ${t}` })
  if (simpler && knowledge.simplerExplanation)
    parts.push({ type:'text', text: knowledge.simplerExplanation })
  else if (knowledge.definitions.length > 0)
    parts.push({ type:'text', text:`**${knowledge.definitions[0].term}**: ${knowledge.definitions[0].definition}` })
  else if (knowledge.keyFacts.length > 0)
    parts.push({ type:'text', text: knowledge.keyFacts[0] })
  if (knowledge.keyFacts.length > 1)
    parts.push({ type:'list', title:'🔑 Key Points', items: knowledge.keyFacts.slice(1, simpler?3:4) })
  if (knowledge.formulas.length > 0)
    parts.push({ type:'formula', title:'📐 Formula(s)', items: knowledge.formulas.slice(0,simpler?1:3).map(f=>`${f.label}: ${f.content}`) })
  if (knowledge.examples.length > 0)
    parts.push({ type:'example', title:`💡 Example: ${knowledge.examples[0].title}`, text: knowledge.examples[0].body })
  parts.push({ type:'suggestions', items:[`Quiz me on ${t}`, `Give me another example of ${t}`, `Exam tips for ${t}`] })
  return { parts, topic: knowledge.topic, subject: knowledge.subject }
}

function generateMoreResponse(knowledge) {
  if (!knowledge) return smartFallback('')
  const parts = []
  parts.push({ type:'heading', text:`📖 More on ${knowledge.title}` })
  if (knowledge.keyFacts.length > 3)
    parts.push({ type:'list', title:'📚 More Key Points', items: knowledge.keyFacts.slice(3,7) })
  else
    parts.push({ type:'list', items: knowledge.keyFacts })
  if (knowledge.formulas.length > 2)
    parts.push({ type:'formula', title:'📐 Additional Formulas', items: knowledge.formulas.slice(2).map(f=>`${f.label}: ${f.content}`) })
  if (knowledge.examples.length > 1)
    parts.push({ type:'example', title:`💡 ${knowledge.examples[1].title}`, text: knowledge.examples[1].body })
  parts.push({ type:'suggestions', items:[`Quiz me on ${knowledge.title}`,`Exam tips for ${knowledge.title}`,`Explain ${knowledge.title} in simpler terms`] })
  return { parts, topic: knowledge.topic, subject: knowledge.subject }
}

export function generateCalculateResponse(knowledge, query) {
  const parts = []
  const solved = tryAutoCalculate(query)
  if (solved) {
    parts.push({ type:'heading', text:`🔢 Solved: ${solved.name}` })
    parts.push({ type:'formula', title:'📐 Formula Used', items:[solved.formula] })
    parts.push({ type:'list', title:'📋 Working', items:[
      `Given: ${Object.entries(solved.vars).map(([k,v])=>`${k} = ${v}`).join(', ')}`,
      `Applying: ${solved.formula}`,
      `✅ **Answer: ${solved.name} = ${solved.result} ${solved.unit}**`,
    ]})
    if (knowledge?.examples?.length > 0)
      parts.push({ type:'example', title:'💡 Similar Example', text: knowledge.examples[0].body })
    parts.push({ type:'suggestions', items:[`Quiz me on ${knowledge?.title||solved.name}`,`Explain ${solved.name}`,'Give me another example'] })
    return { parts, topic: knowledge?.topic, subject: knowledge?.subject }
  }
  if (!knowledge) return smartFallback(query)
  parts.push({ type:'heading', text:`🔢 How to Calculate: ${knowledge.title}` })
  if (knowledge.formulas.length > 0) {
    parts.push({ type:'formula', title:'📐 Formulas', items: knowledge.formulas.map(f=>`${f.label}: ${f.content}`) })
    parts.push({ type:'list', title:'📋 Step-by-Step Method', items:[
      '1️⃣ Read the question — list all given values',
      '2️⃣ Identify the unknown (what you need to find)',
      '3️⃣ Choose the right formula from above',
      '4️⃣ Substitute the values into the formula',
      '5️⃣ Solve and include the correct unit',
    ]})
  }
  if (knowledge.examples.length > 0)
    parts.push({ type:'example', title:'💡 Worked Example', text: knowledge.examples[0].body })
  parts.push({ type:'text', text:`💡 **Tip:** Give me actual numbers and I will solve it!\ne.g. _"find force if mass=5kg acceleration=3m/s²"_` })
  parts.push({ type:'suggestions', items:[`Quiz me on ${knowledge.title}`,`Explain ${knowledge.title}`,'Another example please'] })
  return { parts, topic: knowledge.topic, subject: knowledge.subject }
}

export function generateQuizResponse(knowledge, existingSession=null) {
  if (!knowledge || knowledge.quizQuestions.length===0) {
    return { parts:[
      { type:'text', text:`I don't have quiz questions for that topic yet. Try: _"Explain ${knowledge?.title||'the topic'}"_` },
      { type:'suggestions', items:[`Explain ${knowledge?.title||'algebra'}`,'Quiz me on forces','Quiz me on cells'] },
    ], quizMode: false }
  }
  const used = existingSession?.usedIds || new Set()
  const available = knowledge.quizQuestions.filter(q=>!used.has(q.id))
  const pool = available.length>0 ? available : knowledge.quizQuestions
  const q = pool[Math.floor(Math.random()*pool.length)]
  return {
    parts:[
      { type:'heading', text:`❓ Quiz: ${knowledge.title}` },
      { type:'text', text: pick([`Here is a question on **${knowledge.title}**:`,`Let's test your knowledge of **${knowledge.title}**:`,`Ready? Here's a **${knowledge.title}** question:`]) },
      { type:'quiz_question', question:q.question, options:q.options, answer:q.answer, explanation:q.explanation, id:q.id },
    ],
    quizMode:true, currentQuestion:q, topic:knowledge.topic, subject:knowledge.subject, newUsedId:q.id,
  }
}

export function generateHintResponse(knowledge, query) {
  const parts = []
  if (!knowledge) {
    parts.push({ type:'heading', text:'💡 Let me help you' })
    parts.push({ type:'list', title:'When you are stuck, try this:', items:[
      '📖 Re-read the question — what is it actually asking?',
      '📝 Write down all values given in the question',
      '🔍 Which topic does this question relate to?',
      '📚 Look at a similar worked example in your notes',
      '🎯 In multiple-choice: eliminate clearly wrong options first',
      '💬 Tell me the topic and I will give a specific hint!',
    ]})
    parts.push({ type:'suggestions', items:['Explain algebra','Explain photosynthesis','Quiz me on forces'] })
    return { parts }
  }
  parts.push({ type:'heading', text:`💡 Hints for: ${knowledge.title}` })
  const hints = [
    knowledge.keyFacts[0] ? `🔑 Key idea: **${knowledge.keyFacts[0]}**` : null,
    knowledge.formulas[0] ? `📐 Main formula: **${knowledge.formulas[0].content}**` : null,
    `🤔 What values do you already know? What are you finding?`,
    knowledge.keyFacts[1] ? `💡 Also remember: ${knowledge.keyFacts[1]}` : null,
  ].filter(Boolean)
  parts.push({ type:'list', title:'Think through this:', items: hints })
  if (knowledge.examples.length > 0)
    parts.push({ type:'example', title:'💡 Similar Example', text: knowledge.examples[0].body })
  parts.push({ type:'text', text:`Still stuck? Try: _"Explain ${knowledge.title} in simpler terms"_` })
  parts.push({ type:'suggestions', items:[`Explain ${knowledge.title} in simpler terms`,`Quiz me on ${knowledge.title}`,`Formula for ${knowledge.title}`] })
  return { parts, topic: knowledge.topic, subject: knowledge.subject }
}

function generateExamTipResponse(knowledge, query) {
  const parts = []
  parts.push({ type:'heading', text:`🎯 Exam Tips${knowledge ? ': ' + knowledge.title : ''}` })
  if (knowledge) {
    const tips = []
    if (knowledge.formulas.length>0)
      tips.push(`Memorise these formulas: ${knowledge.formulas.map(f=>f.content).slice(0,3).join(' | ')}`)
    tips.push(`For definitions — learn exact key terms. UNEB examiners mark specific wording`)
    tips.push(`Always show your working — method marks matter even if your final answer is wrong`)
    tips.push(`Common mistake: not writing units in the final answer`)
    parts.push({ type:'list', title:`📌 Tips for ${knowledge.title}:`, items: tips })
  }
  parts.push({ type:'list', title:'📋 General UNEB Strategy:', items:[
    '📝 Show all working — never skip steps',
    '⏱️ If stuck, skip and come back — manage your time',
    '🔢 Always include units in your answer',
    '✅ Check arithmetic — many marks are lost on simple errors',
    '📊 Label diagrams fully and use a ruler',
  ]})
  parts.push({ type:'suggestions', items:[
    knowledge ? `Quiz me on ${knowledge.title}` : 'Quiz me on forces',
    knowledge ? `Explain ${knowledge.title}` : 'Explain photosynthesis',
    'How do I calculate force?',
  ]})
  return { parts, topic: knowledge?.topic, subject: knowledge?.subject }
}

// ── Greetings & small talk ─────────────────────────────────────────
const GREETINGS = [
  n=>`Hello${n?' '+n:''}! 👋 I am **Elimu AI** — your personal study assistant for S1–S6.\n\nI can help you:\n• **Explain** any topic — _"What is osmosis?"_\n• **Solve** calculations — _"Find force if mass=5kg acceleration=3m/s²"_\n• **Quiz** you — _"Quiz me on probability"_\n• **Hints** when stuck — _"I don't understand simultaneous equations"_\n• **Exam tips** — _"Tips for chemistry exam"_\n\nWhat would you like to study today?`,
  n=>`Hi${n?' '+n:''}! 🌟 Ready to study? I know your entire S1–S6 curriculum — all four subjects.\n\nTry:\n• _"Explain logarithms"_\n• _"Quiz me on cells"_\n• _"How do I calculate moles?"_\n• _"Difference between mitosis and meiosis"_`,
  n=>`Good to see you${n?', '+n:''}! 🚀 Let's make this study session count.\n\nI cover every topic in Maths, Physics, Biology and Chemistry from S1 to S6. What are we tackling today?`,
]
const THANKS_MSGS = [
  "You're welcome! 😊 Every question you ask makes you stronger. What's next?",
  "Happy to help! 🌟 Keep studying consistently — it's the key to UNEB success. What else?",
  "Great! 🚀 The students who ask questions are the ones who pass. What else can I help with?",
  "Glad that helped! 💪 Want to test yourself with a quick quiz?",
  "Any time! 🎯 What topic next?",
]
const CORRECT_RESP = [
  n=>`✅ Correct${n?', '+n:''}! Well done! 🎉`,
  ()=>`✅ That's right! Excellent! ⭐`,
  ()=>`✅ Perfect! You clearly know this topic. 🚀`,
  ()=>`✅ Spot on! Keep this up — you will ace UNEB. 💪`,
]
const WRONG_RESP = [
  ()=>`❌ Not quite — but that's how we learn.`,
  ()=>`❌ Good try! The correct answer is below.`,
  ()=>`❌ Almost! Check the correct answer below.`,
]

export function generateGreetResponse(studentName) {
  const n = studentName || conversationMemory.studentName
  return { parts:[{ type:'text', text: pick(GREETINGS)(n) }], suggestions:['Explain photosynthesis','Quiz me on forces','How do I calculate moles?','Exam tips for mathematics'] }
}
export function generateThanksResponse() {
  const mem = conversationMemory
  return { parts:[{ type:'text', text: pick(THANKS_MSGS) }], suggestions: mem.lastTopic ? [`Quiz me on ${mem.lastTopic.replace(/_/g,' ')}`, 'Explain another topic', 'Give me exam tips'] : ['Explain photosynthesis','Quiz me on algebra','How do I find force?'] }
}

export function checkQuizAnswer(userInput, currentQuestion) {
  if (!currentQuestion) return null
  const input = userInput.trim().toLowerCase()
  const opts = currentQuestion.options || []
  const answer = currentQuestion.answer || ''
  const letter = input.match(/^([abcd])[\s.)]*$/)
  if (letter) {
    const chosen = opts['abcd'.indexOf(letter[1])]
    return { correct: chosen===answer, chosen, answer, explanation: currentQuestion.explanation }
  }
  const al = answer.toLowerCase()
  return { correct: input===al || al.startsWith(input) || input.startsWith(al), chosen: userInput, answer, explanation: currentQuestion.explanation }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PROCESSOR
// ═══════════════════════════════════════════════════════════════════

export async function processMessage(input, context={}) {
  const mem = conversationMemory
  mem.messageCount++
  if (context.studentName && !mem.studentName) mem.studentName = context.studentName

  const { intent } = classifyIntent(input)

  // Quiz answer
  if (context.quizMode && context.currentQuestion) {
    const result = checkQuizAnswer(input, context.currentQuestion)
    if (result) {
      result.correct ? (mem.quizStreak++, mem.quizTotal++) : (mem.quizStreak=0, mem.quizTotal++)
      const streak = result.correct && mem.quizStreak>=3 ? ` 🔥 ${mem.quizStreak} in a row!` : ''
      const parts = []
      if (result.correct) parts.push({ type:'correct', text: pick(CORRECT_RESP)(mem.studentName) + streak })
      else { parts.push({ type:'wrong', text: pick(WRONG_RESP)() }); parts.push({ type:'text', text:`✅ Correct answer: **"${result.answer}"**` }) }
      if (result.explanation) parts.push({ type:'text', text:`💡 **Why:** ${result.explanation}` })
      const tn = context.topic?.replace(/_/g,' ') || 'this topic'
      parts.push({ type:'suggestions', items:[`Next question on ${tn}`,`Explain ${tn}`,'Quiz me on something else'] })
      return { parts, quizMode:false, wasAnswer:true, correct:result.correct }
    }
  }

  const lastK = mem.lastKnowledge

  // Follow-ups
  if (intent==='FOLLOWUP_MORE') return lastK ? generateMoreResponse(lastK) : { parts:[{ type:'text', text:'What topic would you like more detail on?' }] }
  if (intent==='FOLLOWUP_SIMPLER') return lastK ? generateExplainResponse(lastK, input, true) : { parts:[{ type:'text', text:'Which topic should I explain more simply?' }] }
  if (intent==='FOLLOWUP_EXAMPLE') {
    if (lastK?.examples?.length>0) {
      const ex = lastK.examples[Math.floor(Math.random()*lastK.examples.length)]
      return { parts:[{ type:'heading', text:`💡 Example: ${lastK.title}` },{ type:'example', title:ex.title, text:ex.body },{ type:'suggestions', items:[`Quiz me on ${lastK.title}`,'Another example please',`Explain ${lastK.title}`] }], topic:lastK.topic, subject:lastK.subject }
    }
    return { parts:[{ type:'text', text:'Which topic would you like an example for?' }] }
  }
  if (intent==='FOLLOWUP_WHY') {
    if (lastK) return { parts:[{ type:'heading', text:`🧠 Why: ${lastK.title}` },{ type:'text', text: lastK.keyFacts[2]||`Here is the reasoning behind ${lastK.title}:` },...(lastK.keyFacts.length>3?[{ type:'list', items:lastK.keyFacts.slice(2,5) }]:[]),{ type:'suggestions', items:[`Explain ${lastK.title} fully`,`Quiz me on ${lastK.title}`,'Tell me more'] }], topic:lastK.topic, subject:lastK.subject }
    return { parts:[{ type:'text', text:"Which topic are you asking 'why' about?" }] }
  }
  if (intent==='FOLLOWUP_NEXT_QUIZ') {
    if (mem.lastTopic && mem.lastSubject) {
      const k = await loadTopicKnowledge(mem.lastTopic, mem.lastSubject)
      if (k) return generateQuizResponse(k, context.quizSession)
    }
    return { parts:[{ type:'text', text:"Which topic should I quiz you on? e.g. _'Quiz me on forces'_" }] }
  }

  if (intent==='GREET')     return generateGreetResponse(context.studentName)
  if (intent==='THANKS')    return generateThanksResponse()
  if (intent==='RECOMMEND') {
    const parts=[{ type:'heading', text:'🗺️ Study Recommendation' }]
    if (mem.sessionTopics.length>0)
      parts.push({ type:'text', text:`You've been studying **${mem.sessionTopics[mem.sessionTopics.length-1].replace(/_/g,' ')}** today. Great next step: quiz yourself on it, then try a related topic.` })
    else
      parts.push({ type:'text', text:`Start with the topic you find hardest — that's where revision has the biggest impact. The 🧠 AI Tutor page also gives personalised recommendations.` })
    parts.push({ type:'list', title:'📚 High-value UNEB topics:', items:['Mathematics: Quadratic equations, Trigonometry, Vectors, Logarithms','Physics: Forces & Motion, Electricity, Waves, Radioactivity','Biology: Cells, Genetics, Ecology, Nutrition','Chemistry: Acids & Bases, Stoichiometry, Organic Chemistry, Bonding'] })
    parts.push({ type:'suggestions', items:['Quiz me on quadratic equations','Explain genetics','Explain electricity','Exam tips for chemistry'] })
    return { parts }
  }

  // Load knowledge
  const topicResult = extractTopic(input)
  let knowledge = null
  if (topicResult) {
    knowledge = await loadTopicKnowledge(topicResult.topic, topicResult.subject, topicResult.level)
  } else if (mem.lastTopic && mem.lastSubject && ['HINT','CALCULATE'].includes(intent)) {
    knowledge = await loadTopicKnowledge(mem.lastTopic, mem.lastSubject)
  }

  if (knowledge) {
    mem.lastTopic = knowledge.topic; mem.lastSubject = knowledge.subject; mem.lastKnowledge = knowledge
    if (!mem.sessionTopics.includes(knowledge.topic)) mem.sessionTopics.push(knowledge.topic)
  }

  switch (intent) {
    case 'EXPLAIN':   return generateExplainResponse(knowledge, input)
    case 'CALCULATE': return generateCalculateResponse(knowledge, input)
    case 'QUIZ':      return generateQuizResponse(knowledge, context.quizSession)
    case 'HINT':      return generateHintResponse(knowledge, input)
    case 'EXAM_TIP':  return generateExamTipResponse(knowledge, input)
    case 'COMPARE':   return generateExplainResponse(knowledge, input)
    default:          return generateExplainResponse(knowledge, input)
  }
}

// ═══════════════════════════════════════════════════════════════════
// QUICK TOPIC CHIPS
// ═══════════════════════════════════════════════════════════════════

export const QUICK_TOPICS = [
  { label:'📐 Algebra',           query:'Explain algebra' },
  { label:'📊 Probability',       query:'Explain probability' },
  { label:'⚛️ Cells',             query:'What is a cell?' },
  { label:'⚡ Forces',            query:'Explain forces' },
  { label:'🧪 Acids & Bases',     query:'What are acids and bases?' },
  { label:'🌿 Photosynthesis',    query:'Explain photosynthesis' },
  { label:'🔢 Quadratics',        query:'Explain quadratic equations' },
  { label:'💧 Osmosis',           query:'What is osmosis?' },
  { label:'🔋 Electricity',       query:'Explain electricity' },
  { label:'🧬 Genetics',          query:'Explain genetics' },
  { label:'📉 Logarithms',        query:'Explain logarithms' },
  { label:'⚗️ Moles',             query:'How do I calculate moles?' },
  { label:'🎯 Exam Tips',         query:'Exam tips for physics' },
  { label:'🧮 Solve Problem',     query:'Find force if mass=5kg acceleration=3m/s²' },
]
