export const PALETTE = {
  pitch:    0x0a0a0c,
  concrete: 0x16181d,
  bone:     0xece6d9,
  ash:      0x767b85,
  hazard:   0xff4a1c,
  chameleon:0x2be3b0,
  cyan:     0x14d6ff,
  magenta:  0xff1e5a,
}

export const hex = (n) => '#' + n.toString(16).padStart(6, '0')

export const IDENTITY = {
  name: 'NIKI SUKIASYAN',
  nameKa: 'ნიკი სუკიასიანი',
  role: 'FULL-STACK DEVELOPER',
  city: 'TBILISI',
  coords: '41.71°N 44.83°E',
  years: '5+ YRS',
  subtitle: 'Full-stack engineer, Tbilisi — backends built for weight, interfaces built for the eye.',
  enterPrompt: 'Sound on. Lights low. Press anywhere to enter.',
  enterKa: 'შემოდი',
  bootLog: [
    'SUKIASYAN.SYS v5.2 — cold boot',
    'mounting /dev/career … OK',
    'uptime detected: 5 years',
    'loading /projects … 6 found',
    'locales: ka en ru de hy [5 installed]',
    'chameleon driver: STANDBY',
    'audio: SYNTHWAVE / sci-fi v6 · loaded',
    'audio: LOCKED — gesture required',
  ],
}

export const PROJECTS = [
  {
    n: '01', key: 'rompetrol', name: 'Rompetrol Mobile Backend', company: 're:soft',
    period: 'Feb 2026 — Present', role: 'Backend Developer',
    title: 'Fuel for a Network',
    desc: 'The backend architecture powering the official mobile app of Rompetrol — a major international gas-station network.',
    points: [
      'Scalable, secure REST APIs in PHP / Laravel for the whole mobile ecosystem.',
      'Payment gateways, fuel-terminal systems and loyalty programs.',
      'Background jobs & queues, high-availability data sync, bank-grade security.',
    ],
    skills: ['PHP', 'LARAVEL', 'REST API', 'PAYMENTS', 'QUEUES'],
    accent: 0x2be3b0, mode: 'aeolian', root: 196.00,
  },
  {
    n: '02', key: 'hotcard', name: 'HotCard Mobile Backend', company: 'Hotcard',
    period: 'Jan 2026 — Present', role: 'Backend Developer',
    title: 'The Clearing House',
    desc: 'A high-performance, secure backend for the HotCard mobile application.',
    points: [
      'Robust REST APIs in Laravel with real-time data synchronization.',
      'Efficient DB structures, query optimization and instant card processing.',
      'Secure third-party integrations and hardened data handling.',
    ],
    skills: ['PHP', 'LARAVEL', 'REDIS', 'CACHING', 'CONCURRENCY'],
    accent: 0xff6a2c, mode: 'tense', root: 174.61,
  },
  {
    n: '03', key: 'binebi', name: 'Binebi.ge Real-Estate Platform', company: 'Binebi.ge',
    period: 'Oct 2023 — Feb 2026', role: 'Front-end Developer', ka: 'ბინები',
    title: 'The Keys to the City',
    desc: 'Front-end for one of Georgia’s leading, highest-traffic real-estate platforms — tens of thousands of daily users.',
    points: [
      'Property search + multi-criteria filtering for seamless discovery.',
      'Interactive maps (Google Maps / Leaflet) plotting listings live.',
      'Image lazy-loading & asset optimization — fast on mobile and desktop.',
    ],
    skills: ['TYPESCRIPT', 'REACT', 'MAPS', 'PERFORMANCE', 'UI/UX'],
    accent: 0x2bc7e3, mode: 'add9', root: 220.00,
  },
  {
    n: '04', key: 'nawilebi', name: 'Nawilebi.ge Parts Marketplace', company: 'Binebi.ge',
    period: 'Mar 2024 — Feb 2025', role: 'Full-Stack Developer',
    title: 'Parts & Pieces',
    desc: 'End-to-end e-commerce for a leading automotive-parts marketplace.',
    points: [
      'REST API endpoints + an optimized database for a large catalog.',
      'Clean, component-driven, fully responsive front-end.',
      'Advanced search so users find the exact part, fast.',
    ],
    skills: ['PHP', 'LARAVEL', 'REACT', 'E-COMMERCE', 'SEARCH'],
    accent: 0xe3c95b, mode: 'major', root: 261.63,
  },
  {
    n: '05', key: 'reeducate', name: 'Re:Educate LMS Backend', company: 're:soft',
    period: 'Jan 2024 — Dec 2024', role: 'Backend Developer',
    title: 'The Ones Who Come After',
    desc: 'A custom Learning Management System for an educational institution & college.',
    points: [
      'Scalable REST APIs: courses, enrollment and grading workflows.',
      'Role-Based Access Control (RBAC) for students, instructors & admins.',
      'Progress tracking, notifications and peak-load performance tuning.',
    ],
    skills: ['PHP', 'LARAVEL', 'RBAC', 'LMS', 'REST API'],
    accent: 0x9b8cff, mode: 'aeolian', root: 246.94,
  },
  {
    n: '06', key: 'alliance', name: 'Alliance Group E-commerce', company: 're:soft',
    period: 'Mar 2023 — Oct 2024', role: 'Front-end Developer',
    title: 'Built to Convert',
    desc: 'The e-commerce & corporate platform for Alliance Group, a leading real-estate developer in Georgia.',
    points: [
      'Interactive, feature-rich UI in modern front-end tech.',
      'E-commerce modules, advanced filtering and dynamic UI elements.',
      'Faster page loads and stronger SEO through performance work.',
    ],
    skills: ['TYPESCRIPT', 'FRONT-END', 'E-COMMERCE', 'SEO', 'UI'],
    accent: 0xff4a1c, mode: 'tense', root: 207.65,
  },
]

