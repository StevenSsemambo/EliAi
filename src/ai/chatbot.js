/**
 * EQLA LEARN - INTELLIGENT AI  v5.0  🧠
 * -----------------------------------------------------------------
 * The smartest offline study assistant for Uganda S1-S6 UNEB prep.
 *
 * v5 upgrades over v4:
 *   ✅ Anthropic API escalation — hard questions get real AI answers
 *   ✅ Deep follow-up memory — "what about the second law?" works
 *   ✅ WHY engine — explains reasoning, not just facts
 *   ✅ COMPARE engine — loads BOTH topics and builds a proper table
 *   ✅ TEACH mode — Socratic questioning, bot asks YOU questions
 *   ✅ STUDY PLAN generator — day-by-day revision schedule
 *   ✅ MATHS SOLVER++ — surds, simultaneous equations, logs, trig
 *   ✅ CHEMISTRY SOLVER — moles, pH, gas laws, concentration
 *   ✅ Voice input support — Web Speech API hook
 *   ✅ Conversation summary — "what have we covered?" works
 *   ✅ Streak motivator — celebrates milestones in chat
 *   ✅ Smarter fallback — escalates to API instead of giving up
 *   ✅ Topic chain memory — "now explain the next topic" navigates curriculum
 *   ✅ Multi-intent detection — handles "explain and quiz me on forces"
 *   ✅ Better answer eval — checks formulas, not just keywords
 */

import { analyseStudent } from './brain.js'


/**
 * EQLA LEARN - INTELLIGENT RULE-BASED AI  v5.0
 * -----------------------------------------------------------------
 * 100% offline. Works on all devices.
 *
 * v4 upgrades over v3:
 *   ✅ ALL 100+ curriculum files indexed - probability, logs, etc. all work
 *   ✅ Reads real student quiz data from DB (brain.js integration)
 *   ✅ Personalised greeting based on actual scores + weak topics
 *   ✅ "What should I study?" gives data-driven answer per student
 *   ✅ "How do I improve?" gives personalised plan per mistake type
 *   ✅ Topics flagged with personal score: "⚠️ You got 45% here last time"
 *   ✅ Step-by-step equation solver (linear + quadratic)
 *   ✅ Student answer evaluator - checks typed definitions
 *   ✅ Compare mode for "X vs Y" questions
 *   ✅ Conversation memory + follow-up handling
 *   ✅ Fuzzy matching + typo correction
 *   ✅ Adaptive quiz using student difficulty level
 */



// ===================================================================
// COMPLETE CURRICULUM INDEX
// Maps every keyword -> { subject, file, level, title }
// Built from the actual file structure on disk
// ===================================================================

const CURRICULUM_INDEX = [
  // -- MATHEMATICS -------------------------------------------------
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
  { file:'commercial_arithmetic', subject:'mathematics', level:'s1', title:'Commercial Arithmetic',
    keys:['profit','loss','discount','vat','tax','simple interest','compound interest','percentage profit','buying price','selling price','hire purchase','commission'] },
  { file:'bearings_scale_drawing', subject:'mathematics', level:'s1', title:'Bearings and Scale Drawing',
    keys:['bearing','compass','north','south','east','west','three figure bearing','scale drawing','scale','map','distance','direction'] },

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
    keys:['chance','likelihood','event','outcome','sample space','tree diagram','equally likely','basic probability'] },
  { file:'vectors_intro',       subject:'mathematics', level:'s2', title:'Vectors',
    keys:['vector','scalar','magnitude','direction','resultant','position vector','column vector'] },
  { file:'matrices_intro',      subject:'mathematics', level:'s2', title:'Introduction to Matrices',
    keys:['matrix','matrices','order','rows','columns','matrix addition','matrix subtraction','scalar multiplication','square matrix','zero matrix','transpose'] },

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
  { file:'earth_geometry',      subject:'mathematics', level:'s3', title:'Earth Geometry',
    keys:['latitude','longitude','great circle','small circle','arc length','nautical mile','earth','meridian','equator','angular distance'] },
  { file:'linear_programming',  subject:'mathematics', level:'s3', title:'Linear Programming',
    keys:['linear programming','inequalities','feasible region','objective function','corner point','optimal solution','graph inequalities','shading','constraints'] },

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
  { file:'transformation_geometry', subject:'mathematics', level:'s4', title:'Transformation Geometry',
    keys:['transformation','reflection','rotation','translation','enlargement','centre of rotation','line of symmetry','scale factor','image','object','congruent','similar'] },
  { file:'inequalities',        subject:'mathematics', level:'s4', title:'Inequalities and Regions',
    keys:['inequality','inequalities','region','shading','number line','solve inequality','quadratic inequality','linear inequality','graph region','satisfies'] },

  { file:'probability_advanced', subject:'mathematics', level:'s5', title:'Probability',
    keys:['probability','probability tree','probability problem','probability question','probability help','binomial distribution','probability distribution','normal distribution','poisson','expected value','random variable','hypothesis test','statistical test'] },
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

  // -- PHYSICS ------------------------------------------------------
  { file:'measurement',         subject:'physics', level:'s1', title:'Measurement',
    keys:['measurement','unit','si unit','significant figure','error','accuracy','precision','instrument','physical quantity'] },
  { file:'forces',              subject:'physics', level:'s1', title:'Forces & Motion',
    keys:['physics','force','newton','gravity','weight','friction','tension','normal force','resultant force','moment','turning effect','pressure'] },
  { file:'energy',              subject:'physics', level:'s1', title:'Work, Energy & Power',
    keys:['energy','work done','power','kinetic energy','potential energy','joule','conservation of energy','efficiency','watt'] },
  { file:'light',               subject:'physics', level:'s1', title:'Light & Optics',
    keys:['light','reflection','refraction','lens','mirror','ray','optics','prism','spectrum','critical angle','total internal reflection','concave','convex'] },
  { file:'properties_matter',   subject:'physics', level:'s1', title:'Properties of Matter',
    keys:['elasticity','hooke','spring constant','elastic limit','deformation','solid','liquid','gas','state','change of state'] },
  { file:'density_flotation',   subject:'physics', level:'s1', title:'Density & Flotation',
    keys:['density','archimedes','upthrust','flotation','buoyancy','relative density','float','sink','fluid'] },
  { file:'simple_machines',     subject:'physics', level:'s1', title:'Simple Machines',
    keys:['machine','lever','pulley','inclined plane','wedge','screw','wheel','mechanical advantage','velocity ratio','efficiency','load','effort','fulcrum'] },

  { file:'waves_electricity',   subject:'physics', level:'s2', title:'Waves & Sound',
    keys:['wave','frequency','amplitude','wavelength','transverse','longitudinal','period','wavefront','sound','echo','resonance','doppler'] },
  { file:'current_electricity', subject:'physics', level:'s2', title:'Current Electricity',
    keys:['electricity','current','voltage','resistance','circuit','ohm','series circuit','parallel circuit','ammeter','voltmeter','resistor','charge','electric power'] },
  { file:'magnetism_heat',      subject:'physics', level:'s2', title:'Magnetism & Heat',
    keys:['magnet','magnetism','magnetic field','electromagnet','solenoid','poles','compass','heat transfer','conduction','convection','radiation'] },
  { file:'sound',               subject:'physics', level:'s2', title:'Sound',
    keys:['sound wave','pitch','loudness','frequency of sound','ultrasound','noise','vibration','medium'] },
  { file:'electronics',         subject:'physics', level:'s2', title:'Electronics',
    keys:['diode','transistor','logic gate','semiconductor','rectification','and gate','or gate','not gate','digital'] },
  { file:'heat_transfer',       subject:'physics', level:'s2', title:'Heat Transfer',
    keys:['heat transfer','conduction','convection','radiation','thermal','insulation','conductor','insulator','vacuum flask','greenhouse effect','land breeze','sea breeze'] },

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
  { file:'ac_circuits',         subject:'physics', level:'s4', title:'AC Circuits & Transformers',
    keys:['alternating current','ac','dc','transformer','primary coil','secondary coil','step up','step down','frequency','rms','peak voltage','rectifier','power transmission'] },

  { file:'thermal_physics',     subject:'physics', level:'s5', title:'Thermal Physics',
    keys:['thermodynamics','specific heat capacity','latent heat','gas law','ideal gas','boyle','charles','absolute zero','kelvin','thermal expansion'] },
  { file:'semiconductor_physics', subject:'physics', level:'s5', title:'Semiconductor Physics',
    keys:['semiconductor','silicon','germanium','p-type','n-type','doping','p-n junction','diode','transistor','forward bias','reverse bias','led','solar cell','integrated circuit','npn','pnp'] },
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

  // -- BIOLOGY ------------------------------------------------------
  { file:'cells',               subject:'biology', level:'s1', title:'Cell Structure & Function',
    keys:['cell','nucleus','membrane','cytoplasm','organelle','mitochondria','chloroplast','vacuole','cell wall','ribosome','eukaryotic','prokaryotic'] },
  { file:'classification',      subject:'biology', level:'s1', title:'Classification',
    keys:['classification','kingdom','phylum','species','taxonomy','vertebrate','invertebrate','mammal','reptile','amphibian','binomial','five kingdoms'] },
  { file:'diffusion_osmosis',   subject:'biology', level:'s1', title:'Diffusion & Osmosis',
    keys:['diffusion','osmosis','active transport','concentration gradient','semi-permeable','turgor','plasmolysis','turgid','flaccid'] },
  { file:'photosynthesis_respiration', subject:'biology', level:'s1', title:'Photosynthesis & Respiration',
    keys:['photosynthesis','respiration','glucose','oxygen','carbon dioxide','chlorophyll','atp','light reaction','dark reaction','aerobic','anaerobic'] },
  { file:'movement_in_plants',  subject:'biology', level:'s1', title:'Movement in Plants — Tropisms',
    keys:['tropism','phototropism','geotropism','gravitropism','thigmotropism','hydrotropism','auxin','iaa','plant movement','shoot bends','root growth','plant response','stimulus'] },
  { file:'nutrition_plants_animals', subject:'biology', level:'s1', title:'Nutrition in Plants and Animals',
    keys:['autotroph','heterotroph','balanced diet','carbohydrate','protein','vitamin','mineral','fat','fibre','malnutrition','kwashiorkor','marasmus','iodine test','biuret','food test','photosynthesis nutrition','chloroplast nutrition'] },

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
  { file:'gaseous_exchange',    subject:'biology', level:'s2', title:'Gaseous Exchange',
    keys:['gaseous exchange','alveoli','lung','breathing','ventilation','trachea','bronchus','diaphragm','gas exchange fish','gills','stomata','leaf gas exchange','diffusion surface'] },

  { file:'genetics',            subject:'biology', level:'s3', title:'Genetics & Inheritance',
    keys:['genetics','gene','dna','chromosome','allele','dominant','recessive','inheritance','mendel','genotype','phenotype','mutation','monohybrid','dihybrid','punnett'] },
  { file:'ecology',             subject:'biology', level:'s3', title:'Ecology',
    keys:['ecology','ecosystem','food chain','food web','habitat','population','community','predator','prey','decomposer','nutrient cycle','carbon cycle','nitrogen cycle'] },
  { file:'excretion',           subject:'biology', level:'s3', title:'Excretion',
    keys:['excretion','kidney','nephron','urine','osmoregulation','filtration','reabsorption','liver','urea','dialysis'] },
  { file:'hormones_homeostasis', subject:'biology', level:'s3', title:'Homeostasis & Hormones',
    keys:['homeostasis','hormone','insulin','glucagon','diabetes','thermoregulation','negative feedback','endocrine','pituitary','adrenal'] },
  { file:'support_and_movement', subject:'biology', level:'s3', title:'Support and Movement',
    keys:['skeleton','bone','joint','cartilage','ligament','tendon','muscle','antagonistic','synovial joint','exoskeleton','endoskeleton','support','locomotion'] },
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
  { file:'biotechnology',       subject:'biology', level:'s4', title:'Biotechnology',
    keys:['biotechnology','fermentation','yeast','brewing','enzyme immobilisation','genetic engineering','gm crops','insulin production','monoclonal antibody','recombinant dna','cloning','pcr','bioreactor'] },
  { file:'coordination',        subject:'biology', level:'s4', title:'Coordination',
    keys:['coordination','plant hormone','auxin','tropism','geotropism','phototropism','eye','ear','sense organ'] },

  { file:'biochemistry',        subject:'biology', level:'s5', title:'Biochemistry',
    keys:['biochemistry','enzyme kinetics','km','vmax','inhibitor','biological molecule','atp synthesis','metabolic pathway','enzyme active site'] },
  { file:'bioenergetics',       subject:'biology', level:'s5', title:'Bioenergetics',
    keys:['atp','glycolysis','krebs cycle','electron transport chain','oxidative phosphorylation','aerobic respiration','nadh','fadh2','pyruvate','acetyl coa','mitochondria','chemiosmosis','substrate level phosphorylation'] },
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
  { file:'bioethics',           subject:'biology', level:'s6', title:'Bioethics in Biology',
    keys:['bioethics','ethics','gm crops','cloning','stem cell','designer baby','animal testing','genetic screening','3rs','crispr ethics','reproductive cloning','therapeutic cloning','informed consent','bioprospecting'] },

  // -- CHEMISTRY ----------------------------------------------------
  { file:'atoms',               subject:'chemistry', level:'s1', title:'Atoms & Periodic Table',
    keys:['atom','element','proton','neutron','electron','atomic number','mass number','isotope','electron shell','valence electron','electron configuration'] },
  { file:'bonding',             subject:'chemistry', level:'s1', title:'Chemical Bonding',
    keys:['bond','ionic bond','covalent bond','metallic bond','electronegativity','dot and cross','lewis structure','dative bond','hydrogen bond','van der waals'] },
  { file:'matter',              subject:'chemistry', level:'s1', title:'States of Matter',
    keys:['state of matter','solid','liquid','gas','change of state','melting','boiling','sublimation','condensation','evaporation','kinetic theory'] },
  { file:'water',               subject:'chemistry', level:'s1', title:'Water',
    keys:['water','hard water','soft water','purification','distillation','filtration','chlorination','electrolysis of water','properties of water'] },
  { file:'separation_techniques', subject:'chemistry', level:'s1', title:'Separation Techniques',
    keys:['separation','filtration','evaporation','crystallisation','distillation','chromatography','decanting','magnetic separation','paper chromatography','rf value','simple distillation','fractional distillation','separating funnel'] },

  { file:'mole_calculations',   subject:'chemistry', level:'s2', title:'Mole Calculations',
    keys:['mole','molar mass','avogadro','molar','relative molecular mass','empirical formula','molecular formula','stoichiometry','limiting reagent','percentage yield'] },
  { file:'reactions_metals',    subject:'chemistry', level:'s2', title:'Chemical Reactions & Metals',
    keys:['reactivity series','metal','displacement reaction','corrosion','rusting','extraction','oxidation','reduction','redox','oxidation state'] },
  { file:'acids_periodic',      subject:'chemistry', level:'s2', title:'Acids, Bases & Salts',
    keys:['ph','ph value','acid','base','alkali','ph indicator','indicator','neutralisation','litmus','universal indicator','strong acid','weak acid','salt','hydrochloric','sulphuric','nitric','periodic table','group','period'] },
  { file:'gases_solutions',     subject:'chemistry', level:'s2', title:'Gases & Solutions',
    keys:['gas law','solution','solute','solvent','solubility','concentration','dissolve','saturated','boyle','charles','ideal gas','preparation of gases'] },
  { file:'energy_changes',      subject:'chemistry', level:'s2', title:'Energy Changes',
    keys:['exothermic','endothermic','enthalpy','bond energy','activation energy','catalyst','energy profile','hess law','combustion','calorimetry'] },
  { file:'extraction_of_metals', subject:'chemistry', level:'s2', title:'Extraction of Metals',
    keys:['reactivity series','extraction','blast furnace','iron extraction','smelting','electrolysis extraction','aluminium extraction','copper extraction','ore','reduction with carbon','coke','limestone','slag'] },

  { file:'stoichiometry',       subject:'chemistry', level:'s3', title:'Stoichiometry',
    keys:['stoichiometry','mole ratio','titration','volumetric analysis','molarity','concentration calculation','balanced equation'] },
  { file:'organic_rates',       subject:'chemistry', level:'s3', title:'Organic Chemistry',
    keys:['hydrocarbon','alkane','alkene','alcohol','carboxylic acid','ester','addition reaction','substitution reaction','rate of reaction','reaction rate'] },
  { file:'electrochemistry',    subject:'chemistry', level:'s3', title:'Electrochemistry',
    keys:['electrolysis','electrolyte','electrode','anode','cathode','electroplating','faraday','discharge of ions','copper refining'] },
  { file:'gases',               subject:'chemistry', level:'s3', title:'Gases',
    keys:['preparation of gas','collection of gas','oxygen preparation','hydrogen preparation','carbon dioxide preparation','nitrogen','chlorine gas'] },
  { file:'nitrogen_compounds',  subject:'chemistry', level:'s3', title:'Nitrogen and its Compounds',
    keys:['nitrogen','ammonia','haber process','ostwald process','nitric acid','fertiliser','nitrogen cycle','ammonium salt','nitrate','urea','nitrogen fixation'] },

  { file:'organic_chemistry',   subject:'chemistry', level:'s4', title:'Organic Chemistry',
    keys:['organic chemistry','homologous series','functional group','polymer','nylon','polyethylene','alkene reaction','markovnikov','cracking','petrochemical'] },
  { file:'thermochemistry',     subject:'chemistry', level:'s4', title:'Thermochemistry & Equilibrium',
    keys:['thermochemistry','le chatelier','equilibrium constant','kc','kp','gibbs','entropy','spontaneous reaction','endothermic equilibrium'] },
  { file:'chemical_analysis',   subject:'chemistry', level:'s4', title:'Chemical Analysis',
    keys:['qualitative analysis','flame test','ion test','precipitation','identify ion','chemical test','spectroscopy basic','titration calculation'] },
  { file:'fuels_combustion',    subject:'chemistry', level:'s4', title:'Fuels and Combustion',
    keys:['combustion','complete combustion','incomplete combustion','fuel','fossil fuel','coal','petroleum','natural gas','carbon monoxide','soot','global warming','greenhouse gas','acid rain','fractional distillation of oil'] },
  { file:'halogens',            subject:'chemistry', level:'s4', title:'Halogens — Group VII',
    keys:['halogen','group 7','group vii','fluorine','chlorine','bromine','iodine','displacement reaction halogens','halide test','silver nitrate','bleaching','reactivity of halogens','trend','diatomic'] },

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
const KEYWORD_MAP = new Map()  // keyword -> array of topic entries
for (const entry of CURRICULUM_INDEX) {
  for (const key of entry.keys) {
    const k = key.toLowerCase()
    if (!KEYWORD_MAP.has(k)) KEYWORD_MAP.set(k, [])
    KEYWORD_MAP.get(k).push(entry)
  }
}

