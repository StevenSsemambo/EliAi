// Uganda National Examination timetables and exam papers
// Modelled on UNEB (Uganda National Examinations Board) format

export const EXAM_TIMETABLES = {
  UCE: {  // Uganda Certificate of Education (S4)
    name: "Uganda Certificate of Education (UCE)",
    level: "S4",
    year: 2024,
    duration_days: 14,
    papers: [
      { id:"uce_math_p1", subject:"mathematics", paper:"Paper 1 (Algebra & Calculus)", date:"2024-10-07", start:"09:00", duration_mins:150, topics:["algebra","sets","quadratic","simultaneous","calculus","vectors","permcomb"] },
      { id:"uce_math_p2", subject:"mathematics", paper:"Paper 2 (Geometry & Statistics)", date:"2024-10-08", start:"14:00", duration_mins:150, topics:["geometry","trigonometry","statistics","coordinate_sequences","functions","matrices_probability"] },
      { id:"uce_bio_p1",  subject:"biology",     paper:"Paper 1 (Theory)", date:"2024-10-09", start:"09:00", duration_mins:120, topics:["cells","diffusion_osmosis","photosynthesis_respiration","transport","digestion_ecology","genetics","hormones_homeostasis"] },
      { id:"uce_bio_p2",  subject:"biology",     paper:"Paper 2 (Practical)", date:"2024-10-10", start:"14:00", duration_mins:90,  topics:["cells","diffusion_osmosis","photosynthesis_respiration"] },
      { id:"uce_chem_p1", subject:"chemistry",   paper:"Paper 1 (Theory)", date:"2024-10-11", start:"09:00", duration_mins:120, topics:["atoms","matter","bonding","acids_periodic","reactions_metals","electrochemistry","organic_rates","thermochemistry"] },
      { id:"uce_chem_p2", subject:"chemistry",   paper:"Paper 2 (Practical)", date:"2024-10-14", start:"14:00", duration_mins:90,  topics:["atoms","bonding","reactions_metals"] },
      { id:"uce_phy_p1",  subject:"physics",     paper:"Paper 1 (Theory)", date:"2024-10-15", start:"09:00", duration_mins:120, topics:["measurement","forces","energy","light","waves_electricity","magnetism_heat","electromagnetic","radioactivity","circular_gravitation"] },
      { id:"uce_phy_p2",  subject:"physics",     paper:"Paper 2 (Practical)", date:"2024-10-16", start:"14:00", duration_mins:90,  topics:["measurement","forces","energy"] },
    ]
  },
  UACE: {  // Uganda Advanced Certificate of Education (S6)
    name: "Uganda Advanced Certificate of Education (UACE)",
    level: "S6",
    year: 2024,
    duration_days: 16,
    papers: [
      { id:"uace_math_p1",  subject:"mathematics", paper:"Pure Maths Paper 1", date:"2024-11-04", start:"09:00", duration_mins:180, topics:["further_calculus","complex_numbers","differential_equations","pure_mathematics"] },
      { id:"uace_math_p2",  subject:"mathematics", paper:"Pure Maths Paper 2", date:"2024-11-05", start:"14:00", duration_mins:180, topics:["mechanics","vectors","statistics_probability","applied_mathematics"] },
      { id:"uace_bio_p1",   subject:"biology",     paper:"Paper 1 (Theory)", date:"2024-11-06", start:"09:00", duration_mins:180, topics:["biochemistry","cell_biology_advanced","genetics_advanced","molecular_biology","immunology","developmental_biology"] },
      { id:"uace_bio_p2",   subject:"biology",     paper:"Paper 2 (Practical)", date:"2024-11-07", start:"14:00", duration_mins:120, topics:["biochemistry","cell_biology_advanced"] },
      { id:"uace_chem_p1",  subject:"chemistry",   paper:"Paper 1 (Theory)", date:"2024-11-08", start:"09:00", duration_mins:180, topics:["advanced_organic","transition_metals","spectroscopy","polymers","pharmaceuticals","green_chemistry"] },
      { id:"uace_chem_p2",  subject:"chemistry",   paper:"Paper 2 (Practical)", date:"2024-11-11", start:"14:00", duration_mins:120, topics:["advanced_organic","spectroscopy"] },
      { id:"uace_phy_p1",   subject:"physics",     paper:"Paper 1 (Theory)", date:"2024-11-12", start:"09:00", duration_mins:180, topics:["mechanics_advanced","thermal_physics","waves_optics","modern_physics","quantum_mechanics","astrophysics"] },
      { id:"uace_phy_p2",   subject:"physics",     paper:"Paper 2 (Practical)", date:"2024-11-13", start:"14:00", duration_mins:120, topics:["mechanics_advanced","waves_optics"] },
    ]
  }
}

