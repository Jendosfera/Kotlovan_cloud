import { BlueprintArray } from './types';

// Procedurally generate clean architectural & MEP SVG data URLs for instant offline demo
export const generateDemoBlueprint = (
  type: 'ARCH' | 'HVAC' | 'ELEC' | 'PLUMB',
  title: string
): string => {
  const width = 1200;
  const height = 800;

  let accentColor = '#38bdf8';
  let linesContent = '';

  if (type === 'ARCH') {
    accentColor = '#94a3b8';
    linesContent = `
      <rect x="100" y="100" width="1000" height="600" fill="none" stroke="#64748b" stroke-width="6"/>
      <line x1="500" y1="100" x2="500" y2="700" stroke="#64748b" stroke-width="4"/>
      <line x1="100" y1="400" x2="1100" y2="400" stroke="#64748b" stroke-width="4"/>
      <!-- Doors & Windows -->
      <path d="M 450,100 A 50,50 0 0,1 500,150" fill="none" stroke="#38bdf8" stroke-width="3" stroke-dasharray="4,4"/>
      <path d="M 1050,400 A 50,50 0 0,1 1100,450" fill="none" stroke="#38bdf8" stroke-width="3" stroke-dasharray="4,4"/>
      <rect x="250" y="94" width="120" height="12" fill="#0284c7"/>
      <rect x="750" y="94" width="120" height="12" fill="#0284c7"/>
      <text x="260" y="270" font-size="28" fill="#94a3b8" font-family="sans-serif" font-weight="bold">ПОМЕЩЕНИЕ 101 (КОТЛОВАН-СЕКЦИЯ А)</text>
      <text x="650" y="270" font-size="28" fill="#94a3b8" font-family="sans-serif" font-weight="bold">ПОМЕЩЕНИЕ 102 (МАШЗАЛ)</text>
      <text x="260" y="560" font-size="28" fill="#94a3b8" font-family="sans-serif" font-weight="bold">ПОМЕЩЕНИЕ 103 (СЕРВЕРНАЯ)</text>
      <text x="650" y="560" font-size="28" fill="#94a3b8" font-family="sans-serif" font-weight="bold">ПОМЕЩЕНИЕ 104 (ТЕПЛОУЗЕЛ)</text>
    `;
  } else if (type === 'HVAC') {
    accentColor = '#06b6d4';
    linesContent = `
      <rect x="100" y="100" width="1000" height="600" fill="none" stroke="#334155" stroke-width="4"/>
      <line x1="500" y1="100" x2="500" y2="700" stroke="#334155" stroke-width="2"/>
      <line x1="100" y1="400" x2="1100" y2="400" stroke="#334155" stroke-width="2"/>
      <!-- Air Ducts -->
      <rect x="180" y="220" width="80" height="60" fill="#0891b2" opacity="0.3"/>
      <path d="M 220,100 L 220,250 L 450,250 L 450,450 L 800,450" fill="none" stroke="#06b6d4" stroke-width="12" stroke-linecap="round"/>
      <path d="M 750,150 L 750,300 L 950,300" fill="none" stroke="#38bdf8" stroke-width="10" stroke-linecap="round" stroke-dasharray="10,5"/>
      <circle cx="220" cy="250" r="16" fill="#22d3ee"/>
      <circle cx="450" cy="250" r="16" fill="#22d3ee"/>
      <circle cx="800" cy="450" r="22" fill="#06b6d4"/>
      <text x="240" y="240" font-size="18" fill="#22d3ee" font-family="sans-serif">Вентканал В1 (Ø250)</text>
      <text x="820" y="445" font-size="18" fill="#06b6d4" font-family="sans-serif">Приточная установка ПУ-1</text>
    `;
  } else if (type === 'ELEC') {
    accentColor = '#f59e0b';
    linesContent = `
      <rect x="100" y="100" width="1000" height="600" fill="none" stroke="#334155" stroke-width="4"/>
      <line x1="500" y1="100" x2="500" y2="700" stroke="#334155" stroke-width="2"/>
      <line x1="100" y1="400" x2="1100" y2="400" stroke="#334155" stroke-width="2"/>
      <!-- Electrical Trays and Panels -->
      <rect x="120" y="420" width="40" height="70" fill="#f59e0b" stroke="#fbbf24" stroke-width="3"/>
      <text x="170" y="455" font-size="16" fill="#fbbf24" font-family="sans-serif">ЩР-1 (ВРУ)</text>
      <path d="M 140,420 L 140,280 L 350,280 L 350,200 L 850,200 L 850,550" fill="none" stroke="#eab308" stroke-width="6" stroke-dasharray="8,6"/>
      <circle cx="350" cy="280" r="12" fill="#fde047"/>
      <circle cx="850" cy="200" r="12" fill="#fde047"/>
      <circle cx="850" cy="550" r="16" fill="#eab308"/>
      <text x="870" y="555" font-size="16" fill="#fde047" font-family="sans-serif">ЩО-2 (Освещение)</text>
    `;
  } else {
    accentColor = '#10b981';
    linesContent = `
      <rect x="100" y="100" width="1000" height="600" fill="none" stroke="#334155" stroke-width="4"/>
      <line x1="500" y1="100" x2="500" y2="700" stroke="#334155" stroke-width="2"/>
      <line x1="100" y1="400" x2="1100" y2="400" stroke="#334155" stroke-width="2"/>
      <!-- Water and Heating Pipes -->
      <path d="M 100,500 L 400,500 L 400,200 L 980,200" fill="none" stroke="#3b82f6" stroke-width="8"/>
      <path d="M 100,520 L 420,520 L 420,220 L 980,220" fill="none" stroke="#ef4444" stroke-width="8"/>
      <circle cx="400" cy="500" r="10" fill="#60a5fa"/>
      <circle cx="420" cy="520" r="10" fill="#f87171"/>
      <text x="440" y="210" font-size="16" fill="#60a5fa" font-family="sans-serif">В1 ХВС Ø50</text>
      <text x="440" y="235" font-size="16" fill="#f87171" font-family="sans-serif">Т3 ГВС Ø40</text>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="${width}" height="${height}" fill="#0f172a"/>
    <rect width="${width}" height="${height}" fill="url(#grid)" />
    <!-- Outer Blueprint Border -->
    <rect x="20" y="20" width="${width - 40}" height="${height - 40}" fill="none" stroke="#334155" stroke-width="2"/>
    <!-- Stamp -->
    <rect x="${width - 320}" y="${height - 110}" width="300" height="90" fill="#1e293b" stroke="#475569" stroke-width="2"/>
    <text x="${width - 305}" y="${height - 75}" font-size="18" fill="#f8fafc" font-family="sans-serif" font-weight="bold">${title}</text>
    <text x="${width - 305}" y="${height - 45}" font-size="13" fill="#94a3b8" font-family="sans-serif">ОБЪЕКТ: «КОТЛОВАН-ИНЖЕНЕРИЯ»</text>
    <text x="${width - 305}" y="${height - 25}" font-size="11" fill="#64748b" font-family="sans-serif">М 1:100 • ЛИСТ Р-1</text>
    <!-- Architectural / Engineering Geometry -->
    ${linesContent}
    <!-- Center reference anchor symbol -->
    <circle cx="500" cy="400" r="6" fill="${accentColor}" />
    <circle cx="500" cy="400" r="18" fill="none" stroke="${accentColor}" stroke-width="1.5" stroke-dasharray="3,3"/>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const createSampleDemoArray = (): BlueprintArray => {
  const archImg = generateDemoBlueprint('ARCH', 'АРХИТЕКТУРА (АР)');
  const hvacImg = generateDemoBlueprint('HVAC', 'ВЕНТИЛЯЦИЯ И ОВ');
  const elecImg = generateDemoBlueprint('ELEC', 'ЭЛЕКТРОСЕТИ (ЭОМ)');
  const plumbImg = generateDemoBlueprint('PLUMB', 'ВОДОСНАБЖЕНИЕ (ВК)');

  return {
    id: 'demo-array-01',
    name: 'Строительный комплекс «Котлован»',
    rows: 2,
    cols: 2,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    cells: {
      '0_0': {
        row: 0,
        col: 0,
        title: '01. Архитектурный план (АР)',
        imageFileName: 'arch_plan.svg',
        imageDataUrl: archImg,
        imageWidth: 1200,
        imageHeight: 800,
        customPosition: false,
        commonPoint: { x: 500, y: 400 },
        comments: [
          {
            id: 'c1',
            x: 500,
            y: 400,
            radius: 40,
            title: 'Базовая ось 1-А',
            text: 'Опорное пересечение перегородок секций для увязки со всеми инженерами.',
            createdAt: Date.now(),
          },
          {
            id: 'c2',
            x: 260,
            y: 270,
            radius: 35,
            title: 'Помещение 101',
            text: 'Проверить высоту подшивного потолка с учетом монтажа вентиляции.',
            createdAt: Date.now(),
          },
        ],
      },
      '0_1': {
        row: 0,
        col: 1,
        title: '02. Вентиляция и отопление (ОВиК)',
        imageFileName: 'hvac_plan.svg',
        imageDataUrl: hvacImg,
        imageWidth: 1200,
        imageHeight: 800,
        customPosition: false,
        commonPoint: { x: 500, y: 400 },
        comments: [
          {
            id: 'c3',
            x: 450,
            y: 250,
            radius: 30,
            title: 'Пересечение В1',
            text: 'Требуется огнезащитная гильза при проходе через капитальную стену.',
            createdAt: Date.now(),
          },
        ],
      },
      '1_0': {
        row: 1,
        col: 0,
        title: '03. Электрооборудование (ЭОМ)',
        imageFileName: 'elec_plan.svg',
        imageDataUrl: elecImg,
        imageWidth: 1200,
        imageHeight: 800,
        customPosition: false,
        commonPoint: { x: 500, y: 400 },
        comments: [
          {
            id: 'c4',
            x: 140,
            y: 450,
            radius: 35,
            title: 'ВРУ Здание',
            text: 'Проложить защитный кабель-канал 100х50 к щитовой.',
            createdAt: Date.now(),
          },
        ],
      },
      '1_1': {
        row: 1,
        col: 1,
        title: '04. Водопровод и канализация (ВК)',
        imageFileName: 'plumb_plan.svg',
        imageDataUrl: plumbImg,
        imageWidth: 1200,
        imageHeight: 800,
        customPosition: false,
        commonPoint: { x: 500, y: 400 },
        comments: [],
      },
    },
    lastViewedCell: { row: 0, col: 0 },
  };
};