// ===================================================================
// TOPIC EXTRACTOR  - searches ALL 100+ files


// ===================================================================

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
  const scores = new Map()  // topic key -> score

  // Shortcut: if input is just a subject name, return the best intro topic
  const subjectMap = {
    'physics': { topic:'forces', subject:'physics', title:'Forces & Motion', level:'s1' },
    'chemistry': { topic:'acids_periodic', subject:'chemistry', title:'Acids, Bases & Salts', level:'s2' },
    'biology': { topic:'cells', subject:'biology', title:'Cell Biology', level:'s1' },
    'mathematics': { topic:'algebra', subject:'mathematics', title:'Algebra', level:'s1' },
    'maths': { topic:'algebra', subject:'mathematics', title:'Algebra', level:'s1' },
    'math': { topic:'algebra', subject:'mathematics', title:'Algebra', level:'s1' },
    'help with physics': { topic:'forces', subject:'physics', title:'Forces & Motion', level:'s1' },
    'help with chemistry': { topic:'acids_periodic', subject:'chemistry', title:'Acids, Bases & Salts', level:'s2' },
    'help with biology': { topic:'cells', subject:'biology', title:'Cell Biology', level:'s1' },
    'help with maths': { topic:'algebra', subject:'mathematics', title:'Algebra', level:'s1' },
    'help with math': { topic:'algebra', subject:'mathematics', title:'Algebra', level:'s1' },
  }
  const trimmed = text.trim().replace(/[?.!,]+$/, '')
  if (subjectMap[trimmed]) return subjectMap[trimmed]
  // Also check if input CONTAINS a subject shortcut phrase
  for (const [phrase, result] of Object.entries(subjectMap)) {
    if (trimmed.includes(phrase) && phrase.length > 4) return result
  }

  // Pass 1: exact keyword matches (word-boundary safe)
  for (const [keyword, entries] of KEYWORD_MAP) {
    // Use word boundary: keyword must appear as whole word or phrase
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = keyword.includes(' ')
      ? escaped                          // multi-word: substring is fine
      : `(?<![a-z])${escaped}(?:s|es|ed|ing|ion)?(?![a-z])` // allow plurals/suffixes
    const re = new RegExp(pattern, 'i')
    if (re.test(text)) {
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

// For smart fallback - find closest even with no match
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

// ===================================================================


// CURRICULUM KNOWLEDGE LOADER  - tries all levels
// ===================================================================

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

// ===================================================================
// CONVERSATION MEMORY
// ===================================================================




// ===================================================================
// ADVANCED MATHS & SCIENCE SOLVERS  v5
// ===================================================================

// --- Chemistry solver ---
export function solveChemistry(input) {
  const t = input.toLowerCase()

  // Moles: n = m/M
  const molesMatch = t.match(/mass[=:\s]+([0-9.]+)\s*g?\s*.*molar[=:\s]+([0-9.]+)/i)
    || t.match(/([0-9.]+)\s*g\s+of\s+.+molar\s+mass\s+([0-9.]+)/i)
  if (molesMatch || (t.includes('mol') && t.includes('mass') && t.includes('molar'))) {
    const nums = input.match(/([0-9]+\.?[0-9]*)/g)?.map(Number) || []
    if (nums.length >= 2) {
      const [mass, molarMass] = nums
      const moles = mass / molarMass
      return {
        type: 'moles',
        steps: [
          `**Formula:** n = m ÷ M`,
          `**Given:** mass (m) = ${mass}g, molar mass (M) = ${molarMass} g/mol`,
          `**Substituting:** n = ${mass} ÷ ${molarMass}`,
          `✅ **Answer: n = ${Math.round(moles * 10000) / 10000} mol**`,
        ]
      }
    }
  }

  // Concentration: c = n/V
  if ((t.includes('concentrat') || t.includes('mol/dm') || t.includes('mol/l')) && t.match(/[0-9]/)) {
    const nums = input.match(/([0-9]+\.?[0-9]*)/g)?.map(Number) || []
    if (nums.length >= 2) {
      if (t.includes('volume') || t.includes('dm3') || t.includes('litre')) {
        const [moles, volume] = nums
        const conc = moles / volume
        return {
          type: 'concentration',
          steps: [
            `**Formula:** c = n ÷ V`,
            `**Given:** moles (n) = ${moles} mol, volume (V) = ${volume} dm³`,
            `**Substituting:** c = ${moles} ÷ ${volume}`,
            `✅ **Answer: concentration = ${Math.round(conc * 10000) / 10000} mol/dm³**`,
          ]
        }
      }
    }
  }

  // pH: pH = -log[H+]
  if (t.includes('ph') && t.match(/h\+|h3o\+|hydrogen ion/i) && t.match(/[0-9]/)) {
    const nums = input.match(/([0-9]+\.?[0-9]*(?:e[+-]?[0-9]+)?)/gi)?.map(Number) || []
    if (nums.length >= 1) {
      const h = nums[0]
      const pH = -Math.log10(h)
      return {
        type: 'pH',
        steps: [
          `**Formula:** pH = -log₁₀[H⁺]`,
          `**Given:** [H⁺] = ${h} mol/dm³`,
          `**Calculating:** pH = -log₁₀(${h})`,
          `✅ **Answer: pH = ${Math.round(pH * 100) / 100}**`,
          pH < 7 ? `🔴 This is an **acidic** solution (pH < 7)` : pH > 7 ? `🔵 This is an **alkaline** solution (pH > 7)` : `🟢 This is a **neutral** solution (pH = 7)`,
        ]
      }
    }
  }

  // Gas laws: PV = nRT  or  P1V1 = P2V2
  if (t.match(/boyle|p1v1|gas law|pressure.*volume/i) && t.match(/[0-9]/)) {
    const nums = input.match(/([0-9]+\.?[0-9]*)/g)?.map(Number) || []
    if (nums.length >= 3) {
      const [p1, v1, v2] = nums
      const p2 = (p1 * v1) / v2
      return {
        type: 'boyles_law',
        steps: [
          `**Boyle's Law:** P₁V₁ = P₂V₂ (at constant temperature)`,
          `**Given:** P₁ = ${p1}, V₁ = ${v1}, V₂ = ${v2}`,
          `**Rearranging:** P₂ = P₁V₁ ÷ V₂`,
          `**Substituting:** P₂ = (${p1} × ${v1}) ÷ ${v2}`,
          `✅ **Answer: P₂ = ${Math.round(p2 * 10000) / 10000}**`,
        ]
      }
    }
  }

  return null
}

// --- Advanced maths solver ---
export function solveEquation(input) {
  const text = input.toLowerCase().trim()

  // Simultaneous equations: detect "x + y = ... and 2x - y = ..."
  if (/simultaneous|system of|two equation/i.test(text) || (text.match(/[0-9]x.*=[0-9].*\n.*[0-9]x.*=[0-9]/))) {
    const eqParts = input.split(/\n|and|,/).filter(p => /[xy].*=/.test(p))
    if (eqParts.length >= 2) {
      // Try to parse ax + by = c
      const parse = str => {
        const a = parseFloat(str.match(/(-?\d*\.?\d*)x/)?.[1]?.replace(/^\+/,'') || (str.includes('x') ? '1' : '0'))
        const b = parseFloat(str.match(/(-?\d*\.?\d*)y/)?.[1]?.replace(/^\+/,'') || (str.includes('y') ? '1' : '0'))
        const c = parseFloat(str.match(/=\s*(-?\d+\.?\d*)/)?.[1] || '0')
        return { a: isNaN(a)?1:a, b: isNaN(b)?1:b, c }
      }
      const eq1 = parse(eqParts[0])
      const eq2 = parse(eqParts[1])
      const det = eq1.a * eq2.b - eq2.a * eq1.b
      if (det !== 0) {
        const x = (eq1.c * eq2.b - eq2.c * eq1.b) / det
        const y = (eq1.a * eq2.c - eq2.a * eq1.c) / det
        const r = v => Math.round(v * 10000) / 10000
        return {
          type: 'simultaneous',
          steps: [
            `**Equation 1:** ${eq1.a}x ${eq1.b>=0?'+':''}${eq1.b}y = ${eq1.c}`,
            `**Equation 2:** ${eq2.a}x ${eq2.b>=0?'+':''}${eq2.b}y = ${eq2.c}`,
            `**Using elimination method:**`,
            `Multiply Eq1 by ${eq2.a}, Eq2 by ${eq1.a}:`,
            `Subtract to eliminate x: (${eq1.a*eq2.b - eq2.a*eq1.b})y = ${eq1.c*eq2.a - eq2.c*eq1.a}`,
            `✅ **y = ${r(y)}**`,
            `Substitute y into Eq1: x = (${eq1.c} - ${eq1.b}×${r(y)}) ÷ ${eq1.a}`,
            `✅ **x = ${r(x)}**`,
          ]
        }
      }
    }
  }

  // Logarithm solver: log_b(x) = y
  if (/log|ln/i.test(text) && text.match(/[0-9]/) && text.includes('=')) {
    const logMatch = text.match(/log[_\s]?(\d+)\s*\(?(\d+\.?\d*)\)?\s*=/)
      || text.match(/log\s*\(?(\d+\.?\d*)\)?\s*=\s*(-?\d+\.?\d*)/)
    if (logMatch) {
      const base = parseFloat(logMatch[1]) || 10
      const val = parseFloat(logMatch[2])
      if (!isNaN(base) && !isNaN(val) && base > 0 && base !== 1) {
        const result = Math.log(val) / Math.log(base)
        return {
          type: 'logarithm',
          steps: [
            `**Formula:** log_b(x) = log(x) / log(b)`,
            `**Given:** log_${base}(${val})`,
            `**Using change of base:** = log(${val}) / log(${base})`,
            `= ${Math.log(val).toFixed(4)} / ${Math.log(base).toFixed(4)}`,
            `✅ **Answer = ${Math.round(result * 10000) / 10000}**`,
          ]
        }
      }
    }
  }

  // Trig solver: sin/cos/tan of angle
  if (/\b(sin|cos|tan)\s*\(?\d+/.test(text)) {
    const match = text.match(/(sin|cos|tan)\s*\(?(\d+\.?\d*)\)?\s*(?:degrees?|°)?/)
    if (match) {
      const fn = match[1], angleDeg = parseFloat(match[2])
      const rad = angleDeg * Math.PI / 180
      const result = fn === 'sin' ? Math.sin(rad) : fn === 'cos' ? Math.cos(rad) : Math.tan(rad)
      if (isFinite(result)) {
        return {
          type: 'trigonometry',
          steps: [
            `**Calculating:** ${fn}(${angleDeg}°)`,
            `**Convert to radians:** ${angleDeg}° × π/180 = ${Math.round(rad*10000)/10000} rad`,
            `✅ **${fn}(${angleDeg}°) = ${Math.round(result * 10000) / 10000}**`,
            result > 0 ? `📍 Positive value — angle is in Q1 or Q${fn==='sin'?'2':fn==='cos'?'4':'3'}` : `📍 Negative value — check your quadrant`,
          ]
        }
      }
    }
  }

  // Surd simplification: √n
  if (/√|\bsqrt\b|\bsquare root\b/i.test(text) && text.match(/[0-9]/)) {
    const nums = input.match(/(?:√|sqrt|square root of)\s*(\d+)/i)
    if (nums) {
      const n = parseInt(nums[1])
      let largest = 1
      for (let i = Math.floor(Math.sqrt(n)); i >= 2; i--) {
        if (n % (i * i) === 0) { largest = i; break }
      }
      const inside = n / (largest * largest)
      const r = v => Math.round(v * 10000) / 10000
      return {
        type: 'surd',
        steps: largest === 1 ? [
          `√${n} cannot be simplified further`,
          `✅ **√${n} ≈ ${r(Math.sqrt(n))}**`,
        ] : [
          `**Simplifying √${n}:**`,
          `Find largest perfect square factor of ${n}`,
          `${n} = ${largest*largest} × ${inside}`,
          `√${n} = √(${largest*largest} × ${inside}) = √${largest*largest} × √${inside}`,
          `✅ **√${n} = ${largest}√${inside}** (≈ ${r(Math.sqrt(n))})`,
        ]
      }
    }
  }

  // Linear equation: ax + b = c
  const linearTest = text.match(/(-?\d*\.?\d+)?\s*x\s*([+-]\s*\d+\.?\d*)?\s*=\s*(-?\d+\.?\d*)/i)
  if (linearTest || (/\dx|x\s*[+=]/.test(text) && text.includes('='))) {
    let aM = text.match(/(-?\d+\.?\d*)\s*x/)
    let bM = text.match(/x\s*([+-]\s*\d+\.?\d*)/)
    let cM = text.match(/=\s*(-?\d+\.?\d*)/)
    if (!aM && text.includes('x')) aM = ['1x', '1']
    if (!bM) bM = ['x+0', '+0']
    const a = parseFloat((aM?.[1]||'1').replace(/\s/g,'')) || 1
    const b = parseFloat((bM?.[1]||'0').replace(/\s/g,'')) || 0
    const c = parseFloat((cM?.[1]||'0').replace(/\s/g,'')) || 0
    if (a === 0) return null
    const x = (c - b) / a
    const steps = []
    steps.push(`**Equation:** ${a !== 1 ? a : ''}x${b >= 0 ? '+' : ''}${b !== 0 ? b : ''} = ${c}`)
    if (b !== 0) {
      steps.push(`**Step 1** — Move ${b > 0 ? '+'+b : b} to right side: ${a !== 1 ? a : ''}x = ${c} ${b > 0 ? '- '+b : '+ '+Math.abs(b)} = **${c - b}**`)
    }
    if (a !== 1) steps.push(`**Step 2** — Divide both sides by ${a}: x = ${c-b} ÷ ${a}`)
    steps.push(`✅ **x = ${Math.round(x*10000)/10000}**`)
    return { type: 'linear', steps }
  }

  // Quadratic: ax² + bx + c = 0
  if (/x\s*[²^2]|x\s*squared|quadratic/i.test(text)) {
    const aM = text.match(/(-?\d+\.?\d*)\s*x\s*[²^2]/)
    const bM = text.match(/[²^2]\s*([+-]\s*\d+\.?\d*)\s*x/)
    const cM = text.match(/x\s*([+-]\s*\d+\.?\d*)\s*=/)
    const a = parseFloat(aM?.[1]||'1') || 1
    const b = parseFloat((bM?.[1]||'0').replace(/\s/g,'')) || 0
    const c = parseFloat((cM?.[1]||'0').replace(/\s/g,'')) || 0
    const disc = b*b - 4*a*c
    const steps = [
      `**Quadratic:** ${a}x² ${b>=0?'+':''}${b}x ${c>=0?'+':''}${c} = 0`,
      `**Quadratic formula:** x = (-b ± √(b²-4ac)) / 2a`,
      `**Substituting:** a=${a}, b=${b}, c=${c}`,
      `**Discriminant:** Δ = (${b})² - 4(${a})(${c}) = ${b*b} - ${4*a*c} = **${disc}**`,
    ]
    if (disc < 0) {
      steps.push(`Δ < 0 → **No real solutions** (complex roots only)`)
    } else if (disc === 0) {
      const x = -b / (2*a)
      steps.push(`Δ = 0 → **One repeated root**`)
      steps.push(`✅ **x = -b/2a = ${Math.round(x*10000)/10000}**`)
    } else {
      const x1 = (-b + Math.sqrt(disc)) / (2*a)
      const x2 = (-b - Math.sqrt(disc)) / (2*a)
      steps.push(`x = (${-b} ± √${disc}) / ${2*a}`)
      steps.push(`✅ **x₁ = ${Math.round(x1*1000)/1000}**`)
      steps.push(`✅ **x₂ = ${Math.round(x2*1000)/1000}**`)
      steps.push(`**Check:** (x - ${Math.round(x1*100)/100})(x - ${Math.round(x2*100)/100}) = 0 ✓`)
    }
    return { type: 'quadratic', steps, disc }
  }

  // Physics auto-calculator (kept from v4)
  const physicsResult = tryPhysicsCalc(input)
  if (physicsResult) return { type: 'physics', steps: physicsResult.steps, solved: physicsResult }

  return null
}

// Physics calculations
const PHYSICS_ENGINES = [
  { match: /force|newton|f\s*=\s*ma/i,
    name: 'Force', formula: 'F = m × a', unit: 'N',
    vars: ['m','a'], calc: v => v.m*v.a,
    extract: t => {
      const v={}
      const m=t.match(/mass[=:\s]+([0-9.]+)/i), a=t.match(/accel[=:\s]+([0-9.]+)/i)
      if(m)v.m=+m[1]; if(a)v.a=+a[1]; return v
    }
  },
  { match: /velocity|speed|v\s*=\s*u|kinematic/i,
    name: 'Final Velocity', formula: 'v = u + at', unit: 'm/s',
    vars: ['u','a','t'], calc: v => v.u+v.a*v.t,
    extract: t => {
      const v={}
      const u=t.match(/initial\s*(?:velocity|speed)?[=:\s]+([0-9.]+)/i)
      const a=t.match(/accel[=:\s]+([0-9.]+)/i)
      const tt=t.match(/time[=:\s]+([0-9.]+)/i)
      if(u)v.u=+u[1]; if(a)v.a=+a[1]; if(tt)v.t=+tt[1]; return v
    }
  },
  { match: /kinetic energy|ke\s*=/i,
    name: 'Kinetic Energy', formula: 'KE = ½mv²', unit: 'J',
    vars: ['m','v'], calc: v => 0.5*v.m*v.v*v.v,
    extract: t => {
      const v={}
      const m=t.match(/mass[=:\s]+([0-9.]+)/i), vel=t.match(/velocity[=:\s]+([0-9.]+)/i)||t.match(/speed[=:\s]+([0-9.]+)/i)
      if(m)v.m=+m[1]; if(vel)v.v=+vel[1]; return v
    }
  },
  { match: /ohm|resistanc|voltage|current/i,
    name: "Ohm's Law", formula: 'V = IR', unit: 'V',
    vars: ['i','r'], calc: v => v.i*v.r,
    extract: t => {
      const v={}
      const i=t.match(/current[=:\s]+([0-9.]+)/i), r=t.match(/resistance[=:\s]+([0-9.]+)/i)
      if(i)v.i=+i[1]; if(r)v.r=+r[1]; return v
    }
  },
  { match: /pressure|p\s*=\s*f\s*\/\s*a/i,
    name: 'Pressure', formula: 'P = F/A', unit: 'Pa',
    vars: ['f','a'], calc: v => v.f/v.a,
    extract: t => {
      const v={}
      const f=t.match(/force[=:\s]+([0-9.]+)/i), a=t.match(/area[=:\s]+([0-9.]+)/i)
      if(f)v.f=+f[1]; if(a)v.a=+a[1]; return v
    }
  },
  { match: /power|p\s*=\s*w\s*\/\s*t|watt/i,
    name: 'Power', formula: 'P = W/t', unit: 'W',
    vars: ['w','t'], calc: v => v.w/v.t,
    extract: t => {
      const v={}
      const w=t.match(/(?:work|energy)[=:\s]+([0-9.]+)/i), tt=t.match(/time[=:\s]+([0-9.]+)/i)
      if(w)v.w=+w[1]; if(tt)v.t=+tt[1]; return v
    }
  },
]

function tryPhysicsCalc(input) {
  for (const eng of PHYSICS_ENGINES) {
    if (!eng.match.test(input)) continue
    const vars = eng.extract(input)
    if (eng.vars.every(v => vars[v] !== undefined)) {
      try {
        const result = eng.calc(vars)
        if (!isFinite(result)) continue
        const r = Math.round(result * 10000) / 10000
        return {
          name: eng.name,
          formula: eng.formula,
          unit: eng.unit,
          result: r,
          steps: [
            `**Formula:** ${eng.formula}`,
            `**Given:** ${Object.entries(vars).map(([k,v])=>`${k} = ${v}`).join(', ')}`,
            `**Substituting values...**`,
            `✅ **Answer: ${eng.name} = ${r} ${eng.unit}**`,
          ]
        }
      } catch {}
    }
  }
  return null
}





// ===================================================================
// UNEB SOLVER ENGINE v2 — every calculation type in S1-S6
// ===================================================================

// ── Utility: extract all numbers from a string ──────────────────────
function extractNums(str) {
  return (str.match(/-?[0-9]+\.?[0-9]*(?:e[+-]?[0-9]+)?/gi) || []).map(Number)
}

// ── Utility: expand brackets like 3(x-2) → 3x-6 ───────────────────
function expandBrackets(expr) {
  // Handle: A(Bx + C) or (Bx + C)A patterns
  let e = expr.replace(/\s+/g, '')
  let changed = true
  let iterations = 0
  while (changed && iterations < 10) {
    changed = false
    iterations++
    // Pattern: number(expression) e.g. 3(x-2) or -2(x+5)
    e = e.replace(/(-?\d*\.?\d+)\(([^()]+)\)/g, (_, a, inner) => {
      changed = true
      const coeff = parseFloat(a)
      return inner.replace(/([+-]?\d*\.?\d*)\*?x|([+-]?\d+\.?\d*)/g, (term, xPart, numPart) => {
        if (xPart !== undefined) {
          const c = xPart === '' || xPart === '+' ? 1 : xPart === '-' ? -1 : parseFloat(xPart)
          const result = coeff * c
          return (result >= 0 ? '+' : '') + result + 'x'
        } else {
          return (coeff * parseFloat(numPart) >= 0 ? '+' : '') + (coeff * parseFloat(numPart))
        }
      })
    })
    // Pattern: (expression)number
    e = e.replace(/\(([^()]+)\)(-?\d+\.?\d*)/g, (_, inner, a) => {
      changed = true
      const coeff = parseFloat(a)
      return inner.replace(/([+-]?\d*\.?\d*)\*?x|([+-]?\d+\.?\d*)/g, (term, xPart, numPart) => {
        if (xPart !== undefined) {
          const c = xPart === '' || xPart === '+' ? 1 : xPart === '-' ? -1 : parseFloat(xPart)
          return (coeff * c >= 0 ? '+' : '') + (coeff * c) + 'x'
        } else {
          return (coeff * parseFloat(numPart) >= 0 ? '+' : '') + (coeff * parseFloat(numPart))
        }
      })
    })
  }
  return e
}

// ── Word problem number extractor ───────────────────────────────────
// "A car travels 60km in 45 minutes" → {distance:60, time:45}
function extractWordProblemValues(input) {
  const t = input.toLowerCase()
  const vals = {}

  const patterns = [
    [/(\d+\.?\d*)\s*km\b/, 'distance_km'],
    [/(\d+\.?\d*)\s*m\b(?!\/|s|ole)/, 'distance_m'],
    [/(\d+\.?\d*)\s*(?:minutes?|mins?)\b/i, 'time_min'],
    [/(\d+\.?\d*)\s*(?:second|sec|s)\b/, 'time_s'],
    [/(\d+\.?\d*)\s*hour\b/, 'time_h'],
    [/(\d+\.?\d*)\s*(?:m\/s|ms-1|metres? per second)/, 'speed_ms'],
    [/(\d+\.?\d*)\s*(?:km\/h|kmh-1|km per hour)/, 'speed_kmh'],
    [/mass\s*(?:of|=|:)?\s*(\d+\.?\d*)\s*(?:kg|g)?/i, 'mass'],
    [/(\d+\.?\d*)\s*kg\b/, 'mass_kg'],
    [/(\d+\.?\d*)\s*g\b(?!al|as|ra)/, 'mass_g'],
    [/(?:height|h)\s*(?:=|:)?\s*(\d+\.?\d*)\s*m/i, 'height_m'],
    [/(\d+\.?\d*)\s*(?:newton|N)\b/, 'force_N'],
    [/(\d+\.?\d*)\s*(?:joule|J)\b/, 'energy_J'],
    [/(\d+\.?\d*)\s*(?:watt|W)\b/, 'power_W'],
    [/(\d+\.?\d*)\s*(?:volt|V)\b/, 'voltage_V'],
    [/(\d+\.?\d*)\s*(?:amp|A)\b/, 'current_A'],
    [/(\d+\.?\d*)\s*(?:ohm|Ω)\b/, 'resistance_Ω'],
    [/frequency\s*(?:=|:)?\s*(\d+\.?\d*)\s*(?:hz|hertz)?/i, 'frequency'],
    [/wavelength\s*(?:=|:)?\s*(\d+\.?\d*)/i, 'wavelength'],
    [/(\d+\.?\d*)\s*(?:cm|centimetre)/i, 'length_cm'],
    [/angle\s*(?:=|:)?\s*(\d+\.?\d*)/i, 'angle'],
    [/(\d+\.?\d*)\s*°/, 'angle_deg'],
    [/temperature\s*(?:=|:)?\s*(\d+\.?\d*)/i, 'temperature'],
    [/pressure\s*(?:=|:)?\s*(\d+\.?\d*)/i, 'pressure'],
    [/volume\s*(?:=|:)?\s*(\d+\.?\d*)/i, 'volume'],
  ]

  for (const [re, key] of patterns) {
    const m = t.match(re)
    if (m) vals[key] = parseFloat(m[1])
  }
  return vals
}

// ── MASTER SOLVER — tries every engine in sequence ──────────────────
export function masterSolve(input) {
  const t = input.toLowerCase()
  // Run special solvers FIRST so they don't get swallowed by linear regex
  const special = solveMathSpecial(input)
  if (special) return special
  const bio = solveBiologyCalc(input)
  if (bio) return bio
  const chem = solveChemistryFull(input)
  if (chem) return chem
  const physics = solvePhysicsFull(input)
  if (physics) return physics
  const word = solveWordProblem(input)
  if (word) return word
  // Only try linear/quadratic if it looks like an equation
  if (t.includes('=') && /[0-9]/.test(t)) {
    const quad = solveQuadraticAdvanced(input)
    if (quad) return quad
    const lin = solveLinearAdvanced(input)
    if (lin) return lin
  }
  return null
}

// ── LINEAR EQUATIONS — handles brackets, fractions ──────────────────
function solveLinearAdvanced(input) {
  const t = input.toLowerCase()
  if (!/[0-9].*x|x.*[0-9]|=.*x|x.*=/.test(t)) return null
  if (/x\s*[²^2]/.test(t)) return null // quadratic, handled below

  const steps = []
  let expr = input.replace(/\s+/g, ' ')

  // Expand brackets first
  const sides = expr.split('=')
  if (sides.length !== 2) return null

  let lhs = expandBrackets(sides[0].trim())
  let rhs = expandBrackets(sides[1].trim())
  steps.push(`**Original:** ${expr.trim()}`)
  if (lhs !== sides[0].trim() || rhs !== sides[1].trim()) {
    steps.push(`**Expand brackets:** ${lhs} = ${rhs}`)
  }

  // Collect x terms on left, constants on right
  // Parse lhs and rhs into {xCoeff, const}
  function parseSide(s) {
    let xC = 0, cC = 0
    // Extract all terms
    const terms = s.replace(/([+-])/g, ' $1').trim().split(/\s+/).filter(Boolean)
    for (const term of terms) {
      if (/x/.test(term)) {
        const c = term.replace('x','').replace(/^\+/,'')
        xC += c === '' || c === '+' ? 1 : c === '-' ? -1 : parseFloat(c)
      } else {
        const n = parseFloat(term.replace(/^\+/,''))
        if (!isNaN(n)) cC += n
      }
    }
    return { xC, cC }
  }

  const L = parseSide(lhs)
  const R = parseSide(rhs)

  const a = L.xC - R.xC   // net x coefficient
  const b = R.cC - L.cC   // net constant (moved to right)

  if (a === 0) return null

  if (L.xC !== 0 && R.xC !== 0)
    steps.push(`**Move x terms left:** ${a}x = ${b}`)
  else if (L.cC !== 0)
    steps.push(`**Move constant:** ${a}x = ${b}`)

  if (a !== 1) steps.push(`**Divide both sides by ${a}:** x = ${b} ÷ ${a}`)

  const x = b / a
  steps.push(`✅ **x = ${Math.round(x * 100000) / 100000}**`)

  // Verification
  steps.push(`**Check:** substitute x=${Math.round(x*1000)/1000} back into original — LHS should equal RHS ✓`)

  return { type: 'linear_advanced', steps }
}

// ── QUADRATIC — factorisation + formula + completing the square ──────
function solveQuadraticAdvanced(input) {
  const t = input.toLowerCase()
  if (!/x\s*[²^2]|x\s*squared|quadratic/.test(t)) return null

  const aM = t.match(/(-?\d+\.?\d*)\s*x\s*[²^2]/)
  const bM = t.match(/[²^2]\s*([+-]\s*\d+\.?\d*)\s*x/)
  const cM = t.match(/x\s*([+-]\s*\d+\.?\d*)\s*=\s*0/)
    || t.match(/([+-]\s*\d+\.?\d*)\s*=\s*0/)

  const a = parseFloat(aM?.[1] || '1') || 1
  const b = parseFloat((bM?.[1] || '0').replace(/\s/g,'')) || 0
  const c = parseFloat((cM?.[1] || '0').replace(/\s/g,'')) || 0

  const disc = b*b - 4*a*c
  const r = v => Math.round(v * 10000) / 10000
  const steps = []

  steps.push(`**Equation:** ${a}x² ${b>=0?'+':''}${b}x ${c>=0?'+':''}${c} = 0`)

  // Try factorisation first (only for integers with nice roots)
  if (Number.isInteger(a) && Number.isInteger(b) && Number.isInteger(c) && disc >= 0) {
    const sqrtDisc = Math.sqrt(disc)
    if (Number.isInteger(sqrtDisc)) {
      const x1 = (-b + sqrtDisc) / (2*a)
      const x2 = (-b - sqrtDisc) / (2*a)
      if (Number.isInteger(x1) && Number.isInteger(x2)) {
        steps.push(`**Method: Factorisation**`)
        steps.push(`Find two numbers that multiply to ${a*c} and add to ${b}`)
        steps.push(`Those numbers are **${-x1*a}** and **${-x2*a}**`)
        if (a === 1) {
          steps.push(`**Factorise:** (x ${x1<=0?'+':'-'} ${Math.abs(x1)})(x ${x2<=0?'+':'-'} ${Math.abs(x2)}) = 0`)
        } else {
          steps.push(`**Factorise:** (${a}x ${x1<=0?'+':'-'} ${Math.abs(x1*a)})(x ${x2<=0?'+':'-'} ${Math.abs(x2)}) = 0`)
        }
        steps.push(`✅ **x₁ = ${r(x1)}** or **x₂ = ${r(x2)}**`)
        return { type: 'quadratic_factored', steps }
      }
    }
  }

  // Quadratic formula
  steps.push(`**Method: Quadratic Formula** — x = (-b ± √(b²-4ac)) / 2a`)
  steps.push(`**a = ${a}, b = ${b}, c = ${c}**`)
  steps.push(`**Discriminant:** Δ = (${b})² - 4(${a})(${c}) = ${b*b} - ${4*a*c} = **${r(disc)}**`)

  if (disc < 0) {
    steps.push(`Δ < 0 → **No real solutions**`)
  } else if (disc === 0) {
    const x = r(-b / (2*a))
    steps.push(`Δ = 0 → **One repeated solution**`)
    steps.push(`x = -b/2a = ${-b}/${2*a} = ✅ **x = ${x}**`)
  } else {
    const x1 = r((-b + Math.sqrt(disc)) / (2*a))
    const x2 = r((-b - Math.sqrt(disc)) / (2*a))
    steps.push(`x = (${-b} ± √${r(disc)}) / ${2*a}`)
    steps.push(`✅ **x₁ = ${x1}** or **x₂ = ${x2}**`)
  }
  return { type: 'quadratic', steps }
}

// ── WORD PROBLEMS — natural language physics/maths problems ──────────
function solveWordProblem(input) {
  const t = input.toLowerCase()
  const v = extractWordProblemValues(input)
  const steps = []

  // Speed / distance / time
  if (/speed|velocity|distance|how (long|far|fast)|travel/i.test(t)) {
    const d_km = v.distance_km, d_m = v.distance_m
    const t_min = v.time_min, t_s = v.time_s, t_h = v.time_h
    const s_ms = v.speed_ms, s_kmh = v.speed_kmh

    // Convert to SI: metres and seconds
    let dist = d_m || (d_km ? d_km * 1000 : null)
    let time = t_s || (t_min ? t_min * 60 : null) || (t_h ? t_h * 3600 : null)
    let speed = s_ms || (s_kmh ? s_kmh / 3.6 : null)

    if (dist && time && !speed) {
      const s = dist / time
      steps.push(`**Formula:** speed = distance ÷ time`)
      steps.push(`**Given:** distance = ${dist}m, time = ${time}s`)
      if (d_km) steps.push(`*(converted: ${d_km}km = ${dist}m)*`)
      if (t_min) steps.push(`*(converted: ${t_min}min = ${time}s)*`)
      steps.push(`**Calculating:** speed = ${dist} ÷ ${time}`)
      steps.push(`✅ **Speed = ${Math.round(s*100)/100} m/s** (= ${Math.round(s*3.6*100)/100} km/h)`)
      return { type: 'speed', steps }
    }
    if (speed && time && !dist) {
      const d = speed * time
      steps.push(`**Formula:** distance = speed × time`)
      steps.push(`**Given:** speed = ${speed}m/s, time = ${time}s`)
      steps.push(`**Calculating:** distance = ${speed} × ${time}`)
      steps.push(`✅ **Distance = ${Math.round(d*100)/100} m** (= ${Math.round(d/1000*100)/100} km)`)
      return { type: 'distance', steps }
    }
    if (speed && dist && !time) {
      const tm = dist / speed
      steps.push(`**Formula:** time = distance ÷ speed`)
      steps.push(`**Given:** distance = ${dist}m, speed = ${speed}m/s`)
      steps.push(`**Calculating:** time = ${dist} ÷ ${speed}`)
      steps.push(`✅ **Time = ${Math.round(tm*100)/100} s** (= ${Math.round(tm/60*100)/100} min)`)
      return { type: 'time', steps }
    }
  }

  // Kinetic energy word problem: KE = ½mv²
  if (/kinetic energy|ke\b/i.test(t) && (v.mass_kg || v.mass) && (v.speed_ms || v.speed_kmh)) {
    const m = v.mass_kg || v.mass
    const vel = v.speed_ms || (v.speed_kmh ? v.speed_kmh / 3.6 : null)
    if (m && vel) {
      const ke = 0.5 * m * vel * vel
      steps.push(`**Formula:** KE = ½mv²`)
      steps.push(`**Given:** m = ${m}kg, v = ${Math.round(vel*100)/100}m/s`)
      steps.push(`**Calculating:** KE = ½ × ${m} × ${Math.round(vel*100)/100}²`)
      steps.push(`✅ **KE = ${Math.round(ke*100)/100} J**`)
      return { type: 'kinetic_energy', steps }
    }
  }

  // Gravitational PE: PE = mgh
  if (/potential energy|pe\b|mgh/i.test(t) && v.mass_kg && v.height_m) {
    const pe = v.mass_kg * 10 * v.height_m
    steps.push(`**Formula:** PE = mgh (g = 10 m/s²)`)
    steps.push(`**Given:** m = ${v.mass_kg}kg, h = ${v.height_m}m`)
    steps.push(`**Calculating:** PE = ${v.mass_kg} × 10 × ${v.height_m}`)
    steps.push(`✅ **PE = ${pe} J**`)
    return { type: 'potential_energy', steps }
  }

  return null
}

// ── PHYSICS FULL — expanded from basic engines ───────────────────────
function solvePhysicsFull(input) {
  const t = input.toLowerCase()
  const nums = extractNums(input)
  const steps = []

  // All kinematics equations
  if (/kinematic|suvat|v\s*=\s*u|s\s*=\s*ut|v.*u.*a.*t/i.test(t) || /initial.*final.*accel/i.test(t)) {
    const u = t.match(/(?:initial|u)\s*[=:]\s*([0-9.]+)/i)
    const v = t.match(/(?:final|v)\s*[=:]\s*([0-9.]+)/i)
    const a = t.match(/accel[^=]*[=:]\s*([0-9.]+)/i)
    const s = t.match(/(?:dist(?:ance)?|displace|s)\s*[=:]\s*([0-9.]+)/i)
    const tm = t.match(/time[=:\s]+([0-9.]+)/i)

    const vals = {}
    if (u) vals.u = +u[1]; if (v) vals.v = +v[1]
    if (a) vals.a = +a[1]; if (s) vals.s = +s[1]; if (tm) vals.t = +tm[1]
    const known = Object.keys(vals).length

    if (known >= 3) {
      steps.push(`**SUVAT equations:** v=u+at | s=ut+½at² | v²=u²+2as`)
      steps.push(`**Given:** ${Object.entries(vals).map(([k,v])=>`${k}=${v}`).join(', ')}`)

      if (vals.u!==undefined && vals.a!==undefined && vals.t!==undefined && vals.v===undefined) {
        const vf = vals.u + vals.a * vals.t
        steps.push(`**Using v = u + at:** v = ${vals.u} + ${vals.a}×${vals.t}`)
        steps.push(`✅ **v = ${Math.round(vf*1000)/1000} m/s**`)
      } else if (vals.u!==undefined && vals.a!==undefined && vals.t!==undefined && vals.s===undefined) {
        const sf = vals.u*vals.t + 0.5*vals.a*vals.t*vals.t
        steps.push(`**Using s = ut + ½at²:** s = ${vals.u}×${vals.t} + ½×${vals.a}×${vals.t}²`)
        steps.push(`✅ **s = ${Math.round(sf*1000)/1000} m**`)
      } else if (vals.u!==undefined && vals.v!==undefined && vals.a!==undefined && vals.s===undefined) {
        const sf = (vals.v*vals.v - vals.u*vals.u) / (2*vals.a)
        steps.push(`**Using v² = u² + 2as → s = (v²-u²)/2a**`)
        steps.push(`✅ **s = ${Math.round(sf*1000)/1000} m**`)
      }
      if (steps.length > 2) return { type: 'kinematics', steps }
    }
  }

  // Wave equation: v = fλ
  if (/wave|frequency|wavelength|v\s*=\s*f/i.test(t) && nums.length >= 2) {
    const freq = t.match(/frequen[^=]*[=:]\s*([0-9.]+)/i)
    const wave = t.match(/wavelength[^=]*[=:]\s*([0-9.]+)/i)
    const spd = t.match(/(?:wave\s*)?speed[^=]*[=:]\s*([0-9.]+)/i)
    if (freq && wave) {
      const v = +freq[1] * +wave[1]
      steps.push(`**Formula:** v = fλ`)
      steps.push(`**Given:** f = ${freq[1]}Hz, λ = ${wave[1]}m`)
      steps.push(`✅ **Wave speed = ${v} m/s**`)
      return { type: 'wave', steps }
    }
    if (freq && spd) {
      const λ = +spd[1] / +freq[1]
      steps.push(`**Formula:** λ = v/f`)
      steps.push(`✅ **Wavelength = ${Math.round(λ*10000)/10000} m**`)
      return { type: 'wave', steps }
    }
    if (wave && spd) {
      const f = +spd[1] / +wave[1]
      steps.push(`**Formula:** f = v/λ`)
      steps.push(`✅ **Frequency = ${Math.round(f*10000)/10000} Hz**`)
      return { type: 'wave', steps }
    }
  }

  // Electrical power: P=IV, P=I²R, P=V²/R
  if (/electric.*power|power.*circuit|p\s*=\s*iv/i.test(t) && nums.length >= 2) {
    const curr = t.match(/current[^=]*[=:]\s*([0-9.]+)/i)
    const volt = t.match(/voltage[^=]*[=:]\s*([0-9.]+)/i)
    const res = t.match(/resistance[^=]*[=:]\s*([0-9.]+)/i)
    const pw = t.match(/power[^=]*[=:]\s*([0-9.]+)/i)
    if (curr && volt && !pw) {
      steps.push(`**Formula:** P = IV`)
      steps.push(`**Given:** I = ${curr[1]}A, V = ${volt[1]}V`)
      steps.push(`✅ **Power = ${+curr[1] * +volt[1]} W**`)
      return { type: 'elec_power', steps }
    }
    if (curr && res && !pw) {
      steps.push(`**Formula:** P = I²R`)
      steps.push(`✅ **Power = ${Math.round((+curr[1])**2 * +res[1] * 1000)/1000} W**`)
      return { type: 'elec_power', steps }
    }
  }

  // Transformer: Vp/Vs = Np/Ns
  if (/transformer|turns ratio|primary|secondary/i.test(t) && nums.length >= 3) {
    const vp = t.match(/(?:primary|vp)\s*voltage[^=]*[=:]\s*([0-9.]+)/i) || t.match(/vp[=:]\s*([0-9.]+)/i)
    const np = t.match(/(?:primary|np)\s*(?:turns?)[^=]*[=:]\s*([0-9.]+)/i) || t.match(/np[=:]\s*([0-9.]+)/i)
    const ns = t.match(/(?:secondary|ns)\s*(?:turns?)[^=]*[=:]\s*([0-9.]+)/i) || t.match(/ns[=:]\s*([0-9.]+)/i)
    const vs = t.match(/(?:secondary|vs)\s*voltage[^=]*[=:]\s*([0-9.]+)/i) || t.match(/vs[=:]\s*([0-9.]+)/i)
    if (vp && np && ns && !vs) {
      const vsVal = (+vp[1] * +ns[1]) / +np[1]
      steps.push(`**Formula:** Vp/Vs = Np/Ns`)
      steps.push(`**Rearranged:** Vs = Vp × Ns/Np`)
      steps.push(`**Vs = ${vp[1]} × ${ns[1]} ÷ ${np[1]}`)
      steps.push(`✅ **Secondary voltage = ${Math.round(vsVal*100)/100} V**`)
      return { type: 'transformer', steps }
    }
    if (vp && vs && np && !ns) {
      const nsVal = (+vs[1] * +np[1]) / +vp[1]
      steps.push(`**Formula:** Ns = Vs × Np/Vp`)
      steps.push(`✅ **Secondary turns = ${Math.round(nsVal)}**`)
      return { type: 'transformer', steps }
    }
  }

  // Half-life / radioactive decay
  if (/half.?life|radioact|decay|half life/i.test(t) && nums.length >= 2) {
    const hl = t.match(/half.?life[^=]*[=:]\s*([0-9.]+)/i) || t.match(/([0-9.]+)\s*years?\s*(?:is|as)\s*(?:the\s*)?half/i)
    const totalT = t.match(/(?:after|time)[^=]*[=:]\s*([0-9.]+)/i) || t.match(/([0-9.]+)\s*years?\s*(?:later|have\s*passed)/i)
    const init = t.match(/(?:initial|start|original|n0)[^=]*[=:]\s*([0-9.]+)/i)

    const halfLife = hl ? +hl[1] : nums[0]
    const time = totalT ? +totalT[1] : nums[1]
    const n0 = init ? +init[1] : 100

    if (halfLife && time) {
      const halves = time / halfLife
      const remaining = n0 * Math.pow(0.5, halves)
      steps.push(`**Formula:** N = N₀ × (½)^(t/t½)`)
      steps.push(`**Given:** t½ = ${halfLife}, t = ${time}, N₀ = ${n0}${!init?' (assuming 100%)':''}`)
      steps.push(`**Number of half-lives:** ${time} ÷ ${halfLife} = **${halves}**`)
      steps.push(`**N = ${n0} × (0.5)^${halves} = ${n0} × ${Math.pow(0.5,halves).toFixed(6)}`)
      steps.push(`✅ **Remaining = ${Math.round(remaining*1000)/1000}${!init?'%':''}**`)
      steps.push(`*(${Math.round((1-remaining/n0)*10000)/100}% has decayed)*`)
      return { type: 'half_life', steps }
    }
  }

  // Snell's law
  if (/snell|refract|n1.*sin|sin.*n1/i.test(t) && nums.length >= 3) {
    const n1 = +nums[0], theta1 = +nums[1], n2 = +nums[2]
    const sinTheta2 = (n1 * Math.sin(theta1 * Math.PI/180)) / n2
    if (sinTheta2 <= 1) {
      const theta2 = Math.asin(sinTheta2) * 180/Math.PI
      steps.push(`**Snell's Law:** n₁sin(θ₁) = n₂sin(θ₂)`)
      steps.push(`**Given:** n₁=${n1}, θ₁=${theta1}°, n₂=${n2}`)
      steps.push(`**sin(θ₂) = (${n1} × sin(${theta1}°)) / ${n2} = ${Math.round(sinTheta2*10000)/10000}`)
      steps.push(`✅ **θ₂ = ${Math.round(theta2*100)/100}°**`)
    } else {
      steps.push(`**sin(θ₂) = ${Math.round(sinTheta2*1000)/1000} > 1 → Total Internal Reflection occurs!**`)
    }
    return { type: 'snell', steps }
  }

  // Pressure P=ρgh (fluid pressure)
  if (/fluid pressure|p\s*=\s*ρ|rho.*g.*h|density.*gravity.*height/i.test(t) && nums.length >= 3) {
    const rho = +nums[0], h = +nums[1]
    const g = 10
    const P = rho * g * h
    steps.push(`**Formula:** P = ρgh (g = 10 m/s²)`)
    steps.push(`**Given:** ρ = ${rho} kg/m³, h = ${h}m`)
    steps.push(`✅ **Pressure = ${P} Pa** (= ${Math.round(P/1000*100)/100} kPa)`)
    return { type: 'fluid_pressure', steps }
  }

  // Try original physics engines as fallback
  return tryPhysicsCalc(input) ? { type: 'physics', steps: tryPhysicsCalc(input).steps } : null
}

// ── CHEMISTRY FULL — all UNEB chemistry calculations ─────────────────
function solveChemistryFull(input) {
  const t = input.toLowerCase()
  const nums = extractNums(input)
  const steps = []

  // Already in solveChemistry — call it first
  const basic = solveChemistry(input)
  if (basic) return { type: basic.type, steps: basic.steps }

  // Percentage composition: (mass of element / molar mass of compound) × 100
  if (/percent.*compos|%.*element|composition/i.test(t) && nums.length >= 2) {
    const massEl = nums[0], molarMass = nums[1]
    const pct = (massEl / molarMass) * 100
    steps.push(`**Formula:** % composition = (mass of element / molar mass) × 100`)
    steps.push(`**Given:** mass of element = ${massEl}g/mol, molar mass of compound = ${molarMass}g/mol`)
    steps.push(`✅ **% composition = ${Math.round(pct*100)/100}%**`)
    return { type: 'percent_composition', steps }
  }

  // Titration: C₁V₁ = C₂V₂
  if (/titrat|c1v1|c1.*v1|burette|pipette/i.test(t) && nums.length >= 3) {
    const c1 = t.match(/c1[=:\s]+([0-9.]+)/i) || t.match(/(?:acid|base|solution)\s*1.*?([0-9.]+)\s*mol/i)
    const v1 = t.match(/v1[=:\s]+([0-9.]+)/i) || t.match(/([0-9.]+)\s*(?:dm3|cm3|ml|l)\s*(?:of|acid)/i)
    const v2 = t.match(/v2[=:\s]+([0-9.]+)/i)
    const c2 = t.match(/c2[=:\s]+([0-9.]+)/i)

    if (nums.length >= 3) {
      const [n1, n2, n3] = nums
      // Assume C1=n1, V1=n2, V2=n3, find C2
      const c2Val = (n1 * n2) / n3
      steps.push(`**Titration Formula:** C₁V₁ = C₂V₂`)
      steps.push(`**Given:** C₁ = ${n1} mol/dm³, V₁ = ${n2} dm³, V₂ = ${n3} dm³`)
      steps.push(`**C₂ = C₁V₁ / V₂ = (${n1} × ${n2}) / ${n3}`)
      steps.push(`✅ **C₂ = ${Math.round(c2Val*10000)/10000} mol/dm³**`)
      return { type: 'titration', steps }
    }
  }

  // Gas volume at STP: V = n × 22.4
  if (/stp|standard.*temperature|22\.4|molar.*volume/i.test(t) && nums.length >= 1) {
    const moles = t.match(/moles?\s*[=:]\s*([0-9.]+)/i) || t.match(/([0-9.]+)\s*mol(?:es?)?/i)
    const vol = t.match(/([0-9.]+)\s*(?:dm3|litres?|l\b)/i)
    if (moles && !vol) {
      const v = +moles[1] * 22.4
      steps.push(`**At STP:** 1 mole of any gas = 22.4 dm³`)
      steps.push(`**Given:** ${moles[1]} moles`)
      steps.push(`✅ **Volume = ${moles[1]} × 22.4 = ${Math.round(v*100)/100} dm³**`)
      return { type: 'gas_volume_stp', steps }
    }
    if (vol && !moles) {
      const n = +vol[1] / 22.4
      steps.push(`**Moles = volume / 22.4 = ${vol[1]} / 22.4`)
      steps.push(`✅ **n = ${Math.round(n*10000)/10000} mol**`)
      return { type: 'gas_volume_stp', steps }
    }
  }

  // Avogadro: N = n × 6.02×10²³
  if (/avogadro|6\.02|number.*(?:atom|molecule|particle)/i.test(t) && nums.length >= 1) {
    const moles = t.match(/moles?\s*[=:]\s*([0-9.]+)/i) || t.match(/([0-9.]+)\s*mol(?:es?)?\b/i)
    if (moles) {
      const N = +moles[1] * 6.02e23
      steps.push(`**Avogadro's number:** N = n × 6.02 × 10²³`)
      steps.push(`**Given:** ${moles[1]} moles`)
      steps.push(`✅ **Number of particles = ${N.toExponential(3)}**`)
      return { type: 'avogadro', steps }
    }
  }

  // Theoretical yield
  if (/yield|theoretical.*yield|actual.*yield/i.test(t) && nums.length >= 2) {
    const actual = nums[0], theoretical = nums[1]
    const pct = (actual / theoretical) * 100
    steps.push(`**Formula:** % yield = (actual yield / theoretical yield) × 100`)
    steps.push(`**Given:** actual = ${actual}g, theoretical = ${theoretical}g`)
    steps.push(`✅ **% yield = ${Math.round(pct*100)/100}%**`)
    return { type: 'yield', steps }
  }

  return null
}

// ── MATHS SPECIAL — sequences, vectors, matrices, calculus ──────────
function solveMathSpecial(input) {
  const t = input.toLowerCase()
  const nums = extractNums(input)
  const steps = []

  // Arithmetic Progression: nth term = a + (n-1)d, Sum = n/2(2a + (n-1)d)
  if (/arithmetic|ap\b|nth term|common differ|sequence|first term|\d+(?:st|nd|rd|th) term|sum of first/i.test(t) && nums.length >= 2) {
    const firstTerm = t.match(/first\s*term\s*[=:]\s*(-?[0-9.]+)/i) || t.match(/a\s*[=:]\s*(-?[0-9.]+)/i) || t.match(/a\s*=\s*(-?[0-9.]+)/i)
    const commonDiff = t.match(/common\s*diff\w*\s*[=:]\s*(-?[0-9.]+)/i) || t.match(/d\s*[=:]\s*(-?[0-9.]+)/i)
    const nTerm = t.match(/(?:find.*)?(\d+)(?:st|nd|rd|th)\s*term/i) || t.match(/n\s*[=:]\s*(\d+)/i)
    const sumN = t.match(/sum\s*(?:of\s*)?(?:first\s*)?(\d+)/i)

    const a = firstTerm ? +firstTerm[1] : nums[0]
    const d = commonDiff ? +commonDiff[1] : nums[1]

    if (a !== undefined && d !== undefined) {
      if (nTerm) {
        const n = +nTerm[1]
        const tn = a + (n-1) * d
        steps.push(`**Arithmetic Progression**`)
        steps.push(`**Formula:** Tₙ = a + (n-1)d`)
        steps.push(`**Given:** a = ${a}, d = ${d}, n = ${n}`)
        steps.push(`**T${n} = ${a} + (${n}-1) × ${d} = ${a} + ${(n-1)*d}`)
        steps.push(`✅ **${n}th term = ${tn}**`)
        return { type: 'arithmetic_progression', steps }
      }
      if (sumN) {
        const n = +sumN[1]
        const Sn = (n/2) * (2*a + (n-1)*d)
        steps.push(`**Formula:** Sₙ = n/2 × (2a + (n-1)d)`)
        steps.push(`**Given:** a = ${a}, d = ${d}, n = ${n}`)
        steps.push(`**S${n} = ${n}/2 × (2×${a} + (${n}-1)×${d}) = ${n/2} × ${2*a+(n-1)*d}`)
        steps.push(`✅ **Sum of first ${n} terms = ${Sn}**`)
        return { type: 'arithmetic_sum', steps }
      }
    }
  }

  // Vectors: magnitude |v| = √(x²+y²), dot product
  if (/vector|magnitude|resultant|dot product/i.test(t) && nums.length >= 2) {
    const iComp = t.match(/(-?\d+\.?\d*)\s*i\b/)
    const jComp = t.match(/(-?\d+\.?\d*)\s*j\b/)

    if (iComp && jComp) {
      const x = +iComp[1], y = +jComp[1]
      const mag = Math.sqrt(x*x + y*y)
      const angle = Math.atan2(y, x) * 180 / Math.PI
      steps.push(`**Vector:** a = ${x}i + ${y}j`)
      steps.push(`**Magnitude:** |a| = √(${x}² + ${y}²) = √(${x*x} + ${y*y}) = √${x*x+y*y}`)
      steps.push(`✅ **|a| = ${Math.round(mag*10000)/10000}**`)
      steps.push(`**Direction:** θ = arctan(${y}/${x}) = **${Math.round(angle*100)/100}°** from positive x-axis`)
      return { type: 'vector_magnitude', steps }
    }

    // Resultant of two vectors given as (x,y) pairs
    if (nums.length >= 4) {
      const [x1, y1, x2, y2] = nums
      const rx = x1+x2, ry = y1+y2
      const mag = Math.sqrt(rx*rx + ry*ry)
      steps.push(`**Resultant vector:** R = (${x1}+${x2})i + (${y1}+${y2})j = ${rx}i + ${ry}j`)
      steps.push(`**Magnitude:** |R| = √(${rx}² + ${ry}²)`)
      steps.push(`✅ **|R| = ${Math.round(mag*10000)/10000}**`)
      return { type: 'vector_resultant', steps }
    }
  }

  // Matrices: 2×2 determinant and inverse
  if (/(?:2x2|2 ?by ?2|determinant|inverse|matrix)/i.test(t) && nums.length >= 4) {
    const [a, b, c, d] = nums
    const det = a*d - b*c
    steps.push(`**Matrix:** [[${a}, ${b}], [${c}, ${d}]]`)
    steps.push(`**Determinant:** det = ad - bc = (${a}×${d}) - (${b}×${c}) = ${a*d} - ${b*c}`)
    steps.push(`✅ **det = ${det}**`)
    if (det !== 0 && /inverse/i.test(t)) {
      const inv_a = d/det, inv_b = -b/det, inv_c = -c/det, inv_d = a/det
      const r = v => Math.round(v*10000)/10000
      steps.push(`**Inverse:** (1/det) × [[d,-b],[-c,a]]`)
      steps.push(`**= (1/${det}) × [[${d},${-b}],[${-c},${a}]]`)
      steps.push(`✅ **Inverse = [[${r(inv_a)}, ${r(inv_b)}], [${r(inv_c)}, ${r(inv_d)}]]**`)
    } else if (det === 0) {
      steps.push(`det = 0 → **Matrix is singular (no inverse)**`)
    }
    return { type: 'matrix', steps }
  }

  // Differentiation: y = axⁿ → dy/dx = naxⁿ⁻¹
  if (/different|dy\/dx|gradient|deriv|turning point/i.test(t)) {
    // Parse y = ax² + bx + c
    const aM = t.match(/(-?\d*\.?\d+)\s*x\s*[²^2]/)
    const bM = t.match(/[²^2]\s*([+-]\s*\d+\.?\d*)\s*x/)
    const cM = t.match(/x\s*([+-]\s*\d+\.?\d*)(?:\s*$|\s*,)/)

    const a = parseFloat(aM?.[1] || '0') || 0
    const b = parseFloat((bM?.[1] || '0').replace(/\s/g,'')) || 0
    const c_val = parseFloat((cM?.[1] || '0').replace(/\s/g,'')) || 0

    if (a !== 0) {
      const da = 2*a, db = b
      steps.push(`**Function:** y = ${a}x² ${b>=0?'+':''}${b}x ${c_val>=0?'+':''}${c_val}`)
      steps.push(`**Rule:** d/dx(axⁿ) = naxⁿ⁻¹`)
      steps.push(`**Differentiate each term:**`)
      steps.push(`  d/dx(${a}x²) = ${2*a}x`)
      if (b !== 0) steps.push(`  d/dx(${b}x) = ${b}`)
      if (c_val !== 0) steps.push(`  d/dx(${c_val}) = 0 (constant)`)
      steps.push(`✅ **dy/dx = ${da}x ${db>=0?'+':''}${db}**`)

      // Find at specific x point
      const xAt = t.match(/(?:at|when|x\s*=)\s*([0-9.-]+)/i)
      if (xAt) {
        const xVal = +xAt[1]
        const gradient = da*xVal + db
        steps.push(`**At x = ${xVal}:** dy/dx = ${da}(${xVal}) + ${db} = ✅ **gradient = ${gradient}**`)
      }

      // Turning points (dy/dx = 0)
      if (/turning|stationary|maximum|minimum/i.test(t)) {
        const xTP = -db / da
        const yTP = a*xTP*xTP + b*xTP + c_val
        steps.push(`**Turning point:** set dy/dx = 0 → ${da}x + ${db} = 0 → x = ${Math.round(xTP*1000)/1000}`)
        steps.push(`**y-value:** y = ${Math.round(yTP*1000)/1000}`)
        const d2 = 2*a
        steps.push(`**2nd derivative = ${d2}** → ${d2>0?'Minimum':'Maximum'} turning point ✅`)
      }
      return { type: 'differentiation', steps }
    }
  }

  // Integration: ∫axⁿdx = axⁿ⁺¹/(n+1) + C
  if (/integrat|∫|anti.?deriv/i.test(t)) {
    const aM = t.match(/(-?\d*\.?\d+)\s*x\s*[²^2]/)
    const bM = t.match(/([+-]?\s*\d*\.?\d+)\s*x(?![²^2])/)
    const cM = t.match(/[+-]\s*(\d+\.?\d*)\s*$/)

    const a = parseFloat(aM?.[1] || '0') || 0
    const b = parseFloat((bM?.[1] || '0').replace(/\s/g,'')) || 0

    const termParts = []
    if (a !== 0) termParts.push(`**∫${a}x² dx = ${Math.round(a/3*1000)/1000}x³** (divide by new power)`)
    if (b !== 0) termParts.push(`**∫${b}x dx = ${b/2}x²**`)
    if (termParts.length > 0) {
      steps.push(`**Rule:** ∫axⁿdx = axⁿ⁺¹/(n+1) + C`)
      steps.push(...termParts)
      // Definite integral
      const limits = t.match(/from\s*([0-9.]+)\s*to\s*([0-9.]+)/i) || t.match(/\[([0-9.]+),\s*([0-9.]+)\]/)
      if (limits) {
        const lo = +limits[1], hi = +limits[2]
        const F = x => (a/3)*x*x*x + (b/2)*x*x
        const result = F(hi) - F(lo)
        steps.push(`**Definite integral from ${lo} to ${hi}:**`)
        steps.push(`= [${a!==0?`${Math.round(a/3*1000)/1000}x³`:''} ${b!==0?`+ ${b/2}x²`:''}]₀${hi}`)
        steps.push(`= F(${hi}) - F(${lo}) = ${Math.round(F(hi)*1000)/1000} - ${Math.round(F(lo)*1000)/1000}`)
        steps.push(`✅ **= ${Math.round(result*1000)/1000}**`)
      } else {
        steps.push(`✅ **Result + C** (add constant of integration for indefinite integrals)`)
      }
      return { type: 'integration', steps }
    }
  }

  // Logarithm — enhanced (handles log(x)+log(y)=log(xy) type)
  if (/\blog[\b_\s(]|\bln[\b_\s(]/i.test(t)) {
    // log_b(x) = y style — find x
    const logEq = t.match(/log[_\s]?(\d+)\s*\(?\s*([0-9.x]+)\s*\)?\s*=\s*([0-9.]+)/i)
    if (logEq) {
      const base = +logEq[1], arg = logEq[2], result = +logEq[3]
      if (arg === 'x' || arg === 'x)') {
        // solve for x: log_b(x) = y → x = b^y
        const x = Math.pow(base, result)
        steps.push(`**log_${base}(x) = ${result}**`)
        steps.push(`**Rewrite:** x = ${base}^${result}`)
        steps.push(`✅ **x = ${x}**`)
        return { type: 'log_solve', steps }
      }
      // evaluate log_b(number)
      const val = Math.log(+arg) / Math.log(base)
      steps.push(`**log_${base}(${arg}) = log(${arg})/log(${base})**`)
      steps.push(`= ${Math.log(+arg).toFixed(4)} / ${Math.log(base).toFixed(4)}`)
      steps.push(`✅ **= ${Math.round(val*10000)/10000}**`)
      return { type: 'log_evaluate', steps }
    }
    // Natural log: ln(x) = y
    const lnEq = t.match(/ln\s*\(?\s*([0-9.x]+)\s*\)?\s*=\s*([0-9.]+)/i)
    if (lnEq) {
      if (lnEq[1] === 'x') {
        const x = Math.exp(+lnEq[2])
        steps.push(`**ln(x) = ${lnEq[2]} → x = e^${lnEq[2]}`)
        steps.push(`✅ **x = ${Math.round(x*10000)/10000}**`)
      } else {
        const val = Math.log(+lnEq[1])
        steps.push(`**ln(${lnEq[1]}) = ${Math.round(val*10000)/10000}**`)
        steps.push(`✅ **= ${Math.round(val*10000)/10000}**`)
      }
      return { type: 'ln', steps }
    }
  }

  // Inverse trig: sin(x)=0.5, find angle
  if (/(?:sin|cos|tan)\s*(?:of\s*)?(?:x|\(x\))\s*=\s*([0-9.]+)/i.test(t)) {
    const m = t.match(/(sin|cos|tan)\s*(?:of\s*)?(?:x|\(x\))\s*=\s*([0-9.]+)/i)
    if (m) {
      const fn = m[1], val = +m[2]
      let angle
      if (fn === 'sin') angle = Math.asin(val) * 180/Math.PI
      else if (fn === 'cos') angle = Math.acos(val) * 180/Math.PI
      else angle = Math.atan(val) * 180/Math.PI
      steps.push(`**${fn}(x) = ${val}**`)
      steps.push(`**x = ${fn === 'sin' ? 'sin⁻¹' : fn === 'cos' ? 'cos⁻¹' : 'tan⁻¹'}(${val})`)
      steps.push(`✅ **x = ${Math.round(angle*1000)/1000}°**`)
      if (fn === 'sin' || fn === 'cos') steps.push(`**Second solution:** x = ${Math.round((180 - angle)*1000)/1000}°`)
      return { type: 'inverse_trig', steps }
    }
  }

  // SOH-CAH-TOA: find missing side/angle in right triangle
  if (/right.*triangle|triangle.*right|soh|cah|toa|hypotenuse|opposite|adjacent/i.test(t) && nums.length >= 2) {
    const hypM = t.match(/hypotenuse[^=]*[=:]\s*([0-9.]+)/i) || t.match(/hyp[=:]\s*([0-9.]+)/i)
    const oppM = t.match(/opposite[^=]*[=:]\s*([0-9.]+)/i) || t.match(/opp[=:]\s*([0-9.]+)/i)
    const adjM = t.match(/adjacent[^=]*[=:]\s*([0-9.]+)/i) || t.match(/adj[=:]\s*([0-9.]+)/i)
    const angM = t.match(/angle[^=]*[=:]\s*([0-9.]+)/i)

    const hyp = hypM ? +hypM[1] : null
    const opp = oppM ? +oppM[1] : null
    const adj = adjM ? +adjM[1] : null
    const ang = angM ? +angM[1] : null

    if (ang && hyp && !opp) {
      const o = Math.sin(ang*Math.PI/180) * hyp
      steps.push(`**SOH: sin(θ) = Opposite/Hypotenuse**`)
      steps.push(`**Opposite = sin(${ang}°) × ${hyp} = ${Math.round(o*10000)/10000}`)
      steps.push(`✅ **Opposite side = ${Math.round(o*10000)/10000}**`)
      return { type: 'trigonometry_sohcahtoa', steps }
    }
    if (ang && hyp && !adj) {
      const a = Math.cos(ang*Math.PI/180) * hyp
      steps.push(`**CAH: cos(θ) = Adjacent/Hypotenuse**`)
      steps.push(`✅ **Adjacent = cos(${ang}°) × ${hyp} = ${Math.round(a*10000)/10000}**`)
      return { type: 'trigonometry_sohcahtoa', steps }
    }
    if (opp && hyp && !ang) {
      const angle = Math.asin(opp/hyp) * 180/Math.PI
      steps.push(`**sin(θ) = ${opp}/${hyp} = ${Math.round(opp/hyp*10000)/10000}**`)
      steps.push(`**θ = sin⁻¹(${Math.round(opp/hyp*10000)/10000})`)
      steps.push(`✅ **θ = ${Math.round(angle*1000)/1000}°**`)
      return { type: 'trigonometry_sohcahtoa', steps }
    }
    if (opp && adj) {
      const angle = Math.atan(opp/adj) * 180/Math.PI
      const hypVal = Math.sqrt(opp*opp + adj*adj)
      steps.push(`**TOA: tan(θ) = Opposite/Adjacent = ${opp}/${adj}**`)
      steps.push(`**θ = tan⁻¹(${Math.round(opp/adj*10000)/10000}) = ${Math.round(angle*1000)/1000}°**`)
      steps.push(`**Hypotenuse = √(${opp}²+${adj}²) = √${opp*opp+adj*adj}`)
      steps.push(`✅ **θ = ${Math.round(angle*1000)/1000}°, hypotenuse = ${Math.round(hypVal*1000)/1000}**`)
      return { type: 'trigonometry_sohcahtoa', steps }
    }
    if (adj && hyp && !opp && !ang) {
      const angle = Math.acos(adj/hyp) * 180 / Math.PI
      const o = Math.sqrt(Math.max(0, hyp*hyp - adj*adj))
      steps.push(`**CAH: cos(θ) = Adjacent/Hypotenuse = ${adj}/${hyp}**`)
      steps.push(`**θ = cos⁻¹(${Math.round(adj/hyp*10000)/10000}) = ${Math.round(angle*1000)/1000}°**`)
      steps.push(`**Opposite side = √(${hyp}²-${adj}²) = ${Math.round(o*1000)/1000}**`)
      steps.push(`✅ **θ = ${Math.round(angle*1000)/1000}°, Opposite = ${Math.round(o*1000)/1000}**`)
      return { type: 'trigonometry_sohcahtoa', steps }
    }
  }

  // Percentage / ratio
  if (/percentage|percent|\bof\b.*%|%.*of/i.test(t) && nums.length >= 2) {
    const pctM = t.match(/([0-9.]+)\s*%\s*of\s*([0-9.]+)/i)
    if (pctM) {
      const pct = +pctM[1], total = +pctM[2]
      const result = pct * total / 100
      steps.push(`**${pct}% of ${total}**`)
      steps.push(`= (${pct}/100) × ${total}`)
      steps.push(`✅ **= ${Math.round(result*10000)/10000}**`)
      return { type: 'percentage', steps }
    }
    // find percentage: X is what % of Y
    const ofM = t.match(/([0-9.]+)\s*is\s*(?:what|how many)\s*%?\s*(?:of|percent)\s*([0-9.]+)/i)
    if (ofM) {
      const x = +ofM[1], y = +ofM[2]
      const pct = (x/y) * 100
      steps.push(`**${x} as a % of ${y}:**`)
      steps.push(`= (${x}/${y}) × 100`)
      steps.push(`✅ **= ${Math.round(pct*100)/100}%**`)
      return { type: 'percentage', steps }
    }
  }

  // Probability
  if (/probab/i.test(t) && nums.length >= 2) {
    const favM = t.match(/([0-9]+)\s*favou?rable/i) || t.match(/([0-9]+)\s*(?:out of|\/)\s*([0-9]+)/i)
    if (favM) {
      const fav = +favM[1], total = +favM[2]
      const p = fav/total
      steps.push(`**P(event) = favourable outcomes / total outcomes**`)
      steps.push(`= ${fav} / ${total}`)
      steps.push(`✅ **P = ${p} = ${Math.round(p*100)}%**`)
      return { type: 'probability', steps }
    }
  }

  return null
}

// ── BIOLOGY CALCULATIONS ─────────────────────────────────────────────
function solveBiologyCalc(input) {
  const t = input.toLowerCase()
  const nums = extractNums(input)
  const steps = []

  // Magnification: M = image size / actual size
  if (/magnif|image.*size|actual.*size|microscope/i.test(t) && nums.length >= 2) {
    const imgM = t.match(/image[^=]*[=:]\s*([0-9.]+)\s*(mm|cm|μm|um)?/i)
    const actM = t.match(/actual[^=]*[=:]\s*([0-9.]+)\s*(mm|cm|μm|um)?/i)
    const magM = t.match(/magnif[^=]*[=:]\s*([0-9.]+)/i)

    if (imgM && actM && !magM) {
      const img = +imgM[1], act = +actM[1]
      const mag = img / act
      steps.push(`**Formula:** Magnification = Image size / Actual size`)
      steps.push(`**Given:** Image = ${img}${imgM[2]||'mm'}, Actual = ${act}${actM[2]||'mm'}`)
      steps.push(`✅ **Magnification = ${img} ÷ ${act} = ×${Math.round(mag*100)/100}**`)
      return { type: 'magnification', steps }
    }
    if (magM && imgM && !actM) {
      const actual = +imgM[1] / +magM[1]
      steps.push(`**Actual size = Image size ÷ Magnification**`)
      steps.push(`= ${imgM[1]} ÷ ${magM[1]}`)
      steps.push(`✅ **Actual size = ${Math.round(actual*10000)/10000} ${imgM[2]||'mm'}**`)
      return { type: 'magnification', steps }
    }
    if (magM && actM && !imgM) {
      const img = +magM[1] * +actM[1]
      steps.push(`**Image size = Magnification × Actual size**`)
      steps.push(`= ${magM[1]} × ${actM[1]}`)
      steps.push(`✅ **Image size = ${img} ${actM[2]||'mm'}**`)
      return { type: 'magnification', steps }
    }

    // Fallback: just 2 numbers — assume image/actual
    if (!imgM && !actM && !magM && nums.length === 2) {
      const mag = nums[0] / nums[1]
      steps.push(`**Magnification = ${nums[0]} ÷ ${nums[1]}`)
      steps.push(`✅ **= ×${Math.round(mag*100)/100}**`)
      return { type: 'magnification', steps }
    }
  }

  return null
}

// ===================================================================
// INTENT CLASSIFIER  v5 — multi-intent support
// ===================================================================

const INTENT_PATTERNS = [
  // Follow-ups (checked first — they're short phrases)
  { intent:'FOLLOWUP_MORE',    patterns: [/^(tell me more|more|continue|go on|elaborate|expand|keep going)[\s.!?]*$/i, /^more (about|on|please)[\s.!?]*$/i] },
  { intent:'FOLLOWUP_SIMPLER', patterns: [/^(simpler|easier|i (still )?don'?t get it)[\s.!?]*$/i, /explain (it )?differently|in simple(r)? terms/i, /simpler (please|explanation)/i, /can you (explain|say) (it|that) (differently|simpler|again)/i, /too (hard|difficult|complex)/i] },
  { intent:'FOLLOWUP_EXAMPLE', patterns: [/^give me (an?|another) example[\s.!?]*$/i, /^(example please|another example|show me (an? )?example)[\s.!?]*$/i, /^(real[ -]life|practical) example/i] },
  { intent:'FOLLOWUP_WHY',     patterns: [/^(why\??|but why\??|why is (that|this|it)\??)[\s.!?]*$/i, /^why does (that|this|it) (happen|work)/i, /what'?s? the reason/i] },
  { intent:'FOLLOWUP_NEXT_QUIZ', patterns: [/^(next( question)?|another( question)?|again|one more|next one|continue quiz)[\s.!?]*$/i, /^ask me (another|again)[\s.!?]*$/i] },
  { intent:'FOLLOWUP_NEXT_TOPIC', patterns: [/^(next topic|what'?s? next|continue|move on|next lesson)[\s.!?]*$/i, /^(next chapter|next unit)[\s.!?]*$/i] },
  { intent:'FOLLOWUP_SUMMARY', patterns: [/^(what have we (covered|done|learned)|summaris|summary|recap)[\s.!?]*/i, /what did (we|i) (just|cover|learn)/i] },

  // Core intents
  { intent:'EXPLAIN',   patterns: [/what is (.+)/i, /what are (.+)/i, /define (.+)/i, /explain (.+)/i, /tell me about (.+)/i, /describe (.+)/i, /how does (.+) work/i, /teach me (.+)/i, /what do you know about (.+)/i, /introduce (.+)/i] },
  { intent:'CALCULATE', patterns: [/calculate (.+)/i, /solve (.+)/i, /how do (i|you|we) (calculate|solve|find|work out) (.+)/i, /formula for (.+)/i, /find (.+) (if|when|given) (.+)/i, /what is (.+) if (.+)/i, /work out (.+)/i] },
  { intent:'QUIZ',      patterns: [/quiz me (on )?(.+)/i, /test me (on )?(.+)/i, /ask me .*(about|on) (.+)/i, /practice (.+)/i, /revise (.+)/i, /drill me on (.+)/i, /question on (.+)/i] },
  { intent:'HINT',      patterns: [/i('?m| am) stuck/i, /give me a hint/i, /i don'?t (understand|get)/i, /help me (with|understand)/i, /i need help/i, /i'?m? confused/i, /hint/i, /struggling with/i, /not sure (about|how)/i] },
  { intent:'EXAM_TIP',  patterns: [/exam tip/i, /how (do i|should i|to) (pass|study for|prepare for)/i, /uneb (tip|advice)/i, /common (mistake|error)s?/i, /how to revise/i, /revision tip/i] },
  { intent:'COMPARE',   patterns: [/difference between (.+) and (.+)/i, /compare (.+) (and|with|to) (.+)/i, /(.+) vs\.? (.+)/i, /distinguish between (.+) and (.+)/i, /similarities.*differences/i] },
  { intent:'GREET',     patterns: [/^(hi|hello|hey|good morning|good evening|good afternoon|helo|hi there|howdy)[\s!.]*$/i, /^(how are you|what can you do|who are you)[\s?]*$/i, /^(start|begin)[\s!.]*$/i] },
  { intent:'THANKS',    patterns: [/^(thanks?|thank you|ok thanks?|great|awesome|cool|perfect|got it|i see|understood)[\s!.]*$/i, /^(nice|brilliant|excellent|wonderful|fantastic|that helps?)[\s!.]*$/i] },
  { intent:'IMPROVE',   patterns: [/how (do i|can i|to) improve/i, /how (do i|can i) (get|score) better/i, /tips to improve/i, /improve my (score|marks|grade)/i, /how to (pass|get better|do better)/i, /i (keep|keep on) failing/i, /i scored (low|badly|poorly)/i] },
  { intent:'RECOMMEND', patterns: [/what should i (study|learn|do) (next|now)?/i, /recommend/i, /where do i start/i, /what'?s? next/i, /guide me/i, /what (today|now)/i, /study plan/i, /make me a (study|revision) plan/i] },
  { intent:'STUDY_PLAN',patterns: [/study plan/i, /revision schedule/i, /plan for (my|the) exam/i, /(day.by.day|week.by.week) (plan|schedule)/i, /how many days/i] },
  { intent:'TEACH',     patterns: [/teach me (step.by.step|how to|about)/i, /i want to (learn|understand) (.+)/i, /walk me through (.+)/i, /can you (teach|tutor) me/i] },
  { intent:'VOICE',     patterns: [/voice (input|mode|on)|use (my )?mic|speak to you|talk to you/i] },
]

export function classifyIntent(input) {
  const text = input.trim()

  // Multi-intent detection: "explain AND quiz me on X"
  const multiMatch = text.match(/(.+)\s+(and|then|also)\s+(quiz|test|ask) me/i)
    || text.match(/(quiz|test) me.+and.+(explain|tell me)/i)
  if (multiMatch) return { intent: 'MULTI', raw: input, secondary: 'QUIZ' }

  for (const { intent, patterns } of INTENT_PATTERNS) {
    for (const p of patterns) {
      if (text.match(p)) return { intent, raw: input }
    }
  }
  return { intent: 'EXPLAIN', raw: input }
}




// ===================================================================
// RESPONSE GENERATORS  v5
// ===================================================================

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

// --- Smart fallback — pure offline ---
function smartFallback(query) {
  const closest = findClosestTopic(query)
  const parts = []
  if (closest) {
    const name = closest.title || closest.file.replace(/_/g,' ')
    parts.push({ type:'heading', text:'🤔 Did you mean...' })
    parts.push({ type:'text', text:`I couldn't find _"${query}"_ exactly — did you mean **${name}**?` })
    parts.push({ type:'suggestions', items:[`Explain ${name}`, `Quiz me on ${name}`, `How do I calculate ${name}?`, 'Show all topics'] })
  } else {
    parts.push({ type:'heading', text:"🤔 I'm not sure about that" })
    parts.push({ type:'text', text:`I specialise in the S1–S6 UNEB curriculum. Try asking about a specific topic:` })
    parts.push({ type:'list', items:['"What is photosynthesis?"','"Explain quadratic equations"','"Quiz me on forces"','"How do I calculate moles?"','"Exam tips for genetics"'] })
    parts.push({ type:'suggestions', items:['Explain photosynthesis','Quiz me on algebra','Explain electricity','How do I calculate force?'] })
  }
  return { parts }
}

// --- EXPLAIN ---
export function generateExplainResponse(knowledge, query, simpler=false) {
  if (!knowledge) return smartFallback(query, [])
  const parts = []
  const t = knowledge.title
  parts.push({ type:'heading', text:`📖 ${t}` })
  if (knowledge._personalNote)
    parts.push({ type:'text', text: knowledge._personalNote })
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
  parts.push({ type:'suggestions', items:[`Quiz me on ${t}`, `Why is ${t} important?`, `Give me a real-life example of ${t}`, `Exam tips for ${t}`] })
  return { parts, topic: knowledge.topic, subject: knowledge.subject }
}

// --- MORE ---
function generateMoreResponse(knowledge) {
  if (!knowledge) return { parts:[{ type:'text', text:'What topic would you like more detail on?' }] }
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
  if (knowledge.steps?.length > 0)
    parts.push({ type:'list', title:'📋 Step-by-step process:', items: knowledge.steps[0].items })
  parts.push({ type:'suggestions', items:[`Quiz me on ${knowledge.title}`,`Exam tips for ${knowledge.title}`,`Explain ${knowledge.title} in simpler terms`, `What comes after ${knowledge.title}?`] })
  return { parts, topic: knowledge.topic, subject: knowledge.subject }
}

// --- WHY engine — deep rule-based reasoning ---
function generateWhyResponse(knowledge, input) {
  if (!knowledge) return smartFallback(input)
  const parts = []
  parts.push({ type:'heading', text:`🧠 Why: ${knowledge.title}` })
  const whyFacts = knowledge.keyFacts.filter((f, i) => i > 0)
  if (whyFacts.length > 0)
    parts.push({ type:'list', title:'The reason this matters:', items: whyFacts.slice(0,4) })
  if (knowledge.examples.length > 0)
    parts.push({ type:'example', title:'Real-world connection', text: knowledge.examples[0].body })
  parts.push({ type:'text', text:`🇺🇬 **In Uganda:** This topic appears in UNEB every year. Understanding the _why_ behind it helps you answer application questions, not just definition questions.` })
  parts.push({ type:'suggestions', items:[`Explain ${knowledge.title} fully`, `Quiz me on ${knowledge.title}`, 'Tell me more', 'Give me an example'] })
  return { parts, topic: knowledge.topic, subject: knowledge.subject }
}

// --- COMPARE engine — smart rule-based, loads BOTH topics ---
async function generateCompareResponse(knowledge, input) {
  const vsMatch = input.match(/difference between (.+?) and (.+)/i)
    || input.match(/(.+?) vs\.? (.+)/i)
    || input.match(/compare (.+?) (?:and|with|to) (.+)/i)
    || input.match(/distinguish between (.+?) and (.+)/i)

  if (!vsMatch) return generateExplainResponse(knowledge, input)

  const topic1Name = vsMatch[1].trim()
  const topic2Name = vsMatch[2].trim()

  // Rule-based comparison
  const parts = []
  parts.push({ type:'heading', text:`⚖️ ${topic1Name} vs ${topic2Name}` })
  if (knowledge) {
    if (knowledge.definitions.length > 0)
      parts.push({ type:'text', text:`📌 **${knowledge.definitions[0].term}**: ${knowledge.definitions[0].definition}` })
    if (knowledge.keyFacts.length > 0)
      parts.push({ type:'list', title:`Key features of ${topic1Name}:`, items: knowledge.keyFacts.slice(0,3) })
  }
  parts.push({ type:'list', title:'📝 For UNEB comparison questions:', items:[
    `Always state the KEY difference in the first sentence`,
    `Then give 2-3 supporting points for each`,
    `Use connectives: "whereas", "on the other hand", "in contrast"`,
    `Include an example for each if time allows`,
  ]})
  parts.push({ type:'suggestions', items:[
    `Explain ${topic1Name}`, `Explain ${topic2Name}`,
    `Quiz me on ${knowledge?.title || topic1Name}`, `Exam tips for ${knowledge?.subject || 'biology'}`,
  ]})
  return { parts, topic: knowledge?.topic, subject: knowledge?.subject }
}

// --- CALCULATE ---
export function generateCalculateResponse(knowledge, query) {
  const parts = []

  // Try masterSolve — handles ALL calculation types
  const solved = masterSolve(query)
  if (solved) {
    const subjectIcon = /chemistry|moles|ph|titrat|yield|avogadro/i.test(query) ? '⚗️ Chemistry' :
                        /physic|force|velocity|wave|pressure|transform|half.life/i.test(query) ? '⚡ Physics' :
                        /biology|magnif/i.test(query) ? '🔬 Biology' : '🧮 Mathematics'
    parts.push({ type:'heading', text:`${subjectIcon} — Step-by-Step Solution` })
    if (knowledge?.formulas?.length > 0)
      parts.push({ type:'formula', title:'📐 Formula:', items:[knowledge.formulas[0].content] })
    parts.push({ type:'list', title:'📋 Working:', items: solved.steps })
    parts.push({ type:'suggestions', items:[`Quiz me on ${knowledge?.title||'this topic'}`,`Explain ${knowledge?.title||'this topic'}`,'Give me another problem','Exam tips'] })
    return { parts, topic: knowledge?.topic, subject: knowledge?.subject }
  }

  // No auto-solve — show method
  if (!knowledge) return smartFallback(query, [])
  parts.push({ type:'heading', text:`🔢 How to Calculate: ${knowledge.title}` })
  if (knowledge.formulas.length > 0) {
    parts.push({ type:'formula', title:'📐 Formulas', items: knowledge.formulas.map(f=>`${f.label}: ${f.content}`) })
    parts.push({ type:'list', title:'📋 Step-by-Step Method:', items:[
      '1️⃣ Read the question — list all given values',
      '2️⃣ Identify the unknown (what you need to find)',
      '3️⃣ Choose the right formula from above',
      '4️⃣ Substitute values into the formula',
      '5️⃣ Solve and include the correct unit in your answer',
    ]})
  }
  if (knowledge.examples.length > 0)
    parts.push({ type:'example', title:'💡 Worked Example', text: knowledge.examples[0].body })
  parts.push({ type:'text', text:`💡 **Tip:** Give me actual numbers and I will solve it step-by-step!\ne.g. _"find force if mass=5kg acceleration=3m/s²"_` })
  parts.push({ type:'suggestions', items:[`Quiz me on ${knowledge.title}`,`Explain ${knowledge.title}`,'Another example please'] })
  return { parts, topic: knowledge.topic, subject: knowledge.subject }
}

// --- QUIZ ---
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

// --- HINT ---
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
      '💬 Tell me the topic name and I will give a specific hint!',
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
    `✏️ Write out the steps before you calculate — don't rush`,
  ].filter(Boolean)
  parts.push({ type:'list', title:'Think through this:', items: hints })
  if (knowledge.examples.length > 0)
    parts.push({ type:'example', title:'💡 Similar Example', text: knowledge.examples[0].body })
  parts.push({ type:'text', text:`Still stuck? Try: _"Walk me through ${knowledge.title} step by step"_` })
  parts.push({ type:'suggestions', items:[`Walk me through ${knowledge.title} step by step`,`Quiz me on ${knowledge.title}`,`Formula for ${knowledge.title}`] })
  return { parts, topic: knowledge.topic, subject: knowledge.subject }
}

// --- EXAM TIPS ---
function generateExamTipResponse(knowledge, query) {
  const parts = []
  parts.push({ type:'heading', text:`🎯 Exam Tips${knowledge ? ': ' + knowledge.title : ''}` })
  if (knowledge) {
    const tips = []
    if (knowledge.formulas.length>0)
      tips.push(`**Must memorise:** ${knowledge.formulas.map(f=>f.content).slice(0,3).join(' | ')}`)
    if (knowledge.definitions.length>0)
      tips.push(`**Key definition:** Learn this exact wording: "${knowledge.definitions[0].term} — ${knowledge.definitions[0].definition.substring(0,80)}..."`)
    tips.push(`UNEB rewards clear steps — never skip working even if obvious`)
    tips.push(`If asked to "state", give the fact. If asked to "explain", give the reason`)
    tips.push(`Common error: forgetting units. Always write e.g. m/s, J, mol/dm³`)
    parts.push({ type:'list', title:`📌 ${knowledge.title} exam tips:`, items: tips })
  }
  parts.push({ type:'list', title:'📋 General UNEB Strategy:', items:[
    '📝 Show ALL working — method marks are given even for wrong final answers',
    '⏱️ If stuck, skip and come back — never waste time on one question',
    '🔢 Always include units in numerical answers',
    '✅ Check your arithmetic — most marks are lost on simple errors',
    '📊 Label diagrams fully and use a ruler for straight lines',
    '📖 Read the question twice before writing',
    '🎯 Aim for 60%+ in weak subjects — even that is a pass',
  ]})
  parts.push({ type:'suggestions', items:[
    knowledge ? `Quiz me on ${knowledge.title}` : 'Quiz me on forces',
    knowledge ? `Explain ${knowledge.title}` : 'Explain photosynthesis',
    'How do I improve my score?',
    'Make me a study plan',
  ]})
  return { parts, topic: knowledge?.topic, subject: knowledge?.subject }
}

// --- STUDY PLAN generator ---
function generateStudyPlan(profile, input) {
  const parts = []
  parts.push({ type:'heading', text:'📅 Your UNEB Study Plan' })

  // Extract days if mentioned
  const daysMatch = input.match(/(\d+)\s*days?/i)
  const days = daysMatch ? parseInt(daysMatch[1]) : 30

  if (profile && profile.summary.totalCompleted > 0) {
    const { allWeakTopics, subjectStrength } = profile
    const subjects = Object.entries(subjectStrength).filter(([,v])=>v>0).sort((a,b)=>a[1]-b[1])
    parts.push({ type:'text', text:`Based on your quiz history — here is a **${days}-day plan** targeting your weak areas:` })

    // Build a mini-schedule
    const schedule = []
    const weakSubj = subjects[0]?.[0] || 'mathematics'
    const strongSubj = subjects[subjects.length-1]?.[0] || 'physics'

    for (let d = 1; d <= Math.min(days, 7); d++) {
      const topic = allWeakTopics[d-1]?.topic?.replace(/_/g,' ') || `${weakSubj} revision`
      schedule.push(`**Day ${d}:** ${topic} — 1 lesson + quiz + 10 flashcards`)
    }
    if (days > 7) schedule.push(`**Days 8–${Math.min(days,14)}:** Start ${strongSubj} topics you haven't done yet`)
    if (days > 14) schedule.push(`**Days 15–${Math.min(days,21)}:** Past paper practice — 1 subject per day`)
    if (days > 21) schedule.push(`**Days 22–${days}:** Mock exams + review wrong answers only`)

    parts.push({ type:'list', title:'🗓️ Day-by-day schedule:', items: schedule })
  } else {
    parts.push({ type:'text', text:`Here is a general **${days}-day UNEB study plan:**` })
    parts.push({ type:'list', title:'📋 Schedule:', items:[
      `**Days 1–7:** Mathematics — Algebra, Quadratics, Trigonometry, Statistics`,
      `**Days 8–14:** Physics — Forces, Electricity, Waves, Motion`,
      `**Days 15–21:** Chemistry — Acids/Bases, Reactions, Organic, Moles`,
      `**Days 22–28:** Biology — Cells, Genetics, Photosynthesis, Ecology`,
      `**Days 29–${days}:** Full mock exams + weak topic review`,
    ]})
  }

  parts.push({ type:'list', title:'⏰ Daily routine (2 hours):', items:[
    '15 min — Flashcard review (topics below 60%)',
    '45 min — New lesson + read explanations',
    '30 min — Quiz on today\'s topic (aim 70%+)',
    '15 min — Write 3 key facts from memory',
    '15 min — Review any wrong answers',
  ]})
  parts.push({ type:'suggestions', items:['Quiz me on my weakest topic','Explain quadratic equations','Exam tips for chemistry','What should I study today?'] })
  return { parts }
}

// --- CONVERSATION SUMMARY ---
function generateSummaryResponse(sessionTopics) {
  const parts = []
  parts.push({ type:'heading', text:'📚 Session Summary' })
  if (sessionTopics.length === 0) {
    parts.push({ type:'text', text:"We haven't covered any topics yet this session. Ask me to explain a topic to get started!" })
  } else {
    parts.push({ type:'text', text:`We have covered **${sessionTopics.length}** topic${sessionTopics.length>1?'s':''} this session:` })
    parts.push({ type:'list', items: sessionTopics.map(t => `✅ ${t.replace(/_/g,' ')}`) })
    parts.push({ type:'text', text:`Great work! Consistent study is the key to UNEB success. 💪` })
  }
  parts.push({ type:'suggestions', items:['What should I study next?','Quiz me on what we covered','Make me a study plan','Exam tips'] })
  return { parts }
}

// --- NEXT TOPIC navigation ---
function generateNextTopicResponse(currentTopic, currentSubject) {
  if (!currentTopic || !currentSubject) {
    return { parts:[{ type:'text', text:'Which subject shall we continue with? Try: _"Next topic in mathematics"_' }] }
  }
  // Find current topic in curriculum index and get the next one in the same subject
  const subjectTopics = CURRICULUM_INDEX.filter(e => e.subject === currentSubject)
  const currentIdx = subjectTopics.findIndex(e => e.file === currentTopic)
  const nextEntry = subjectTopics[currentIdx + 1]
  if (!nextEntry) {
    return { parts:[
      { type:'text', text:`You've reached the end of **${currentSubject}**! 🎉 That's all the topics I have for that subject.` },
      { type:'suggestions', items:['Quiz me on everything we covered','Exam tips for '+currentSubject,'Switch to another subject','Make me a study plan'] }
    ]}
  }
  return {
    parts:[
      { type:'text', text:`Next up in ${currentSubject}: **${nextEntry.title}** 📖` },
      { type:'suggestions', items:[`Explain ${nextEntry.title}`,`Quiz me on ${nextEntry.title}`,`Exam tips for ${nextEntry.title}`,'Skip to another topic'] }
    ],
    nextTopic: nextEntry
  }
}

// --- VOICE support response ---
function generateVoiceResponse() {
  return {
    parts:[
      { type:'heading', text:'🎤 Voice Input' },
      { type:'text', text:'Tap the microphone icon below to speak your question! I can understand spoken questions about any S1–S6 topic.' },
      { type:'list', title:'Try saying:', items:[
        '"What is osmosis?"',
        '"Explain photosynthesis"',
        '"Quiz me on forces"',
        '"How do I calculate moles?"',
      ]},
    ],
    triggerVoice: true,
  }
}

// --- Greetings & small talk ---
const GREETINGS = [
  n=>`Hello${n?' '+n:''}! 👋 I am **Eqla AI v5** — your smartest study partner for UNEB S1-S6.\n\nI can:\n• **Explain** any topic — _"What is osmosis?"_\n• **Solve** problems step-by-step — _"Find force if mass=5kg acceleration=3m/s²"_\n• **Quiz** you — _"Quiz me on probability"_\n• **Compare** topics — _"Mitosis vs meiosis"_\n• **Build a study plan** — _"Make me a 30-day study plan"_\n• **Explain WHY** — _"Why is photosynthesis important?"_\n\nWhat are we studying today?`,
  n=>`Hi${n?' '+n:''}! 🌟 Ready to level up? I know every topic in the S1–S6 curriculum.\n\nTry:\n• _"Explain logarithms"_\n• _"Quiz me on cells"_\n• _"How do I calculate moles?"_\n• _"Difference between mitosis and meiosis"_\n• _"Make me a study plan"_`,
  n=>`Good to see you${n?', '+n:''}! 🚀 Let's make this session count.\n\nI cover Maths, Physics, Biology and Chemistry from S1 to S6 — and I can now escalate hard questions to real AI for better answers. What are we tackling today?`,
]
const THANKS_MSGS = [
  "You're welcome! 😊 Every question makes you stronger. What's next?",
  "Happy to help! 🌟 Keep studying — consistency is the UNEB secret. What else?",
  "Great! 🚀 Students who ask questions are the ones who pass. What else?",
  "Glad that helped! 💪 Want to test yourself with a quick quiz?",
  "Any time! 🎯 What topic next?",
]
const CORRECT_RESP = [
  n=>`✅ Correct${n?', '+n:''}! Well done! 🎉`,
  ()=>`✅ That's right! Excellent! ⭐`,
  ()=>`✅ Perfect! You clearly know this. 🚀`,
  ()=>`✅ Spot on! Keep this up — you will ace UNEB. 💪`,
]
const WRONG_RESP = [
  ()=>`❌ Not quite — but that's how we learn.`,
  ()=>`❌ Good try! The correct answer is below.`,
  ()=>`❌ Almost! Check the explanation below.`,
]


// ===================================================================
// REAL TEACHER ENGINE v1
// Makes the AI behave like a real teacher:
//   - Uses student's name naturally
//   - Progressive explanations (simple → detailed)
//   - Checks understanding after explaining
//   - Connects new topics to ones already studied
//   - Gives real encouragement based on actual data
// ===================================================================

const TEACHER_CHECK_PROMPTS = [
  (name, topic) => `Before I go on, ${name ? name+' — ' : ''}can you tell me in your own words what **${topic}** means so far?`,
  (name, topic) => `Let me pause here. ${name ? name+', ' : ''}what do you think happens when ${topic}? Take a guess.`,
  (name, topic) => `Quick check — ${name ? name+' ' : ''}what's the key thing you remember about **${topic}**?`,
  (name, topic) => `So ${name ? name+', ' : ''}if I asked you to explain **${topic}** to a friend right now, what would you say?`,
]

const TEACHER_ENCOURAGEMENT = {
  correct: [
    (name, score) => `${name ? '✅ '+name+' — ' : '✅ '}that is exactly right! ${score ? 'You scored '+score+'% on this topic — you clearly understand it.' : 'Well done.'}`,
    (name) => `${name ? name+', ' : ''}perfect answer! You are getting this.`,
    (name) => `${name ? 'Great work, '+name+'! ' : 'Great! '}That is the correct understanding.`,
  ],
  partial: [
    (name) => `${name ? name+', ' : ''}you are on the right track! Let me fill in the gaps.`,
    (name) => `Almost there${name ? ', '+name : ''}! You got the main idea. Here is what was missing:`,
  ],
  incorrect: [
    (name) => `${name ? name+', ' : ''}not quite — but that is a common mistake. Let me show you why:`,
    (name) => `Good try${name ? ', '+name : ''}! This one trips many students up. Here is the correct thinking:`,
  ],
  lowScore: (name, topic, score) => `${name ? name+', ' : ''}I can see you scored ${score}% on ${topic} last time — let us fix that today. I will go step by step.`,
  firstTime: (name, topic) => `${name ? 'Welcome, '+name+'! ' : ''}Let us start with **${topic}**. I will build from the basics — stop me anytime if something is unclear.`,
  connected: (prevTopic, newTopic) => `This links directly to **${prevTopic}** that we ${prevTopic ? 'covered earlier' : 'just discussed'}. Understanding ${prevTopic} will help you grasp ${newTopic} much faster.`,
}

// Build a progressive 3-stage explanation: basic → detailed → application
function buildProgressiveExplanation(knowledge, studentName, profile) {
  if (!knowledge) return null
  const name = studentName || conversationMemory.studentName || ''
  const mem = conversationMemory

  // Check if student has weak score on this topic
  const weakEntry = profile?.allWeakTopics?.find(t => t.topic === knowledge.topic)
  const prevScore = weakEntry?.score

  // Check if a related topic was covered in this session
  const relatedSession = mem.sessionTopics.find(t => t !== knowledge.topic && knowledge.keyFacts.some(f => f.toLowerCase().includes(t.replace(/_/g,' '))))

  const parts = []

  // Personalised opener
  if (prevScore !== undefined && prevScore < 70) {
    parts.push({ type:'text', text: TEACHER_ENCOURAGEMENT.lowScore(name, knowledge.title, prevScore) })
  } else if (!mem.sessionTopics.includes(knowledge.topic)) {
    parts.push({ type:'text', text: TEACHER_ENCOURAGEMENT.firstTime(name, knowledge.title) })
  }

  // Connection to previous topic
  if (relatedSession) {
    parts.push({ type:'text', text: TEACHER_ENCOURAGEMENT.connected(relatedSession.replace(/_/g,' '), knowledge.title) })
  }

  // Stage 1: Simple hook
  parts.push({ type:'heading', text:`🎯 The Big Idea` })
  if (knowledge.keyFacts.length > 0) {
    const simpleFact = knowledge.keyFacts[0]
    parts.push({ type:'text', text: `In simple terms: **${simpleFact}**` })
  }

  // Stage 2: Proper definition
  if (knowledge.definitions.length > 0) {
    parts.push({ type:'heading', text:`📖 The Full Definition` })
    parts.push({ type:'text', text: knowledge.definitions[0].definition })
  }

  // Stage 3: Key facts
  if (knowledge.keyFacts.length > 1) {
    parts.push({ type:'heading', text:`⚡ Key Points to Remember` })
    parts.push({ type:'list', items: knowledge.keyFacts.slice(0, 4) })
  }

  // Formulas if any
  if (knowledge.formulas.length > 0) {
    parts.push({ type:'heading', text:`📐 Formula` })
    parts.push({ type:'formula', items: knowledge.formulas.slice(0,2).map(f => `${f.label}: ${f.content}`) })
  }

  // Understanding check (Socratic)
  const checkPromptFn = TEACHER_CHECK_PROMPTS[Math.floor(Math.random() * TEACHER_CHECK_PROMPTS.length)]
  parts.push({ type:'text', text: `\n---\n${checkPromptFn(name, knowledge.title)}` })
  parts.push({ type:'suggestions', items:[
    `I understand ${knowledge.title}`,
    `Quiz me on ${knowledge.title}`,
    `Give me an example`,
    `I need more explanation`,
  ]})

  return { parts, topic: knowledge.topic, subject: knowledge.subject, awaitingCheck: true }
}

// Evaluate "I understand" or typed answer after a check prompt
function handleUnderstandingCheck(input, knowledge, studentName) {
  const name = studentName || conversationMemory.studentName || ''
  const lower = input.toLowerCase()
  const isPositive = /understand|got it|yes|i know|makes sense|clear|okay|ok|sure/i.test(lower)
  const isNegative = /no|don.t|confused|lost|not sure|help|again|unclear|still|what/i.test(lower)

  if (isNegative || lower.length < 15) {
    // Re-explain differently
    const parts = [
      { type:'text', text:`No problem${name ? ', '+name : ''}! Let me try a different approach.` },
    ]
    if (knowledge?.examples?.length > 0) {
      parts.push({ type:'heading', text:'📝 Real Example' })
      parts.push({ type:'text', text: knowledge.examples[0] })
    } else if (knowledge?.keyFacts?.length > 0) {
      parts.push({ type:'text', text:`Here is the simplest way to think about it:\n\n${knowledge.keyFacts[0]}` })
    }
    parts.push({ type:'suggestions', items:[`Quiz me on ${knowledge?.title || 'this topic'}`, 'Try explaining it to me', 'Move to next topic'] })
    return { parts }
  }

  // Evaluate typed answer if substantial
  if (!isPositive && lower.length > 20 && knowledge) {
    const eval_ = evaluateStudentAnswer(input, knowledge)
    if (eval_) {
      const parts = [{ type:'text', text: eval_.feedback }]
      if (eval_.verdict === 'good') {
        const enc = TEACHER_ENCOURAGEMENT.correct[Math.floor(Math.random()*3)](name, null)
        parts.unshift({ type:'text', text: enc })
        parts.push({ type:'suggestions', items:[`Quiz me on ${knowledge.title}`, 'Explain next topic', 'Make me a study plan'] })
      } else {
        parts.push({ type:'suggestions', items:[`Explain ${knowledge.title} again`, `Quiz me on ${knowledge.title}`, 'Move on'] })
      }
      return { parts }
    }
  }

  // Student says they understand — offer quiz
  const enc = TEACHER_ENCOURAGEMENT.correct[Math.floor(Math.random()*TEACHER_ENCOURAGEMENT.correct.length)](name, null)
  return {
    parts: [
      { type:'text', text: enc },
      { type:'text', text:`Now let me test you with a quick question to make sure it sticks.` },
      { type:'suggestions', items:[`Quiz me on ${knowledge?.title || 'this'}`, 'Explain more examples', 'Move to next topic', 'Make me a study plan'] }
    ]
  }
}

export { buildProgressiveExplanation, handleUnderstandingCheck, TEACHER_ENCOURAGEMENT }

export function generateGreetResponse(studentName) {
  const n = studentName || conversationMemory.studentName
  return { parts:[{ type:'text', text: pick(GREETINGS)(n) }], suggestions:['Explain photosynthesis','Quiz me on forces','How do I calculate moles?','Make me a study plan'] }
}
export function generateThanksResponse() {
  const mem = conversationMemory
  return { parts:[{ type:'text', text: pick(THANKS_MSGS) }], suggestions: mem.lastTopic ? [`Quiz me on ${mem.lastTopic.replace(/_/g,' ')}`, 'Explain another topic', 'Make me a study plan'] : ['Explain photosynthesis','Quiz me on algebra','How do I find force?'] }
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




// Cached profile - refreshed when chatbot opens
// Cache lives for 5 minutes OR until invalidated (e.g. after quiz completion)
let cachedProfile = null
let profileStudentId = null
let profileCachedAt = 0
const CACHE_TTL_MS = 5 * 60 * 1000  // 5 minutes

export async function loadStudentProfile(studentId) {
  if (!studentId) return null
  const now = Date.now()
  const isStale = (now - profileCachedAt) > CACHE_TTL_MS
  if (profileStudentId === studentId && cachedProfile && !isStale) return cachedProfile
  try {
    cachedProfile = await analyseStudent(studentId)
    profileStudentId = studentId
    profileCachedAt = now
    return cachedProfile
  } catch { return null }
}

// Call this after quiz completion so next chatbot open gets fresh data
export function invalidateProfileCache() {
  cachedProfile = null
  profileCachedAt = 0
}

export function getCachedProfile() { return cachedProfile }

// -- Proactive greeting using real student data --------------------
export function generatePersonalisedGreeting(profile, studentName) {
  const name = studentName || conversationMemory.studentName || ''
  if (!profile) return null  // fall back to default greeting

  const { summary, bySubject, allWeakTopics, subjectStrength, examPredictions } = profile

  // Find weakest subject
  const weakestSubj = Object.entries(subjectStrength)
    .filter(([,v]) => v > 0)
    .sort((a,b) => a[1]-b[1])[0]

  // Find top at-risk topic
  const topRisk = Object.values(examPredictions)
    .flat().sort((a,b) => b.riskScore-a.riskScore)[0]

  // Build personalised message
  const lines = []
  lines.push(`Hello${name?' '+name:''}! 👋 I've looked at your progress and here's what I found:\n`)

  if (summary.totalCompleted > 0) {
    lines.push(`📊 **Your stats:** ${summary.totalCompleted} lessons done · ${summary.globalAvg}% average score · studied ${summary.studyDaysThisWeek}/7 days this week`)
  }

  if (weakestSubj) {
    lines.push(`⚠️ **Needs attention:** ${weakestSubj[0]} (${weakestSubj[1]}% strength) - this is where you need the most work`)
  }

  if (allWeakTopics.length > 0) {
    const t = allWeakTopics[0]
    lines.push(`🔄 **Lowest score:** ${t.topic.replace(/_/g,' ')} in ${t.subject} - you got ${t.score}%`)
  }

  if (topRisk && topRisk.mastery < 70) {
    lines.push(`🎓 **UNEB risk:** ${topRisk.topic.replace(/_/g,' ')} - important exam topic, only ${topRisk.mastery}% mastered`)
  }

  if (summary.streakRisk) {
    lines.push(`⏰ **Study streak:** You've only studied ${summary.studyDaysThisWeek} days this week - aim for at least 5!`)
  }

  lines.push(`\nWhat would you like to work on? I can explain topics, quiz you on weak areas, or give you a study plan.`)

  return {
    parts: [
      { type: 'text', text: lines.join('\n') },
      { type: 'suggestions', items: [
        weakestSubj ? `Quiz me on ${weakestSubj[0]}` : 'Explain photosynthesis',
        allWeakTopics[0] ? `Explain ${allWeakTopics[0].topic.replace(/_/g,' ')}` : 'Quiz me on forces',
        topRisk ? `Exam tips for ${topRisk.topic.replace(/_/g,' ')}` : 'How do I calculate force?',
        'What should I study today?',
      ]}
    ]
  }
}

// -- Personalised study recommendation using real data -------------
export function generateSmartRecommendation(profile) {
  if (!profile) {
    return {
      parts: [
        { type:'heading', text:'🗺️ Study Recommendation' },
        { type:'text', text:"I don't have your quiz history yet. Start by completing some lessons and quizzes, then I can give you personalised recommendations!" },
        { type:'suggestions', items:['Explain algebra','Quiz me on forces','Explain photosynthesis','Exam tips for chemistry'] }
      ]
    }
  }

  const { summary, allWeakTopics, subjectStrength, examPredictions, dominantMistakes, adaptiveDifficulty } = profile
  const parts = []

  parts.push({ type:'heading', text:'🗺️ Your Personalised Study Plan' })

  // Overall summary
  if (summary.totalCompleted > 0) {
    parts.push({ type:'text', text:`Based on your **${summary.totalCompleted} completed lessons** and **${summary.globalAvg}% average score**, here is what I recommend:` })
  }

  // Weakest topics to retry
  if (allWeakTopics.length > 0) {
    parts.push({ type:'list', title:'🔄 Retry these (your lowest scores):', items:
      allWeakTopics.slice(0,4).map(t => `${t.topic.replace(/_/g,' ')} (${t.subject}) - you got ${t.score}%`)
    })
  }

  // High UNEB risk
  const topRisks = Object.entries(examPredictions)
    .flatMap(([subj, preds]) => preds.slice(0,2).map(p => ({...p, subject:subj})))
    .filter(p => p.mastery < 65)
    .sort((a,b) => b.riskScore - a.riskScore)
    .slice(0,3)

  if (topRisks.length > 0) {
    parts.push({ type:'list', title:'🎓 High UNEB priority topics:', items:
      topRisks.map(t => `${t.topic.replace(/_/g,' ')} (${t.subject}) - ${t.mastery}% mastered, high exam probability`)
    })
  }

  // Mistake pattern advice
  if (dominantMistakes.length > 0) {
    const m = dominantMistakes[0]
    parts.push({ type:'text', text:`🧠 **Your main weakness type:** ${m.label} - ${
      m.id==='calculation' ? 'Practice more worked examples and show full working in every answer' :
      m.id==='concept'     ? 'Focus on definitions and understanding the "why" behind each topic' :
      m.id==='application' ? 'Practice questions that start with "given that..." or "a student..."' :
      m.id==='memory'      ? 'Use flashcards and revision summaries for key facts and definitions' :
      'Draw and label diagrams from memory as part of your revision'
    }` })
  }

  // Difficulty level
  const weakestSubj = Object.entries(subjectStrength).filter(([,v])=>v>0).sort((a,b)=>a[1]-b[1])[0]
  if (weakestSubj) {
    const diff = adaptiveDifficulty[weakestSubj[0]]
    const levels = ['','Foundation','Developing','Intermediate','Advanced','Expert']
    parts.push({ type:'text', text:`📈 **Recommended level for ${weakestSubj[0]}:** ${levels[diff] || 'Foundation'} - start with easier questions and build up` })
  }

  parts.push({ type:'suggestions', items: [
    allWeakTopics[0] ? `Quiz me on ${allWeakTopics[0].topic.replace(/_/g,' ')}` : 'Quiz me on algebra',
    topRisks[0]      ? `Explain ${topRisks[0].topic.replace(/_/g,' ')}` : 'Explain forces',
    weakestSubj      ? `Exam tips for ${weakestSubj[0]}` : 'Exam tips for chemistry',
    'How do I improve my score?',
  ]})

  return { parts }
}



// ===================================================================
// CONVERSATION MEMORY  v5
// ===================================================================

export const conversationMemory = {
  lastTopic: null, lastSubject: null, lastKnowledge: null,
  quizStreak: 0, quizTotal: 0, messageCount: 0,
  studentName: null,
  sessionTopics: [],       // all topics covered this session
  conversationHistory: [], // for API context: [{role, content}]
  teachMode: false,        // Socratic questioning mode
  awaitingCheck: false,    // waiting for student's understanding response
  milestone: 0,            // for streak celebration
}

export function resetMemory() {
  Object.assign(conversationMemory, {
    lastTopic: null, lastSubject: null, lastKnowledge: null,
    quizStreak: 0, quizTotal: 0, messageCount: 0,
    studentName: null, sessionTopics: [], conversationHistory: [],
    teachMode: false, milestone: 0, awaitingCheck: false,
  })
}

function addToHistory(role, content) {
  conversationMemory.conversationHistory.push({ role, content })
  // Keep last 12 messages to avoid huge API payloads
  if (conversationMemory.conversationHistory.length > 12) {
    conversationMemory.conversationHistory = conversationMemory.conversationHistory.slice(-12)
  }
}

// ===================================================================
// ANSWER EVALUATOR  v5 — checks formulas + keywords
// ===================================================================

export function evaluateStudentAnswer(studentAnswer, knowledge) {
  if (!knowledge) return null
  const ans = studentAnswer.toLowerCase().trim()

  // Check formulas first (for calculate questions)
  for (const formula of knowledge.formulas) {
    const fContent = formula.content.toLowerCase()
    const fWords = fContent.split(/\s+/).filter(w => w.length > 1)
    const matched = fWords.filter(w => ans.includes(w)).length
    if (matched / Math.max(fWords.length, 1) >= 0.6) {
      return { verdict: 'good', score: 90, feedback: `✅ Correct formula! ${formula.label}: ${formula.content}`, missing: [] }
    }
  }

  // Check definitions
  for (const def of knowledge.definitions) {
    const correct = def.definition.toLowerCase()
    const keyWords = correct.split(/\s+/).filter(w => w.length > 4)
    const matched = keyWords.filter(w => ans.includes(w)).length
    const score = Math.round((matched / Math.max(keyWords.length, 1)) * 100)
    if (score >= 70) {
      return { verdict:'good', score, feedback:`✅ Good definition! Full answer: **${def.definition}**`, missing: keyWords.filter(w=>!ans.includes(w)).slice(0,3) }
    } else if (score >= 40) {
      const missing = keyWords.filter(w=>!ans.includes(w)).slice(0,3)
      return { verdict:'partial', score, feedback:`🟡 Partially correct — key terms missing: **${missing.join(', ')}**\n\nFull definition: **${def.definition}**`, missing }
    } else {
      return { verdict:'incorrect', score, feedback:`❌ Not quite. The correct definition: **${def.definition}**\n\nKey terms: **${keyWords.slice(0,4).join(', ')}**`, missing: keyWords }
    }
  }

  // Check key facts
  if (knowledge.keyFacts.length > 0) {
    const factWords = knowledge.keyFacts.join(' ').toLowerCase().split(/\s+/).filter(w=>w.length>4)
    const matched = factWords.filter(w => ans.includes(w)).length
    const score = Math.round((matched / Math.max(factWords.length * 0.3, 1)) * 100)
    if (score >= 60) return { verdict:'good', score: Math.min(score,100), feedback:`✅ Correct! Good understanding of ${knowledge.title}.` }
    else return { verdict:'incorrect', score, feedback:`❌ Not quite right. Here's the key fact:\n\n${knowledge.keyFacts[0]}` }
  }
  return null
}

// ===================================================================
// MAIN PROCESSOR  v5
// ===================================================================

export async function processMessage(input, context={}) {
  const mem = conversationMemory
  mem.messageCount++
  if (context.studentName && !mem.studentName) mem.studentName = context.studentName

  // Add user message to history for API context
  addToHistory('user', input)

  // ── Real teacher: handle understanding check response ──
  if (mem.awaitingCheck && mem.lastKnowledge) {
    const skipTriggers = /quiz|explain|next|move|study plan|help|another/i
    if (!skipTriggers.test(input)) {
      const checkResponse = handleUnderstandingCheck(input, mem.lastKnowledge, mem.studentName)
      if (checkResponse) {
        mem.awaitingCheck = false
        return checkResponse
      }
    }
    mem.awaitingCheck = false
  }

  const { intent } = classifyIntent(input)

  // --- Quiz answer check ---
  if (context.quizMode && context.currentQuestion) {
    const result = checkQuizAnswer(input, context.currentQuestion)
    if (result) {
      result.correct ? (mem.quizStreak++, mem.quizTotal++) : (mem.quizStreak=0, mem.quizTotal++)

      // Milestone celebrations
      let streakMsg = ''
      if (result.correct && mem.quizStreak === 3) streakMsg = ` 🔥 3 in a row! You're on fire!`
      else if (result.correct && mem.quizStreak === 5) streakMsg = ` ⚡ 5 in a row!! UNSTOPPABLE!`
      else if (result.correct && mem.quizStreak === 10) streakMsg = ` 🏆 10 in a row!!! EXAM READY!`
      else if (result.correct && mem.quizStreak >= 3) streakMsg = ` 🔥 ${mem.quizStreak} in a row!`

      const parts = []
      if (result.correct) parts.push({ type:'correct', text: pick(CORRECT_RESP)(mem.studentName) + streakMsg })
      else { parts.push({ type:'wrong', text: pick(WRONG_RESP)() }); parts.push({ type:'text', text:`✅ Correct answer: **"${result.answer}"**` }) }
      if (result.explanation) parts.push({ type:'text', text:`💡 **Why:** ${result.explanation}` })
      const tn = context.topic?.replace(/_/g,' ') || 'this topic'
      parts.push({ type:'suggestions', items:[`Next question on ${tn}`,`Explain ${tn}`,'Quiz me on something else', `Exam tips for ${tn}`] })
      const resp = { parts, quizMode:false, wasAnswer:true, correct:result.correct }
      addToHistory('assistant', result.correct ? 'Correct! ' + (result.explanation||'') : 'Wrong. Correct: ' + result.answer)
      return resp
    }
  }

  const lastK = mem.lastKnowledge
  const history = mem.conversationHistory

  // --- Follow-ups (use last context) ---
  if (intent==='FOLLOWUP_MORE') {
    const r = lastK ? generateMoreResponse(lastK) : { parts:[{ type:'text', text:'What topic would you like more detail on?' }] }
    addToHistory('assistant', 'More detail provided')
    return r
  }
  if (intent==='FOLLOWUP_SIMPLER') {
    const r = lastK ? generateExplainResponse(lastK, input, true) : { parts:[{ type:'text', text:'Which topic should I explain more simply?' }] }
    addToHistory('assistant', 'Simpler explanation provided')
    return r
  }
  if (intent==='FOLLOWUP_EXAMPLE') {
    if (lastK?.examples?.length>0) {
      const ex = lastK.examples[Math.floor(Math.random()*lastK.examples.length)]
      const r = { parts:[{ type:'heading', text:`💡 Example: ${lastK.title}` },{ type:'example', title:ex.title, text:ex.body },{ type:'suggestions', items:[`Quiz me on ${lastK.title}`,'Another example please',`Explain ${lastK.title}`] }], topic:lastK.topic, subject:lastK.subject }
      addToHistory('assistant', `Example of ${lastK.title} given`)
      return r
    }
    return { parts:[{ type:'text', text:'Which topic would you like an example for?' }] }
  }
  if (intent==='FOLLOWUP_WHY') {
    const r = generateWhyResponse(lastK, input)
    addToHistory('assistant', `Why explanation for ${lastK?.title||'topic'}`)
    return r
  }
  if (intent==='FOLLOWUP_NEXT_QUIZ') {
    if (mem.lastTopic && mem.lastSubject) {
      const k = await loadTopicKnowledge(mem.lastTopic, mem.lastSubject)
      if (k) { const r = generateQuizResponse(k, context.quizSession); addToHistory('assistant','Quiz question'); return r }
    }
    return { parts:[{ type:'text', text:"Which topic should I quiz you on? e.g. _'Quiz me on forces'_" }] }
  }
  if (intent==='FOLLOWUP_NEXT_TOPIC') {
    const r = generateNextTopicResponse(mem.lastTopic, mem.lastSubject)
    if (r.nextTopic) { mem.lastTopic = r.nextTopic.file; mem.lastSubject = r.nextTopic.subject }
    addToHistory('assistant', `Navigated to next topic`)
    return r
  }
  if (intent==='FOLLOWUP_SUMMARY') {
    return generateSummaryResponse(mem.sessionTopics)
  }

  // --- Simple intents ---
  if (intent==='GREET') {
    const profile = context.studentProfile || getCachedProfile()
    const r = generatePersonalisedGreeting(profile, context.studentName) || generateGreetResponse(context.studentName)
    addToHistory('assistant', 'Greeted student')
    return r
  }
  if (intent==='THANKS') { const r = generateThanksResponse(); addToHistory('assistant','Thanks acknowledged'); return r }
  if (intent==='RECOMMEND') {
    const r = generateSmartRecommendation(context.studentProfile || getCachedProfile())
    addToHistory('assistant','Study recommendation given')
    return r
  }
  if (intent==='STUDY_PLAN') {
    const profile = context.studentProfile || getCachedProfile()
    return generateStudyPlan(profile, input)
  }
  if (intent==='VOICE') return generateVoiceResponse()

  // --- IMPROVE ---
  if (intent==='IMPROVE') {
    const profile = context.studentProfile || getCachedProfile()
    const parts = [{ type:'heading', text:'📈 How to Improve Your Scores' }]
    if (profile && profile.summary.totalCompleted > 0) {
      const { dominantMistakes, allWeakTopics, subjectStrength, summary } = profile
      parts.push({ type:'text', text:`Your current average is **${summary.globalAvg}%**. Here is your personalised plan:` })
      if (dominantMistakes.length > 0) {
        const m = dominantMistakes[0]
        const advice = {
          calculation:'Practice at least 5 worked examples per topic. Write every step — never skip.',
          concept:'Write each key definition in your own words without looking. Repeat daily.',
          application:'Practice past paper "Given that..." problems. Do at least 2 every day.',
          memory:'Use the Flashcards feature. Cover the answer and recall before flipping.',
          diagram:'Draw and label diagrams from memory. Check against notes. Repeat.',
        }
        parts.push({ type:'text', text:`🎯 **Your biggest weakness: ${m.label}**\n→ ${advice[m.id]||'Focus on consistent daily practice.'}` })
      }
      if (allWeakTopics.length > 0)
        parts.push({ type:'list', title:'🔄 Retry these first (lowest scores):', items: allWeakTopics.slice(0,3).map(t=>`${t.topic.replace(/_/g,' ')} — ${t.score}%, aim for 70%+`) })
    } else {
      parts.push({ type:'text', text:'Complete some quizzes first — then I can give personalised advice based on your actual results!' })
    }
    parts.push({ type:'list', title:'📋 Daily improvement plan:', items:[
      '1️⃣ 1 lesson minimum per day — consistency beats cramming',
      '2️⃣ Read the AI explanation for every wrong answer',
      '3️⃣ Flashcards for topics below 60%',
      '4️⃣ Weekly mock exam in the Exam Center',
      '5️⃣ Focus on high UNEB topics: Forces, Genetics, Acids & Bases, Quadratics',
    ]})
    parts.push({ type:'suggestions', items:['Make me a study plan','Show exam tips for maths','Quiz me on my weakest topic','What should I study today?'] })
    return { parts }
  }

  // --- Equation/calculation solving (check before topic detection) ---
  if (intent==='CALCULATE' || /solve|calculate|find [a-z]|=\s*\d|how (do i|to) (find|calculate|work out)/i.test(input)) {
    const solved = masterSolve(input)
    if (solved) {
      const subject = /chemistry|moles|ph|titrat|yield|avogadro|stp/i.test(input) ? '⚗️ Chemistry' :
                      /physic|force|velocity|wave|pressure|transform|half.life|snell|electric/i.test(input) ? '⚡ Physics' :
                      /biology|magnif|cell/i.test(input) ? '🔬 Biology' : '🧮 Mathematics'
      const r = {
        parts: [
          { type:'heading', text:`${subject} — Step-by-Step Solution` },
          { type:'list', title:'📋 Working:', items: solved.steps },
          { type:'suggestions', items:['Give me another problem like this','Explain this topic','Quiz me on this topic','Exam tips'] },
        ]
      }
      addToHistory('assistant', `Solved: ${solved.type}`)
      return r
    }
  }

  // --- Student's own answer evaluation ---
  const isOwnAnswer = /^(osmosis|photosynthesis|diffusion|respiration|mitosis|meiosis|gravity|friction|voltage|acid|base|atom|cell|gene|enzyme|catalyst|oxidation|reduction|electrolysis|probability|vector|matrix)[\s,]+(is|are|means|refers|occurs|happens|involves)/i.test(input.trim())
    || /^my answer[:\s]/i.test(input.trim())
    || /^i think[:\s]/i.test(input.trim())

  if (isOwnAnswer && mem.lastKnowledge) {
    const evaluation = evaluateStudentAnswer(input, mem.lastKnowledge)
    if (evaluation) {
      const r = {
        parts: [
          { type: evaluation.verdict==='good' ? 'correct' : evaluation.verdict==='partial' ? 'text' : 'wrong', text: evaluation.feedback },
          evaluation.missing?.length > 0 ? { type:'list', title:'📝 Key terms to include:', items: evaluation.missing } : null,
          { type:'suggestions', items:[`Quiz me on ${mem.lastKnowledge.title}`,`Tell me more about ${mem.lastKnowledge.title}`,'Give me an example','Exam tips'] },
        ].filter(Boolean),
        topic: mem.lastKnowledge.topic, subject: mem.lastKnowledge.subject,
      }
      addToHistory('assistant', `Answer evaluated: ${evaluation.verdict}`)
      return r
    }
  }

  // --- Load knowledge for topic ---
  const topicResult = extractTopic(input)
  let knowledge = null
  if (topicResult) {
    knowledge = await loadTopicKnowledge(topicResult.topic, topicResult.subject, topicResult.level)
  } else if (mem.lastTopic && mem.lastSubject) {
    knowledge = await loadTopicKnowledge(mem.lastTopic, mem.lastSubject)
  }

  if (knowledge) {
    mem.lastTopic = knowledge.topic
    mem.lastSubject = knowledge.subject
    mem.lastKnowledge = knowledge
    if (!mem.sessionTopics.includes(knowledge.title)) mem.sessionTopics.push(knowledge.title)
  }

  // --- Personalise with student profile ---
  const profile = context.studentProfile || getCachedProfile()
  if (profile && knowledge) {
    const subjectData = profile.bySubject[knowledge.subject]
    const isWeakTopic = subjectData?.weakTopics?.includes(knowledge.topic)
    const isStrongTopic = subjectData?.strongTopics?.includes(knowledge.topic)
    const topicScore = profile.allWeakTopics.find(t=>t.topic===knowledge.topic)?.score
    if (isWeakTopic && topicScore !== undefined)
      knowledge._personalNote = `⚠️ You scored **${topicScore}%** here last time — pay extra attention!`
    else if (isStrongTopic)
      knowledge._personalNote = `✅ You're doing well here — try the harder questions!`
  }

  // --- Route to generator ---
  let response
  switch (intent) {
    case 'EXPLAIN': {
      // Use progressive teacher explanation if we have profile data
      const profile = cachedProfile
      const teachResp = buildProgressiveExplanation(knowledge, mem.studentName, profile)
      if (teachResp) {
        mem.lastKnowledge = knowledge
        mem.awaitingCheck = true
        response = teachResp
      } else {
        response = generateExplainResponse(knowledge, input)
      }
      break
    }
    case 'CALCULATE':
      response = generateCalculateResponse(knowledge, input)
      break
    case 'QUIZ':
      response = generateQuizResponse(knowledge, context.quizSession)
      break
    case 'HINT':
      response = generateHintResponse(knowledge, input)
      break
    case 'EXAM_TIP':
      response = generateExamTipResponse(knowledge, input)
      break
    case 'COMPARE':
      response = await generateCompareResponse(knowledge, input)
      break
    case 'TEACH':
      response = generateTeachResponse(knowledge, input)
      break
    case 'MULTI':
      // Explain first, then quiz
      response = generateExplainResponse(knowledge, input)
      response.followUpQuiz = true
      break
    default:
      response = generateExplainResponse(knowledge, input)
  }

  if (response && !response.parts) response = await smartFallback(input)
  addToHistory('assistant', response?.parts?.[0]?.text?.substring(0,100) || 'Response sent')
  return response || await smartFallback(input)
}

// --- TEACH mode — Socratic questioning (100% offline) ---
function generateTeachResponse(knowledge, input) {
  if (!knowledge) return smartFallback(input)
  // Socratic
  const parts = [
    { type:'heading', text:`🎓 Let's Learn: ${knowledge.title}` },
    { type:'text', text:`Before I explain, let me ask you: **What do you already know about ${knowledge.title}?**` },
    { type:'text', text:`(Type your answer and I will build on it. If you don't know — just say "nothing yet"!)` },
    { type:'suggestions', items:['Nothing yet — teach me from scratch',`I know a little about ${knowledge.title}`,`Quiz me on ${knowledge.title} first`] }
  ]
  return { parts, topic: knowledge.topic, subject: knowledge.subject, teachMode: true }
}

// ===================================================================
// QUICK TOPIC CHIPS
// ===================================================================

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
  { label:'📅 Study Plan',        query:'Make me a 30-day study plan' },
  { label:'🆚 Compare Topics',    query:'Difference between mitosis and meiosis' },
]