export const EMPLOYMENT = [
  { company: 'Re:Soft', role: 'Full-Stack Developer', period: 'Oct 2021 — Present' },
  { company: 'Hotcard', role: 'Back-End Developer', period: 'Jan 2026 — Present' },
  { company: 'BNB Holding · Binebi.ge', role: 'Full-Stack Developer', period: 'Oct 2023 — Jan 2026' },
  { company: 'Re:Educate', role: 'Lecturer — Front-End & Modern UI', period: 'Apr 2023 — Jun 2026' },
]

export const STACK = {
  FOUNDATION: ['PHP', 'Laravel', 'Node.js', 'Nest.js'],
  SURFACE:    ['JavaScript', 'TypeScript', 'React', 'Next.js'],
  MEMORY:     ['PostgreSQL', 'MySQL', 'SQL', 'Redis'],
  SHIP:       ['AWS', 'Docker', 'Git'],
}

export const STACK_FRAME =
  'Read the stack as four instincts, not a checklist — a foundation he builds in, a surface he composes on, a memory he keeps fast, and ground he ships from.'

export const LOCALES = [
  { en: 'Georgian',  native: 'ქართული' },
  { en: 'English',   native: 'English' },
  { en: 'Russian',   native: 'Русский' },
  { en: 'German',    native: 'Deutsch' },
  { en: 'Armenian',  native: 'Հայերեն' },
]

export const CERTS = [
  { name: 'Fundamentals of Prompt Engineering with Claude', issuer: 'AWS', date: 'May 2026' },
  { name: 'Amazon Bedrock — Getting Started', issuer: 'AWS', date: 'May 2026' },
]

export const EDUCATION = {
  degree: 'BSc Computer Science',
  school: 'Caucasus University, Tbilisi',
  period: 'Sept 2023 — Jun 2027',
}

export const CONTACT = {
  email: 'sukiasyanniki2005@gmail.com',
  phone: '+995 593 30 43 68',
  city: 'Tbilisi 41.71°N 44.83°E',
  github: 'github.com/NikiSukiasyan',
  linkedin: 'linkedin.com/in/niki-sukiasyan',
  linkedinUrl: 'https://www.linkedin.com/in/niki-sukiasyan-0723b32a0/',
  headline: 'OPEN TO WORK',
  bio: 'Full-stack developer out of Tbilisi — five-plus years building systems that carry real weight, with an eye that treats every interface as something worth designing. Fluent in five languages and the grammar of the web; he adapts to whatever the problem is wearing.',
  closing: 'Roll credits, or open a channel.',
  live: '— the line is live.',
  signoff: 'ნიკი სუკიასიანი',
}

export const EGG = 'ქამელეონი'