export const MOCK_TESTS = [
  { id:"mock_math_s1", name:"S1 Mathematics Test", subject:"mathematics", level:"S1", duration_mins:60,  num_questions:20, topics:["numbers","algebra","geometry","sets","ratio_indices"] },
  { id:"mock_math_s2", name:"S2 Mathematics Test", subject:"mathematics", level:"S2", duration_mins:60,  num_questions:20, topics:["quadratic","trigonometry","statistics","simultaneous"] },
  { id:"mock_math_s3", name:"S3 Mathematics Test", subject:"mathematics", level:"S3", duration_mins:75,  num_questions:25, topics:["functions","coordinate_sequences","matrices_probability"] },
  { id:"mock_math_s4", name:"S4 Mathematics Test", subject:"mathematics", level:"S4", duration_mins:90,  num_questions:30, topics:["calculus","vectors","permcomb"] },
  { id:"mock_bio_s1",  name:"S1 Biology Test",     subject:"biology",     level:"S1", duration_mins:45,  num_questions:15, topics:["cells","diffusion_osmosis","photosynthesis_respiration"] },
  { id:"mock_bio_s2",  name:"S2 Biology Test",     subject:"biology",     level:"S2", duration_mins:45,  num_questions:15, topics:["transport","digestion_ecology"] },
  { id:"mock_bio_s3",  name:"S3 Biology Test",     subject:"biology",     level:"S3", duration_mins:60,  num_questions:20, topics:["genetics","hormones_homeostasis"] },
  { id:"mock_bio_s4",  name:"S4 Biology Test",     subject:"biology",     level:"S4", duration_mins:60,  num_questions:20, topics:["evolution_immunity"] },
  { id:"mock_chem_s1", name:"S1 Chemistry Test",   subject:"chemistry",   level:"S1", duration_mins:45,  num_questions:15, topics:["atoms","matter","bonding"] },
  { id:"mock_chem_s2", name:"S2 Chemistry Test",   subject:"chemistry",   level:"S2", duration_mins:45,  num_questions:15, topics:["acids_periodic","reactions_metals"] },
  { id:"mock_chem_s3", name:"S3 Chemistry Test",   subject:"chemistry",   level:"S3", duration_mins:60,  num_questions:20, topics:["electrochemistry","organic_rates"] },
  { id:"mock_chem_s4", name:"S4 Chemistry Test",   subject:"chemistry",   level:"S4", duration_mins:60,  num_questions:20, topics:["thermochemistry"] },
  { id:"mock_phy_s1",  name:"S1 Physics Test",     subject:"physics",     level:"S1", duration_mins:45,  num_questions:15, topics:["measurement","forces","energy","light"] },
  { id:"mock_phy_s2",  name:"S2 Physics Test",     subject:"physics",     level:"S2", duration_mins:45,  num_questions:15, topics:["waves_electricity","magnetism_heat"] },
  { id:"mock_phy_s3",  name:"S3 Physics Test",     subject:"physics",     level:"S3", duration_mins:60,  num_questions:20, topics:["electromagnetic","radioactivity"] },
  { id:"mock_phy_s4",  name:"S4 Physics Test",     subject:"physics",     level:"S4", duration_mins:60,  num_questions:20, topics:["circular_gravitation"] },
  // Mixed subject tests
  { id:"mock_all_s1",  name:"S1 End of Year Exam", subject:"all",         level:"S1", duration_mins:120, num_questions:40, topics:["all"] },
  { id:"mock_all_s4",  name:"UCE Practice Exam",   subject:"all",         level:"S4", duration_mins:180, num_questions:60, topics:["all"] },
]

export function getExamForStudent(classLevel) {
  const level = classLevel?.toString()
  if (level === 'S4' || level === '4') return EXAM_TIMETABLES.UCE
  if (level === 'S6' || level === '6') return EXAM_TIMETABLES.UACE
  return null
}

export function getMockTestsForLevel(classLevel) {
  const level = classLevel?.toString().replace('S','')
  return MOCK_TESTS.filter(t => t.level === `S${level}` || t.level === classLevel || t.subject === 'all')
}
