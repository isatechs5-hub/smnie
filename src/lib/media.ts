export const NIEM_MEDIA = {
  campusHero: '/assets/aistudio/nie_bulding_d-22-p-7_ed02527d.jpg',
  logo: '/assets/aistudio/NIE_LOGO_347614dc.jpg',
  classroomPrimary: '/assets/aistudio/istoc_dcded119.jpg',
  lectureHall: '/assets/aistudio/istockphoto-95431111-612x612_ba84a8bf.jpg',
  mahatmaGandhi: '/assets/aistudio/gandi_f4a38714.jpg',
  indiraGandhi: '/assets/aistudio/ig_051cf76a.jpg',
  ignouHeritage: '/assets/aistudio/IGNOU-extends-admission_1985dded.jpg',
  ignouGate: '/assets/aistudio/IGNOU_c4af0343.jpg',
  ignouRegional: '/assets/aistudio/2_abdbdce4.jpg',
  ignouEntranceWall: '/assets/aistudio/placr_e8f20e1d.jpg',
} as const;

export const NIEM_INSTITUTIONAL_GALLERY = [
  {
    src: NIEM_MEDIA.ignouHeritage,
    title: 'IGNOU — The People’s University',
    caption: 'Academic heritage and open university learning reference',
    alt: 'Indira Gandhi National Open University heritage building with IGNOU emblem',
  },
  {
    src: NIEM_MEDIA.ignouGate,
    title: 'IGNOU Main Campus Entrance',
    caption: 'Indira Gandhi National Open University entrance gateway',
    alt: 'Indira Gandhi National Open University main campus entrance gate',
  },
  {
    src: NIEM_MEDIA.ignouRegional,
    title: 'IGNOU Regional Centre',
    caption: 'Regional academic centre and learner support complex',
    alt: 'Indira Gandhi National Open University regional centre signboard and building',
  },
  {
    src: NIEM_MEDIA.ignouEntranceWall,
    title: 'University Campus Premise',
    caption: 'Indira Gandhi National Open University campus entrance wall',
    alt: 'Indira Gandhi National Open University stone campus entrance wall',
  },
] as const;

export const NIEM_CONTACT = {
  website: 'www.smnie.in',
  websiteUrl: 'https://www.smnie.in',
  emails: {
    info: 'info@smnie.in',
    exam: 'Exam@smnie.in',
    verification: 'studentverification@smnie.in',
  },
  phones: ['011-64506504', '011-22588575'],
  offices: [
    {
      id: 'delhi',
      role: 'Head Office',
      city: 'New Delhi',
      title: 'National Institute of Engineering & Management',
      addressLines: [
        'H-96 Siddharth Building, No. 807 Nehru Place,',
        'New Delhi, 110019.',
      ],
      phones: ['011-64506504', '011-22588575'],
      email: 'info@smnie.in',
    },
    {
      id: 'mysore',
      role: 'Regional Office',
      city: 'Mysore',
      title: 'NIEM Regional Office — Mysore',
      addressLines: [
        'Ashraya Complex No. 271, Lakshmi Vilas Road,',
        'Mysore – 570024.',
      ],
      phones: ['011-64506504'],
      email: 'info@smnie.in',
    },
    {
      id: 'bangalore',
      role: 'Regional Office',
      city: 'Bangalore',
      title: 'NIEM Regional Office — Bangalore',
      addressLines: [
        '40/1, Sree Venkateshwara Mansion,',
        'Opposite Kamala Nehru College, Bangalore – 560004.',
      ],
      phones: ['011-64506504'],
      email: 'info@smnie.in',
    },
  ],
} as const;
