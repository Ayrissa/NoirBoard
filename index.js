// NoirBoard — Стол детектива и Стена улик для SillyTavern.
// Styles are loaded by SillyTavern from style.css via manifest.json.





/* ═══ src/storage.js ═══ */
const MODULE_NAME = 'noirboard_detective';

const MODES = {
    standard: {
        id: 'standard',
        label: 'Стандарт (Классический стол)',
        shortLabel: 'Классика / Нуар',
        icon: 'fa-solid fa-briefcase',
        description: 'Деревянный стол детектива, бумажные папки, газетные вырезки, отпечатки, письма на печатной машинке и пробковая доска с красными нитями.',
    },
    modern: {
        id: 'modern',
        label: 'Современный (Кибер / OSINT-терминал)',
        shortLabel: 'Современный ПК',
        icon: 'fa-solid fa-laptop-code',
        description: 'Электронная база данных, цифровые досье, отчёты криминалистов, переписки, камеры наблюдения и встроенный интернет-поиск по миру РП.',
    },
    supernatural: {
        id: 'supernatural',
        label: 'Сверхъестественное / Мистика',
        shortLabel: 'Мистика / Оккультизм',
        icon: 'fa-solid fa-eye',
        description: 'Классический стол исследователя паранормального: помимо обычных улик генерируются дневники охотника, бестиарии, проклятые артефакты, руны и аномалии.',
    },
};

const ITEM_TYPES = {
    dossier: {
        id: 'dossier',
        label: 'Личное дело / Досье',
        icon: 'fa-solid fa-id-card',
        badge: 'ДОСЬЕ',
        defaultPinned: true,
    },
    newspaper: {
        id: 'newspaper',
        label: 'Газета / Вырезка',
        icon: 'fa-regular fa-newspaper',
        badge: 'ПРЕССА',
        defaultPinned: false,
    },
    fingerprints: {
        id: 'fingerprints',
        label: 'Отпечатки (пальцы / ладони / следы)',
        icon: 'fa-solid fa-fingerprint',
        badge: 'ДАКТИЛОСКОПИЯ',
        defaultPinned: false,
    },
    evidence_bag: {
        id: 'evidence_bag',
        label: 'Зип-пакет с уликой',
        icon: 'fa-solid fa-bag-shopping',
        badge: 'ВЕЩДОК',
        defaultPinned: true,
    },
    photo: {
        id: 'photo',
        label: 'Фотография / Снимок с места',
        icon: 'fa-solid fa-camera-retro',
        badge: 'ФОТОСНИМОК',
        defaultPinned: true,
    },
    map: {
        id: 'map',
        label: 'Карта / Схема преступления',
        icon: 'fa-solid fa-map-location-dot',
        badge: 'КАРТА',
        defaultPinned: true,
    },
    letter: {
        id: 'letter',
        label: 'Письмо / Записка',
        icon: 'fa-solid fa-envelope-open-text',
        badge: 'ПИСЬМО',
        defaultPinned: false,
    },
    diary: {
        id: 'diary',
        label: 'Дневник / Журнал',
        icon: 'fa-solid fa-book-journal-whills',
        badge: 'ДНЕВНИК',
        defaultPinned: false,
    },
    report: {
        id: 'report',
        label: 'Отчёт / Экспертиза',
        icon: 'fa-solid fa-file-medical',
        badge: 'ОТЧЁТ',
        defaultPinned: false,
    },
    occult: {
        id: 'occult',
        label: 'Мистический материал / Артефакт',
        icon: 'fa-solid fa-skull-crossbones',
        badge: 'ОККУЛЬТИЗМ',
        defaultPinned: true,
    },
};

const THREAD_COLORS = [
    { id: 'red', label: 'Прямая улика / Подозреваемый', hex: '#c92a2a' },
    { id: 'yellow', label: 'Гипотеза / Вопрос', hex: '#e6b800' },
    { id: 'blue', label: 'Алиби / Хронология', hex: '#2b6cb0' },
    { id: 'green', label: 'Мотив / Финансы / Связь', hex: '#2f855a' },
    { id: 'purple', label: 'Аномалия / Мистика / Тайна', hex: '#805ad5' },
];

const DEFAULT_ENABLED_TYPES = {
    dossier: true,
    newspaper: true,
    fingerprints: true,
    evidence_bag: true,
    photo: true,
    map: true,
    letter: true,
    diary: true,
    report: true,
    occult: true,
};


function createDefaultSettings() {
    return {
        version: 1,
        mode: 'standard',
        textProfileId: '',
        imageProfileId: '',
        imageSource: 'generated',
        autoGenerateImages: false,
        contextMessagesLimit: 25,
        itemsPerScan: 4,
        maxResponseTokens: 2800,
        temperature: 0.75,
        language: 'ru',
        includeCharDescription: true,
        includeWorldInfo: true,
        avoidDuplicates: true,
        autoPinImportant: true,
        dossierStyle: 'auto',
        customPromptInstructions: '',
        enabledTypes: { ...DEFAULT_ENABLED_TYPES },
        cases: {},
    };
}

function uid(prefix = 'nb') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeSettings(raw) {
    const defaults = createDefaultSettings();
    if (!raw || typeof raw !== 'object') return defaults;

    const out = {
        ...defaults,
        ...raw,
    };

    if (!MODES[out.mode]) out.mode = 'standard';
    out.textProfileId = typeof out.textProfileId === 'string' ? out.textProfileId : '';
    out.imageProfileId = typeof out.imageProfileId === 'string' ? out.imageProfileId : '';
    out.imageSource = ['generated', 'internet', 'both'].includes(out.imageSource) ? out.imageSource : 'generated';
    out.autoGenerateImages = Boolean(out.autoGenerateImages);
    out.contextMessagesLimit = clampInt(out.contextMessagesLimit, 3, 150, 25);
    out.itemsPerScan = clampInt(out.itemsPerScan, 1, 10, 4);
    out.maxResponseTokens = clampInt(out.maxResponseTokens, 512, 8192, 2800);
    out.temperature = clampFloat(out.temperature, 0.1, 2.0, 0.75);
    out.language = ['ru', 'en', 'auto'].includes(out.language) ? out.language : 'ru';
    out.includeCharDescription = out.includeCharDescription !== false;
    out.includeWorldInfo = out.includeWorldInfo !== false;
    out.avoidDuplicates = out.avoidDuplicates !== false;
    out.autoPinImportant = out.autoPinImportant !== false;
    out.dossierStyle = ['auto', 'folder', 'classified'].includes(out.dossierStyle) ? out.dossierStyle : 'auto';
    out.customPromptInstructions = typeof out.customPromptInstructions === 'string' ? out.customPromptInstructions : '';

    out.enabledTypes = { ...DEFAULT_ENABLED_TYPES };
    if (raw.enabledTypes && typeof raw.enabledTypes === 'object') {
        for (const key of Object.keys(DEFAULT_ENABLED_TYPES)) {
            if (raw.enabledTypes[key] !== undefined) {
                out.enabledTypes[key] = Boolean(raw.enabledTypes[key]);
            }
        }
    }

    if (!out.cases || typeof out.cases !== 'object' || Array.isArray(out.cases)) {
        out.cases = {};
    }

    return out;
}

function generateCaseNumber() {
    const num = Math.floor(100 + Math.random() * 900);
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const letter = letters[Math.floor(Math.random() * letters.length)];
    return `№ 0${num}-${letter}`;
}

function createEmptyCase(title = 'Дело № 0426-K') {
    return {
        id: uid('case'),
        title,
        caseNumber: generateCaseNumber(),
        status: 'ОТКРЫТО',
        summary: '',
        deduction: '',
        items: [],
        nodes: [],
        connections: [],
        searchHistory: [],
        updatedAt: Date.now(),
    };
}

function normalizeCase(rawCase, fallbackTitle = 'Текущее расследование') {
    const base = createEmptyCase(fallbackTitle);
    if (!rawCase || typeof rawCase !== 'object') return base;

    base.id = typeof rawCase.id === 'string' && rawCase.id ? rawCase.id : base.id;
    base.title = typeof rawCase.title === 'string' && rawCase.title.trim() ? rawCase.title.trim() : fallbackTitle;
    base.caseNumber = typeof rawCase.caseNumber === 'string' && rawCase.caseNumber.trim() ? rawCase.caseNumber.trim() : base.caseNumber;
    base.status = typeof rawCase.status === 'string' && rawCase.status.trim() ? rawCase.status.trim() : 'ОТКРЫТО';
    base.summary = typeof rawCase.summary === 'string' ? rawCase.summary : '';
    base.deduction = typeof rawCase.deduction === 'string' ? rawCase.deduction : '';
    base.updatedAt = Number(rawCase.updatedAt) || Date.now();

    base.items = Array.isArray(rawCase.items) ? rawCase.items.map((item, idx) => normalizeItem(item, idx)) : [];
    base.nodes = Array.isArray(rawCase.nodes) ? rawCase.nodes.map((node, idx) => normalizeNode(node, idx)) : [];

    const validNodeIds = new Set(base.nodes.map(n => n.id));
    base.connections = Array.isArray(rawCase.connections)
        ? rawCase.connections
            .filter(c => c && validNodeIds.has(c.fromNodeId) && validNodeIds.has(c.toNodeId) && c.fromNodeId !== c.toNodeId)
            .map(c => ({
                id: typeof c.id === 'string' && c.id ? c.id : uid('conn'),
                fromNodeId: c.fromNodeId,
                toNodeId: c.toNodeId,
                color: THREAD_COLORS.some(tc => tc.id === c.color) ? c.color : 'red',
                label: typeof c.label === 'string' ? c.label.slice(0, 120) : '',
            }))
        : [];

    base.searchHistory = Array.isArray(rawCase.searchHistory) ? rawCase.searchHistory.slice(0, 30) : [];
    return base;
}


function normalizeItem(raw = {}, index = 0) {
    const type = ITEM_TYPES[raw.type] ? raw.type : 'dossier';
    const id = typeof raw.id === 'string' && raw.id ? raw.id : uid('item');
    const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : `${ITEM_TYPES[type].label} #${index + 1}`;
    const subtitle = typeof raw.subtitle === 'string' ? raw.subtitle.trim() : '';
    const date = typeof raw.date === 'string' ? raw.date.trim() : '';
    const code = typeof raw.code === 'string' && raw.code.trim()
        ? raw.code.trim()
        : `#${(index + 10).toString(16).toUpperCase()}A`;
    const content = typeof raw.content === 'string' ? raw.content : '';
    const summary = typeof raw.summary === 'string' && raw.summary.trim()
        ? raw.summary.trim()
        : content.slice(0, 160);
    const notes = typeof raw.notes === 'string' ? raw.notes : '';
    const imageUrl = typeof raw.imageUrl === 'string' ? raw.imageUrl : '';
    const imagePrompt = typeof raw.imagePrompt === 'string' ? raw.imagePrompt : '';
    const clues = Array.isArray(raw.clues)
        ? raw.clues.map(c => String(c || '').trim()).filter(Boolean)
        : [];
    const metadata = raw.metadata && typeof raw.metadata === 'object' && !Array.isArray(raw.metadata)
        ? { ...raw.metadata }
        : {};

    return {
        id,
        type,
        title,
        subtitle,
        date,
        code,
        summary,
        content,
        notes,
        imageUrl,
        imagePrompt,
        imageSearchQuery: typeof raw.imageSearchQuery === 'string' ? raw.imageSearchQuery.slice(0, 180) : '',
        images: Array.isArray(raw.images) ? raw.images.filter(img => img && safeImageUrl(img.url)).slice(0, 12).map(img => ({
            url: safeImageUrl(img.url), source: img.source === 'commons' ? 'commons' : 'generated',
            title: String(img.title || '').slice(0, 300), author: String(img.author || '').slice(0, 500),
            license: String(img.license || '').slice(0, 100), pageUrl: safeWebUrl(img.pageUrl), licenseUrl: safeWebUrl(img.licenseUrl),
        })) : [],
        clues,
        metadata,
        createdAt: Number(raw.createdAt) || Date.now(),
        rotation: typeof raw.rotation === 'number' ? raw.rotation : ((index % 5) - 2) * 1.4,
    };
}

function normalizeNode(raw = {}, index = 0) {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const defaultX = 90 + col * 240 + ((index % 2) * 20);
    const defaultY = 80 + row * 210 + ((index % 3) * 15);

    return {
        id: typeof raw.id === 'string' && raw.id ? raw.id : uid('node'),
        itemId: typeof raw.itemId === 'string' ? raw.itemId : '',
        type: ITEM_TYPES[raw.type] ? raw.type : 'photo',
        title: typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : `Зацепка #${index + 1}`,
        subtitle: typeof raw.subtitle === 'string' ? raw.subtitle.trim() : '',
        snippet: typeof raw.snippet === 'string' ? raw.snippet.trim() : '',
        tag: typeof raw.tag === 'string' && raw.tag.trim() ? raw.tag.trim() : `Evidence #${index + 11}A`,
        imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : '',
        x: Number.isFinite(Number(raw.x)) ? Math.max(20, Math.min(2200, Math.round(Number(raw.x)))) : defaultX,
        y: Number.isFinite(Number(raw.y)) ? Math.max(20, Math.min(1500, Math.round(Number(raw.y)))) : defaultY,
        note: typeof raw.note === 'string' ? raw.note : '',
        isSubClue: Boolean(raw.isSubClue),
    };
}


function pinItemToCaseWall(caseData, item, customClueText = '') {
    if (!caseData || !item) return null;

    if (!customClueText) {
        const existing = caseData.nodes.find(n => n.itemId === item.id && !n.isSubClue);
        if (existing) return existing;
    }

    const index = caseData.nodes.length;
    const node = normalizeNode({
        id: uid('node'),
        itemId: item.id,
        type: item.type,
        title: customClueText ? `${item.title}: Деталь` : item.title,
        subtitle: item.subtitle || item.date || ITEM_TYPES[item.type]?.badge || '',
        snippet: customClueText || item.summary || item.clues?.[0] || item.content?.slice(0, 120) || '',
        tag: item.code || `Evidence #${index + 12}A`,
        imageUrl: item.imageUrl || '',
        isSubClue: Boolean(customClueText),
    }, index);

    caseData.nodes.push(node);
    caseData.updatedAt = Date.now();
    return node;
}

function createStorageManager(getContextFn) {
    const normalizedCases = new WeakSet();
    function getContext() {
        return typeof getContextFn === 'function' ? getContextFn() : globalThis.SillyTavern?.getContext?.() || {};
    }

    function getSettings() {
        const ctx = getContext();
        const ext = ctx.extensionSettings || (ctx.extensionSettings = {});
        ext[MODULE_NAME] = normalizeSettings(ext[MODULE_NAME]);
        return ext[MODULE_NAME];
    }

    function saveSettings() {
        const ctx = getContext();
        if (typeof ctx.saveSettingsDebounced === 'function') {
            ctx.saveSettingsDebounced();
        }
    }

    function getCurrentChatKey() {
        const ctx = getContext();
        const chatId = ctx.chatId || ctx.getCurrentChatId?.() || 'default_chat';
        const botKey = ctx.groupId
            ? `group_${ctx.groupId}`
            : (ctx.characters?.[ctx.characterId]?.avatar || `char_${ctx.characterId ?? 'none'}`);
        return `${botKey}::${chatId}`;
    }

    function getCurrentCharacterName() {
        const ctx = getContext();
        if (ctx.groupId) {
            const grp = (ctx.groups || []).find(g => String(g.id) === String(ctx.groupId));
            return grp?.name || 'Групповое расследование';
        }
        return ctx.name2 || ctx.characters?.[ctx.characterId]?.name || 'Неизвестное дело';
    }

    function getCurrentCase() {
        const settings = getSettings();
        const key = getCurrentChatKey();
        const charName = getCurrentCharacterName();
        if (!settings.cases[key] || !normalizedCases.has(settings.cases[key])) {
            settings.cases[key] = normalizeCase(settings.cases[key], `Дело: ${charName}`);
            normalizedCases.add(settings.cases[key]);
        }
        return settings.cases[key];
    }

    function saveCurrentCase(caseData, key = getCurrentChatKey()) {
        const settings = getSettings();
        settings.cases[key] = normalizeCase(caseData, `Дело: ${getCurrentCharacterName()}`);
        normalizedCases.add(settings.cases[key]);
        settings.cases[key].updatedAt = Date.now();
        saveSettings();
        return settings.cases[key];
    }

    return {
        getContext,
        getSettings,
        saveSettings,
        getCurrentChatKey,
        getCurrentCharacterName,
        getCurrentCase,
        saveCurrentCase,
    };
}

function clampInt(val, min, max, fallback) {
    const num = Number.parseInt(val, 10);
    if (!Number.isFinite(num)) return fallback;
    return Math.max(min, Math.min(max, num));
}

function clampFloat(val, min, max, fallback) {
    const num = Number.parseFloat(val);
    if (!Number.isFinite(num)) return fallback;
    return Math.max(min, Math.min(max, num));
}

/* ═══ src/templates.js ═══ */
function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatParagraphs(text) {
    const clean = String(text || '').trim();
    if (!clean) return '<p class="nb-empty-text">Нет текстовых данных.</p>';
    return clean
        .split(/\n{2,}/)
        .map(p => `<p>${escapeHtml(p.trim()).replace(/\n/g, '<br>')}</p>`)
        .join('');
}

function renderFingerprintSvg(pattern = 'whorl', seedStr = 'nb', variant = 0) {
    const hash = Array.from(String(seedStr)).reduce((acc, ch) => ((acc << 5) - acc) + ch.charCodeAt(0), 0);
    const abs = Math.abs(hash + variant * 37);
    const p = String(pattern || '').toLowerCase();

    if (p === 'palm') {
        return `<svg viewBox="0 0 220 260" class="nb-fp-svg nb-fp-palm" aria-label="Palm Print">
            <rect width="220" height="260" fill="#efe6d5" rx="4"/>
            <g stroke="#221f1d" fill="none" stroke-linecap="round" opacity="0.86">
                <ellipse cx="48" cy="68" rx="13" ry="28" fill="#221f1d" opacity="0.82"/>
                <ellipse cx="82" cy="46" rx="14" ry="34" fill="#221f1d" opacity="0.85"/>
                <ellipse cx="118" cy="40" rx="14" ry="36" fill="#221f1d" opacity="0.88"/>
                <ellipse cx="154" cy="52" rx="13" ry="32" fill="#221f1d" opacity="0.84"/>
                <ellipse cx="188" cy="115" rx="14" ry="26" transform="rotate(24 188 115)" fill="#221f1d" opacity="0.82"/>
                <path d="M42 125 Q110 95 168 128 Q175 188 145 232 Q95 245 52 222 Q32 175 42 125 Z" fill="#262320" opacity="0.88"/>
                <path d="M40 155 Q105 140 165 172" stroke="#efe6d5" stroke-width="3.2"/>
                <path d="M52 135 Q115 162 145 228" stroke="#efe6d5" stroke-width="2.8"/>
                <path d="M68 228 Q102 175 158 140" stroke="#efe6d5" stroke-width="2.2"/>
                <circle cx="96" cy="158" r="7" stroke="#b91c1c" stroke-width="1.8" fill="none"/>
                <circle cx="134" cy="176" r="7" stroke="#b91c1c" stroke-width="1.8" fill="none"/>
            </g>
            <g opacity="0.65" color="#efe6d5">${[48, 82, 118, 154].map((x, i) => `<svg x="${x - 13}" y="${i === 0 ? 40 : 16}" width="26" height="60" viewBox="0 0 180 220">${renderFingerprintSvg(i % 2 ? 'loop' : 'whorl', seedStr, i + 10).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</svg>`).join('')}</g>
        </svg>`;
    }

    if (p === 'footprint') {
        return `<svg viewBox="0 0 220 260" class="nb-fp-svg nb-fp-shoe" aria-label="Shoe Print">
            <rect width="220" height="260" fill="#e8dfd1" rx="4"/>
            <g fill="#2b2623" opacity="0.82">
                <path d="M75 30 C105 15, 145 25, 150 75 C153 110, 142 135, 138 152 L82 152 C76 132, 62 105, 65 68 C67 45, 70 35, 75 30 Z"/>
                <path d="M84 168 L136 168 L140 222 C138 242, 82 242, 80 222 Z"/>
            </g>
            <g stroke="#e8dfd1" stroke-width="2.5">
                ${Array.from({ length: 7 }, (_, i) => `<line x1="65" y1="${52 + i * 14}" x2="152" y2="${52 + i * 14}"/>`).join('')}
                ${Array.from({ length: 4 }, (_, i) => `<line x1="78" y1="${180 + i * 12}" x2="142" y2="${180 + i * 12}"/>`).join('')}
            </g>
            <circle cx="112" cy="94" r="10" stroke="#b91c1c" stroke-width="2" fill="none"/>
        </svg>`;
    }

    const ridgePaths = [];
    // Continuous asymmetric papillary ridges with distinct arch/loop/whorl patterns.
    for (let ridge = 0; ridge < 30; ridge++) {
        const points = [];
        for (let step = 0; step <= 100; step++) {
            const t = step / 100;
            let x, y;
            if (p === 'arch') {
                x = 14 + 152 * t;
                y = 205 - ridge * 5.6 - (22 + ridge * 0.6) * Math.sin(Math.PI * t);
            } else if (p === 'loop') {
                const angle = Math.PI + t * Math.PI;
                const radius = 5 + ridge * 2.45;
                x = 86 + radius * Math.cos(angle) * 0.85 + 12 * Math.sin(angle);
                y = 154 + ridge * 0.9 + radius * Math.sin(angle) * 1.65;
            } else {
                const angle = t * Math.PI * 2;
                const radius = 5 + ridge * 2.45;
                x = 90 + radius * Math.cos(angle) * (0.83 + 0.08 * Math.sin(angle * 3)) + 6 * Math.sin(angle * 2);
                y = 100 + radius * Math.sin(angle) * 1.27;
            }
            x += Math.sin(step * 0.37 + ridge + abs % 97) * 0.45;
            y += Math.cos(step * 0.29 + ridge) * 0.35;
            points.push(`${step ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`);
        }
        ridgePaths.push(`<path d="${points.join(' ')}" stroke-width="${(1.1 + (ridge % 4) * 0.12).toFixed(2)}" opacity="${0.65 + (ridge % 5) * 0.06}" ${ridge % 8 === 0 ? 'stroke-dasharray="48 2 72 1"' : ''}/>`);
    }
    return `<svg viewBox="0 0 180 220" class="nb-fp-svg" aria-label="Художественный отпечаток: ${escapeHtml(p)}"><g fill="none" stroke="currentColor" stroke-linecap="round">${ridgePaths.join('')}</g><path d="M16 205h148" stroke="currentColor" opacity=".3"/><text x="18" y="216" font-size="6" fill="currentColor">SPECIMEN • ${abs.toString(16).toUpperCase()}</text></svg>`;

}


function renderCrimeMapSvg(item) {
    const meta = item.metadata || {};
    const locs = Array.isArray(meta.locations) && meta.locations.length
        ? meta.locations.slice(0, 4)
        : [item.title || 'Место происшествия', 'Маршрут отхода', 'Точка наблюдения'];

    return `<svg viewBox="0 0 600 340" class="nb-map-svg" aria-label="Crime Map">
        <rect width="600" height="340" fill="#dfd5be"/>
        <g stroke="#c6b99c" stroke-width="0.8">
            ${Array.from({ length: 12 }, (_, i) => `<line x1="${i * 50}" y1="0" x2="${i * 50}" y2="340"/>`).join('')}
            ${Array.from({ length: 7 }, (_, i) => `<line x1="0" y1="${i * 50}" x2="600" y2="${i * 50}"/>`).join('')}
        </g>
        <path d="M390 120 Q450 95 510 130 Q555 175 520 235 Q460 270 400 230 Q365 180 390 120 Z" fill="#a8c3bc" stroke="#6c8c84" stroke-width="2"/>
        <text x="420" y="185" fill="#2d4a43" font-family="monospace" font-size="10">${escapeHtml(String(meta.waterName || 'Водоём').slice(0, 18))}</text>
        <path d="M30 40 Q140 20 210 90 Q180 180 70 160 Z" fill="#c7cfa8" opacity="0.65" stroke="#8a9468" stroke-dasharray="4 3"/>
        <path d="M0 240 Q180 210 310 165 T600 85" stroke="#5c5346" stroke-width="5" fill="none"/>
        <path d="M0 240 Q180 210 310 165 T600 85" stroke="#efe6d5" stroke-width="1.4" stroke-dasharray="10 8" fill="none"/>
        <path d="M190 0 L245 340" stroke="#7a6f5d" stroke-width="3.5" fill="none"/>
        <g fill="none" stroke="#968b6b" stroke-width="0.65" opacity="0.6">
            ${Array.from({ length: 16 }, (_, i) => `<path d="M${12 + i * 7} 15 C${60 + i * 12} 45, ${210 + i * 5} 10, ${220 + i * 6} 85 S${110 + i * 10} 170, ${35 + i * 5} 180"/>`).join('')}
        </g>
        <g fill="#b2a68d" stroke="#756b59" stroke-width="0.6">
            ${Array.from({ length: 35 }, (_, i) => { const x = 250 + (i % 7) * 18; const y = 226 + Math.floor(i / 7) * 15; return `<rect x="${x}" y="${y}" width="${8 + i % 4}" height="${6 + i % 5}" transform="rotate(-8 ${x} ${y})"/>`; }).join('')}
        </g>
        <path d="M570 0 Q520 45 552 85 T560 165 Q545 230 592 300" fill="none" stroke="#729eaf" stroke-width="7"/>
        <g fill="none" stroke="#f8f0d9" stroke-width="3"><path d="M240 216L388 205M243 244L394 232M245 274L402 260M269 205L280 312M320 200L333 318M365 196L380 316"/></g>
        <g fill="#5f714c" opacity="0.65">${Array.from({ length: 28 }, (_, i) => `<path d="M${28 + i % 7 * 23} ${45 + Math.floor(i / 7) * 22}l-4 9h8z"/>`).join('')}</g>
        <g stroke="#39382b" fill="none"><path d="M555 32v43m-9-30 9-13 9 13M28 315h100m-100-4v8m50-8v8m50-8v8"/></g>
        <text x="550" y="25" font-size="12" fill="#39382b">N</text>
        <text x="28" y="307" font-size="8" fill="#39382b">0 — 500 m • SCHEMATIC</text>
        <circle cx="155" cy="195" r="28" stroke="#b91c1c" stroke-width="3" fill="rgba(185,28,28,0.08)"/>
        <circle cx="310" cy="160" r="24" stroke="#b91c1c" stroke-width="2.6" fill="rgba(185,28,28,0.08)"/>
        <circle cx="455" cy="175" r="32" stroke="#b91c1c" stroke-width="2.6" fill="none" stroke-dasharray="8 4"/>
        <path d="M183 190 Q245 160 286 162" stroke="#b91c1c" stroke-width="2.4" stroke-dasharray="5 4" fill="none"/>
        <g font-family="'Courier New', monospace" font-size="11" font-weight="bold" fill="#221d17">
            <rect x="75" y="232" width="165" height="22" fill="#f7f1e1" stroke="#5c5346"/>
            <text x="82" y="247">${escapeHtml(String(locs[0] || 'HIGHWAY 9').slice(0, 22))}</text>
            <rect x="235" y="112" width="165" height="22" fill="#f7f1e1" stroke="#5c5346"/>
            <text x="242" y="127">${escapeHtml(String(locs[1] || 'ROUTE 79').slice(0, 22))}</text>
        </g>
    </svg>`;
}

function renderDeskItemCard(item, isPinned = false) {
    const typeInfo = ITEM_TYPES[item.type] || ITEM_TYPES.dossier;
    const rot = Number(item.rotation) || 0;
    const meta = item.metadata || {};

    let visualPreview = '';
    if (item.type === 'fingerprints' && !item.imageUrl) {
        visualPreview = `<div class="nb-card-fp-preview">${renderFingerprintSvg(meta.fingerprintPattern || 'whorl', item.id, 0)}</div>`;
    } else if (item.type === 'map' && !item.imageUrl) {
        visualPreview = `<div class="nb-card-map-preview">${renderCrimeMapSvg(item)}</div>`;
    } else if (item.imageUrl) {
        visualPreview = `<div class="nb-card-photo-wrap"><img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" class="nb-card-photo-img"></div>`;
    } else if (item.type === 'evidence_bag') {
        visualPreview = `<div class="nb-card-bag-preview">
            <div class="nb-ziplock-line"></div>
            <div class="nb-evidence-yellow-tag">EVIDENCE ${escapeHtml(item.code)}</div>
            <i class="fa-solid fa-magnifying-glass-chart nb-bag-artifact-icon"></i>
        </div>`;
    }

    return `
    <article class="nb-desk-card nb-desk-card--${escapeHtml(item.type)}" data-item-id="${escapeHtml(item.id)}" style="--nb-card-rot: ${rot}deg;">
        <div class="nb-desk-card-top">
            <span class="nb-desk-badge"><i class="${typeInfo.icon}"></i> ${escapeHtml(typeInfo.badge)}</span>
            <span class="nb-desk-code">${escapeHtml(item.code)}</span>
        </div>
        ${visualPreview}
        <h4 class="nb-desk-card-title">${escapeHtml(item.title)}</h4>
        ${item.subtitle ? `<div class="nb-desk-card-subtitle">${escapeHtml(item.subtitle)}</div>` : ''}
        <p class="nb-desk-card-summary">${escapeHtml(item.summary || item.content.slice(0, 130))}</p>
        <div class="nb-desk-card-footer">
            <span class="nb-desk-date">${escapeHtml(item.date || 'Архив')}</span>
            <div class="nb-desk-card-actions">
                <button type="button" class="nb-btn-mini nb-act-inspect" data-item-id="${escapeHtml(item.id)}" title="Рассмотреть детальнее">
                    <i class="fa-solid fa-magnifying-glass"></i> Изучить
                </button>
                <button type="button" class="nb-btn-mini nb-act-pin ${isPinned ? 'is-pinned' : ''}" data-item-id="${escapeHtml(item.id)}" title="${isPinned ? 'Уже на стене улик' : 'Закрепить на стене улик'}">
                    <i class="fa-solid fa-thumbtack"></i>
                </button>
            </div>
        </div>
    </article>`;
}

function renderInspectorContent(item, settings = {}, magnifierActive = false) {
    const meta = item.metadata || {};
    const cluesHtml = Array.isArray(item.clues) && item.clues.length
        ? `<div class="nb-inspector-clues">
            <div class="nb-inspector-clues-title"><i class="fa-solid fa-thumbtack"></i> Выявленные зацепки (нажмите, чтобы вынести на Стену связей):</div>
            <div class="nb-inspector-clues-list">
                ${item.clues.map((clue, idx) => `
                    <button type="button" class="nb-clue-chip" data-item-id="${escapeHtml(item.id)}" data-clue-index="${idx}" title="Закрепить эту деталь на стене улик">
                        <i class="fa-solid fa-plus"></i> ${escapeHtml(clue)}
                    </button>
                `).join('')}
            </div>
        </div>`
        : '';

    const hiddenDetailHtml = magnifierActive && meta.hiddenDetail
        ? `<div class="nb-hidden-clue-spot" title="Скрытая деталь (наведите лупу)">
            <span class="nb-hidden-clue-label"><i class="fa-solid fa-magnifying-glass"></i> Замечено при детальном осмотре:</span>
            <span class="nb-hidden-clue-value">${escapeHtml(meta.hiddenDetail)}</span>
        </div>`
        : '';

    let bodyHtml = '';
    switch (item.type) {
        case 'dossier':
            bodyHtml = renderDossierView(item, settings);
            break;
        case 'newspaper':
            bodyHtml = renderNewspaperView(item);
            break;
        case 'fingerprints':
            bodyHtml = renderFingerprintsView(item);
            break;
        case 'evidence_bag':
            bodyHtml = renderEvidenceBagView(item);
            break;
        case 'photo':
            bodyHtml = renderPhotoView(item);
            break;
        case 'map':
            bodyHtml = renderMapView(item);
            break;
        case 'letter':
            bodyHtml = renderLetterView(item);
            break;
        case 'diary':
            bodyHtml = renderDiaryView(item);
            break;
        case 'occult':
            bodyHtml = renderOccultView(item);
            break;
        case 'report':
        default:
            bodyHtml = renderReportView(item);
            break;
    }

    return `
    <div class="nb-inspector-sheet-wrap" data-item-id="${escapeHtml(item.id)}">
        ${bodyHtml}
        ${renderImageGallery(item)}
        ${hiddenDetailHtml}
        ${cluesHtml}
    </div>`;
}


function renderDossierView(item, settings = {}) {
    const meta = item.metadata || {};
    const preferred = settings.dossierStyle && settings.dossierStyle !== 'auto'
        ? settings.dossierStyle
        : (meta.dossierType === 'classified' ? 'classified' : 'folder');

    const fullName = meta.fullName || item.title;
    const birthDate = meta.birthDate || item.date || 'Неизвестно';
    const birthPlace = meta.birthPlace || 'Архив не содержит сведений';
    const nationality = meta.nationality || '—';
    const heightWeight = meta.heightWeight || '—';
    const occupation = meta.occupation || item.subtitle || 'Фигурант расследования';
    const family = meta.family || 'Нет данных';
    const skills = meta.skills || item.summary || '';
    const stampText = meta.stamp || 'ARCHIVIO CRIMINALE • RISERVATO';
    const appearanceList = Array.isArray(meta.appearance) && meta.appearance.length
        ? meta.appearance
        : ['Характерные черты зафиксированы в материалах дела'];
    const characterList = Array.isArray(meta.character) && meta.character.length
        ? meta.character
        : ['Скрытный', 'Осторожный'];

    const portraitHtml = item.imageUrl
        ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(fullName)}" class="nb-dossier-photo-img">`
        : `<div class="nb-dossier-photo-placeholder">
            <i class="fa-solid fa-user-secret"></i>
            <span>ФОТО ФИГУРАНТА</span>
        </div>`;

    if (preferred === 'classified') {
        return renderClassifiedDossier(item, {
            fullName, birthDate, birthPlace, nationality, heightWeight, occupation, family, skills, stampText,
            appearanceList, characterList, portraitHtml,
        });
    }

    return `
    <div class="nb-doc-folder">
        <div class="nb-folder-top-row">
            <div class="nb-folder-photo-frame">
                <div class="nb-paperclip"></div>
                ${portraitHtml}
            </div>
            <div class="nb-folder-header-fields">
                <div class="nb-folder-title-line">
                    <h2>ЛИЧНОЕ ДЕЛО</h2>
                    <span class="nb-folder-num">${escapeHtml(item.code)}</span>
                </div>
                <div class="nb-folder-field"><span>Имя:</span> <strong>${escapeHtml(fullName)}</strong></div>
                <div class="nb-folder-bullet">• ${escapeHtml(occupation)}</div>
                <div class="nb-folder-field"><span>Дата рождения:</span> ${escapeHtml(birthDate)}</div>
                <div class="nb-folder-field"><span>Место рождения:</span> ${escapeHtml(birthPlace)}</div>
                <div class="nb-folder-field"><span>Национальность:</span> ${escapeHtml(nationality)}</div>
                <div class="nb-folder-round-stamp">${escapeHtml(stampText)}</div>
            </div>
        </div>
        <div class="nb-folder-two-cols">
            <div class="nb-folder-col">
                <h4>ВНЕШНОСТЬ:</h4>
                <ul>${appearanceList.map(a => `<li>${escapeHtml(a)}</li>`).join('')}</ul>
            </div>
            <div class="nb-folder-col">
                <h4>ХАРАКТЕР:</h4>
                <ul>${characterList.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>
            </div>
        </div>
        <div class="nb-folder-section">
            <h4>ДЕЯТЕЛЬНОСТЬ И СВЯЗИ:</h4>
            <p>• ${escapeHtml(occupation)} (${escapeHtml(family)})</p>
        </div>
        <div class="nb-folder-section nb-folder-history">
            <h4>ИСТОРИЯ / МАТЕРИАЛЫ ДЕЛА:</h4>
            ${formatParagraphs(item.content)}
        </div>
        <div class="nb-folder-stamp-red">CONFIDENTIAL</div>
    </div>`;
}

function renderClassifiedDossier(item, d) {
    return `
    <div class="nb-doc-classified">
        <div class="nb-classified-header">
            <h2>СЕКРЕТНОЕ ДОСЬЕ</h2>
            <div class="nb-classified-sub">Документ ограниченного доступа</div>
        </div>
        <div class="nb-classified-meta-bar">
            <span>Регистрационный номер: <strong>${escapeHtml(item.code)}</strong></span>
            <span>Статус: <strong>активно</strong></span>
            <span>Уровень доступа: <strong>особый</strong></span>
        </div>
        <div class="nb-classified-grid">
            <table class="nb-classified-table">
                <tr><td>Идентификатор:</td><td><strong>${escapeHtml(item.code)}</strong></td></tr>
                <tr><td>Имя:</td><td><strong>${escapeHtml(d.fullName)}</strong></td></tr>
                <tr><td>Дата рождения:</td><td>${escapeHtml(d.birthDate)}</td></tr>
                <tr><td>Место рождения:</td><td>${escapeHtml(d.birthPlace)}</td></tr>
                <tr><td>Гражданство:</td><td>${escapeHtml(d.nationality)}</td></tr>
                <tr><td>Параметры:</td><td>${escapeHtml(d.heightWeight)}</td></tr>
                <tr><td>Деятельность:</td><td>${escapeHtml(d.occupation)}</td></tr>
                <tr><td>Связи / Семья:</td><td>${escapeHtml(d.family)}</td></tr>
            </table>
            <div class="nb-classified-mugshots">
                <div class="nb-mugshot-box">${d.portraitHtml}<div class="nb-mugshot-caption">Анфас / Архив</div></div>
            </div>
        </div>
        <div class="nb-classified-blocks">
            <div class="nb-classified-block">
                <div class="nb-cblock-icon"><i class="fa-solid fa-fingerprint"></i></div>
                <div class="nb-cblock-body"><h4>1. ОСОБЫЕ ПРИМЕТЫ</h4><p>${d.appearanceList.map(x => escapeHtml(x)).join('; ')}</p></div>
            </div>
            <div class="nb-classified-block">
                <div class="nb-cblock-icon"><i class="fa-solid fa-brain"></i></div>
                <div class="nb-cblock-body"><h4>2. КРАТКАЯ ХАРАКТЕРИСТИКА</h4><p>${d.characterList.map(x => escapeHtml(x)).join(', ')}</p></div>
            </div>
            <div class="nb-classified-block">
                <div class="nb-cblock-icon"><i class="fa-solid fa-crosshairs"></i></div>
                <div class="nb-cblock-body"><h4>3. ПОДГОТОВКА И НАВЫКИ</h4><p>${escapeHtml(d.skills)}</p></div>
            </div>
            <div class="nb-classified-block">
                <div class="nb-cblock-icon"><i class="fa-solid fa-folder-open"></i></div>
                <div class="nb-cblock-body"><h4>4. АРХИВНАЯ СПРАВКА</h4>${formatParagraphs(item.content)}</div>
            </div>
        </div>
        <div class="nb-classified-footer">
            <span>Собственность архивного отдела</span>
            <div class="nb-round-seal">${escapeHtml(d.stampText)}</div>
        </div>
    </div>`;
}

function renderNewspaperView(item) {
    const meta = item.metadata || {};
    const paperName = meta.newspaperName || 'CRÓNICA POLICIAL & PERIODISMO';
    const headline = meta.headline || item.title;
    const subheadline = meta.subheadline || item.subtitle || 'Экстренный выпуск криминальной хроники';
    const author = meta.author || 'Специальный корреспондент';

    return `
    <div class="nb-doc-newspaper">
        <div class="nb-news-masthead">
            <span class="nb-news-edition">ВЫПУСК ${escapeHtml(item.code)}</span>
            <h2 class="nb-news-paper-title">${escapeHtml(paperName)}</h2>
            <span class="nb-news-date">${escapeHtml(item.date || 'Утренний тираж')}</span>
        </div>
        <div class="nb-news-strapline">ХРОНИКА ПРОИСШЕСТВИЙ • РАССЛЕДОВАНИЯ • СВИДЕТЕЛЬСТВА</div>
        <div class="nb-news-headline-box">
            <h3>${escapeHtml(headline)}</h3>
            <div class="nb-news-subhead">${escapeHtml(subheadline)}</div>
        </div>
        <div class="nb-news-columns">
            ${item.imageUrl ? `
            <figure class="nb-news-figure">
                <img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(headline)}">
                <figcaption>Архивный фотоснимок с места событий (${escapeHtml(item.code)})</figcaption>
            </figure>` : ''}
            <div class="nb-news-byline">Автор: ${escapeHtml(author)}</div>
            <div class="nb-news-article-body">${formatParagraphs(item.content)}</div>
        </div>
    </div>`;
}

function renderFingerprintsView(item) {
    const meta = item.metadata || {};
    const pattern = meta.fingerprintPattern || 'whorl';
    const matchPercent = meta.matchPercent || '92.4% (ЧАСТИЧНОЕ СОВПАДЕНИЕ)';
    const surface = meta.surfaceFound || item.subtitle || 'Изъято на месте происшествия';

    return `
    <div class="nb-doc-fingerprints">
        <div class="nb-fp-sheet-header">
            <div>
                <h2>FICHA DACTILOSCÓPICA / ДАКТИЛОСКОПИЧЕСКАЯ КАРТА</h2>
                <div class="nb-fp-sheet-sub">Beginnings & Enlargements of Forensic Prints — Карта ${escapeHtml(item.code)}</div>
            </div>
            <div class="nb-fp-match-badge">${escapeHtml(matchPercent)}</div>
        </div>
        ${item.imageUrl ? `<img src="${escapeHtml(safeImageUrl(item.imageUrl))}" alt="Иллюстрация отпечатка" class="nb-map-custom-img">` : ''}
        <div class="nb-fp-specimen-grid">
            <div class="nb-fp-fingers-col">
                <div class="nb-fp-mini-box">
                    <div class="nb-fp-mini-label">Образец R.1 (Большой)</div>
                    ${renderFingerprintSvg('whorl', item.id, 1)}
                </div>
                <div class="nb-fp-mini-box">
                    <div class="nb-fp-mini-label">Образец R.2 (Указательный)</div>
                    ${renderFingerprintSvg('loop', item.id, 2)}
                </div>
                <div class="nb-fp-mini-box">
                    <div class="nb-fp-mini-label">Образец R.3 (Средний)</div>
                    ${renderFingerprintSvg('arch', item.id, 3)}
                </div>
                <div class="nb-fp-mini-box">
                    <div class="nb-fp-mini-label">Увеличенный фрагмент</div>
                    ${renderFingerprintSvg(pattern, item.id, 4)}
                </div>
            </div>
            <div class="nb-fp-palm-col">
                <div class="nb-fp-palm-frame">
                    <div class="nb-fp-mini-label">Полный оттиск ладони / следа (${escapeHtml(item.date || 'Экспертиза')})</div>
                    ${renderFingerprintSvg(pattern === 'footprint' ? 'footprint' : 'palm', item.id, 5)}
                </div>
            </div>
        </div>
        <div class="nb-fp-lab-notes">
            <div><strong>Поверхность изъятия:</strong> ${escapeHtml(surface)}</div>
            <div class="nb-fp-lab-content">${formatParagraphs(item.content)}</div>
        </div>
    </div>`;
}

function renderEvidenceBagView(item) {
    return `
    <div class="nb-doc-bag">
        <div class="nb-bag-plastic-frame">
            <div class="nb-bag-red-seal"></div>
            <div class="nb-bag-header-warning">POLICE DEPARTMENT • EVIDENCE BAG • DO NOT TAMPER</div>
            <div class="nb-bag-inner-stage">
                <div class="nb-bag-tag-card">
                    <div class="nb-bag-tag-hole"></div>
                    <div class="nb-bag-tag-title">Evidence</div>
                    <div class="nb-bag-tag-code">${escapeHtml(item.code)}</div>
                    <div class="nb-bag-tag-date">${escapeHtml(item.date || 'Изъято')}</div>
                </div>
                <div class="nb-bag-specimen-view">
                    ${item.imageUrl
                        ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" class="nb-bag-img">`
                        : `<div class="nb-bag-placeholder-icon"><i class="fa-solid fa-gun"></i><span>ВЕЩЕСТВЕННАЯ УЛИКА</span></div>`}
                </div>
            </div>
        </div>
        <div class="nb-bag-report-box">
            <h3>ПРОТОКОЛ ОСМОТРА ВЕЩДОКА: ${escapeHtml(item.title)}</h3>
            <div class="nb-bag-subtitle">${escapeHtml(item.subtitle || 'Криминалистическая лаборатория')}</div>
            ${formatParagraphs(item.content)}
        </div>
    </div>`;
}

function renderPhotoView(item) {
    const meta = item.metadata || {};
    return `
    <div class="nb-doc-photo">
        <div class="nb-polaroid-large">
            <div class="nb-polaroid-pin"></div>
            <div class="nb-polaroid-img-area">
                ${item.imageUrl
                    ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}">`
                    : `<div class="nb-polaroid-empty">
                        <i class="fa-solid fa-camera-retro"></i>
                        <span>Снимок с места происшествия</span>
                        <small>${escapeHtml(meta.coordinates || item.date || item.code)}</small>
                    </div>`}
                <span class="nb-photo-timestamp">${escapeHtml(item.date || '1998/09/14')}</span>
            </div>
            <div class="nb-polaroid-caption">
                <strong>${escapeHtml(item.title)}</strong>
                <span>${escapeHtml(item.subtitle || item.code)}</span>
            </div>
        </div>
        <div class="nb-photo-backnotes">
            <h4><i class="fa-solid fa-pen-nib"></i> Заметки на обороте снимка:</h4>
            ${formatParagraphs(item.content)}
        </div>
    </div>`;
}


function renderMapView(item) {
    const meta = item.metadata || {};
    const coords = meta.coordinates || 'Координаты не установлены';
    const locations = Array.isArray(meta.locations) ? meta.locations : [];

    return `
    <div class="nb-doc-map">
        <div class="nb-map-header">
            <div>
                <h2>ТОПОГРАФИЧЕСКАЯ СХЕМА / КАРТА УЛИК</h2>
                <div class="nb-map-sub">${escapeHtml(item.title)} — ${escapeHtml(item.subtitle || 'Оперативный сектор')}</div>
            </div>
            <div class="nb-map-coord-sticker">
                <span>LOCATION:</span>
                <strong>${escapeHtml(coords)}</strong>
            </div>
        </div>
        <div class="nb-map-canvas-box">
            ${item.imageUrl
                ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.title)}" class="nb-map-custom-img">`
                : renderCrimeMapSvg(item)}
        </div>
        ${locations.length ? `
        <div class="nb-map-legend">
            <h4>Отмеченные точки на карте:</h4>
            <ul>${locations.map(l => `<li><i class="fa-solid fa-location-dot"></i> ${escapeHtml(l)}</li>`).join('')}</ul>
        </div>` : ''}
        <div class="nb-map-notes">${formatParagraphs(item.content)}</div>
    </div>`;
}

function renderLetterView(item) {
    const meta = item.metadata || {};
    const author = meta.author || 'Неизвестный отправитель';
    const recipient = meta.recipient || 'Детективу';

    return `
    <div class="nb-doc-letter">
        <div class="nb-letter-fold-h"></div>
        <div class="nb-letter-fold-v"></div>
        <div class="nb-letter-blood-drop"></div>
        <div class="nb-letter-meta">
            <span>Кому: ${escapeHtml(recipient)}</span>
            <span>Дата: ${escapeHtml(item.date || 'Без даты')}</span>
        </div>
        <h3 class="nb-letter-salutation">${escapeHtml(item.title)}</h3>
        <div class="nb-letter-typewriter">
            ${formatParagraphs(item.content)}
        </div>
        <div class="nb-letter-signature">— ${escapeHtml(author)}</div>
    </div>`;
}

function renderDiaryView(item) {
    const paragraphs = String(item.content || '').trim().split(/\n{2,}/);
    const half = Math.ceil(paragraphs.length / 2) || 1;
    const leftText = paragraphs.slice(0, half).join('\n\n');
    const rightText = paragraphs.slice(half).join('\n\n');

    return `
    <div class="nb-doc-diary">
        <div class="nb-diary-page nb-diary-page--left">
            <div class="nb-diary-clipped-polaroid">
                <div class="nb-paperclip"></div>
                ${item.imageUrl
                    ? `<img src="${escapeHtml(item.imageUrl)}" alt="Photo">`
                    : `<div class="nb-diary-mini-sketch"><i class="fa-solid fa-crow"></i></div>`}
                <span>${escapeHtml(item.date || 'Запись')}</span>
            </div>
            <h3 class="nb-diary-heading">${escapeHtml(item.title)}</h3>
            <div class="nb-diary-handwriting">${formatParagraphs(leftText)}</div>
        </div>
        <div class="nb-diary-rings">
            <span class="nb-ring"></span>
            <span class="nb-ring"></span>
            <span class="nb-ring"></span>
            <span class="nb-ring"></span>
        </div>
        <div class="nb-diary-page nb-diary-page--right">
            <div class="nb-diary-sticky-note">
                <div class="nb-paperclip"></div>
                <strong>${escapeHtml(item.code)}</strong>
                <p>${escapeHtml(item.summary || item.subtitle || 'Важная деталь')}</p>
            </div>
            <div class="nb-diary-handwriting">${rightText ? formatParagraphs(rightText) : '<p class="nb-diary-faded">...страница обрывается...</p>'}</div>
        </div>
    </div>`;
}

function renderReportView(item) {
    const meta = item.metadata || {};
    return `
    <div class="nb-doc-report">
        <div class="nb-report-top">
            <div>
                <h2>ОФИЦИАЛЬНОЕ ЗАКЛЮЧЕНИЕ / ЭКСПЕРТИЗА</h2>
                <div class="nb-report-dept">ДЕПАРТАМЕНТ КРИМИНАЛИСТИКИ • ПРОТОКОЛ ${escapeHtml(item.code)}</div>
            </div>
            <div class="nb-report-date-box">Дата: ${escapeHtml(item.date || 'Зарегистрировано')}</div>
        </div>
        <div class="nb-report-subject">
            <strong>Объект исследования:</strong> ${escapeHtml(item.title)} (${escapeHtml(item.subtitle || 'Экспертиза')})
        </div>
        <div class="nb-report-body">
            ${formatParagraphs(item.content)}
        </div>
        <div class="nb-report-footer">
            <span>Эксперт: <strong>${escapeHtml(meta.author || 'Дежурный судмедэксперт')}</strong></span>
            <span class="nb-report-stamp">ПРОВЕРЕНО</span>
        </div>
    </div>`;
}

function renderOccultView(item) {
    return `
    <div class="nb-doc-occult">
        <div class="nb-occult-sigil"></div>
        <div class="nb-occult-header">
            <span class="nb-occult-code">CODEX ARCANA • ${escapeHtml(item.code)}</span>
            <h2>${escapeHtml(item.title)}</h2>
            <div class="nb-occult-sub">${escapeHtml(item.subtitle || 'Паранормальный феномен / Оккультная улика')}</div>
        </div>
        <div class="nb-occult-body">
            ${formatParagraphs(item.content)}
        </div>
    </div>`;
}

/* ═══ src/ai.js ═══ */
/**
 * Safely lists public Connection Profiles from SillyTavern's Connection Manager.
 * NEVER accesses, reads, logs, or touches API keys or secret storage.
 */
function listConnectionProfiles(getContextFn) {
    const ctx = typeof getContextFn === 'function' ? getContextFn() : globalThis.SillyTavern?.getContext?.() || {};
    const rawProfiles = ctx?.extensionSettings?.connectionManager?.profiles;
    if (!Array.isArray(rawProfiles)) return [];

    return rawProfiles
        .filter(p => p && typeof p === 'object' && p.id && p.name)
        .map(p => ({
            id: String(p.id),
            name: String(p.name),
            api: String(p.api || p.mode || ''),
            model: String(p.model || ''),
        }));
}

/**
 * Sends a text generation request using either the selected Connection Profile
 * (via SillyTavern's ConnectionManagerRequestService) or the currently active Tavern connection.
 * Strictly never touches API keys.
 */
async function generateDetectiveText({
    getContextFn,
    settings,
    systemPrompt,
    userPrompt,
}) {
    const ctx = typeof getContextFn === 'function' ? getContextFn() : globalThis.SillyTavern?.getContext?.() || {};
    const profileId = settings?.textProfileId || '';
    const maxTokens = Number(settings?.maxResponseTokens) || 2800;

    // 1. Try ConnectionManagerRequestService if a specific profile is selected
    const cmService = ctx.ConnectionManagerRequestService || globalThis.ConnectionManagerRequestService;
    if (profileId) {
        if (!cmService || typeof cmService.sendRequest !== 'function') {
            throw new Error('Выбранный профиль недоступен: сервис Connection Manager не найден. Другое подключение не использовалось.');
        }
        try {
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ];
            const response = await cmService.sendRequest(
                profileId,
                messages,
                maxTokens,
                {
                    stream: false,
                    extractData: true,
                    includePreset: true,
                    includeInstruct: false,
                },
                {},
            );
            const text = typeof response === 'string'
                ? response
                : (response?.content || response?.choices?.[0]?.message?.content || response?.text || '');
            if (typeof text === 'string' && text.trim()) {
                return text.trim();
            }
            throw new Error('Выбранный профиль вернул пустой ответ.');
        } catch (err) {
            throw new Error('Не удалось получить ответ от выбранного профиля. Проверьте его в SillyTavern; другое подключение не использовалось.');
        }
    }

    // 2. Fallback or default: use SillyTavern's generateRaw or generateQuietPrompt
    const combinedPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;

    if (typeof ctx.generateRaw === 'function') {
        try {
            const takesObj = /^\s*(?:async\s+)?(?:function\s*)?[\w$]*\s*\(\s*\{/.test(
                Function.prototype.toString.call(ctx.generateRaw),
            );
            const res = takesObj
                ? await ctx.generateRaw({
                    prompt: userPrompt,
                    systemPrompt,
                    responseLength: maxTokens,
                })
                : await ctx.generateRaw(combinedPrompt, null, false, false);
            if (typeof res === 'string' && res.trim()) {
                return res.trim();
            }
        } catch (err) {
            console.warn('[NoirBoard] generateRaw failed, trying generateQuietPrompt:', err);
        }
    }

    if (typeof ctx.generateQuietPrompt === 'function') {
        const takesObj = /^\s*(?:async\s+)?(?:function\s*)?[\w$]*\s*\(\s*\{/.test(
            Function.prototype.toString.call(ctx.generateQuietPrompt),
        );
        const res = takesObj
            ? await ctx.generateQuietPrompt({
                quietPrompt: combinedPrompt,
                quietToLoud: false,
                skipWIAN: true,
                responseLength: maxTokens,
            })
            : await ctx.generateQuietPrompt(combinedPrompt, false, true);
        if (typeof res === 'string' && res.trim()) {
            return res.trim();
        }
    }

    throw new Error('Не удалось получить ответ от модели. Проверьте активное подключение в SillyTavern.');
}

/**
 * Generates an image using SillyTavern's built-in /sd slash command or image generation pipeline.
 */
function safeWebUrl(value) {
    try { const url = new URL(String(value || '')); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; }
}

function safeImageUrl(value) {
    const text = String(value || '');
    if (/^\/(?!\/)[^\s<>]*$/.test(text)) return text;
    if (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(text)) return text;
    return safeWebUrl(text);
}

function extractGeneratedImage(response) {
    const message = response?.choices?.[0]?.message;
    const candidates = [
        ...(message?.images || []).map(image => image?.image_url?.url || image?.url),
        ...(Array.isArray(message?.content) ? message.content : []).map(part => part?.image_url?.url),
        ...(response?.data || []).map(image => image?.url || (image?.b64_json ? `data:image/png;base64,${image.b64_json}` : '')),
        ...(response?.candidates?.[0]?.content?.parts || []).map(part => part.inlineData ? `data:${part.inlineData.mimeType};base64,${part.inlineData.data}` : ''),
    ];
    return candidates.map(safeImageUrl).find(Boolean) || '';
}

async function generateEvidenceImage({ getContextFn, prompt, settings = {} }) {
    if (!prompt || !prompt.trim()) return '';
    const ctx = typeof getContextFn === 'function' ? getContextFn() : globalThis.SillyTavern?.getContext?.() || {};

    if (settings.imageProfileId) {
        const service = ctx.ConnectionManagerRequestService || globalThis.ConnectionManagerRequestService;
        if (!service?.sendRequest) throw new Error('Connection Manager недоступен. Профиль изображений не переключался.');
        const response = await service.sendRequest(settings.imageProfileId,
            [{ role: 'user', content: `Generate an image, not a textual description: ${prompt}` }],
            4096, { stream: false, extractData: false, includePreset: true, includeInstruct: false },
            { request_images: true });
        const url = extractGeneratedImage(response);
        if (!url) throw new Error('Профиль не вернул изображение. Нужна модель с генерацией картинок через Chat Completions, например совместимая Gemini image-модель.');
        if (!url.startsWith('data:')) return url;
        const save = ctx.saveBase64AsFile || (await import('/scripts/utils.js')).saveBase64AsFile;
        const [, extension, data] = url.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
        return await save(data, 'NoirBoard', uid('evidence'), extension);
    }

    if (typeof ctx.executeSlashCommandsWithOptions === 'function') {
        try {
            const cleanPrompt = prompt.replace(/["\\|{}\r\n]+/g, ' ').trim();
            const result = await ctx.executeSlashCommandsWithOptions(`/sd quiet=true "${cleanPrompt}"`, {
                handleParserFlags: true,
                handleExecutionErrors: true,
            });
            const pipe = typeof result === 'string' ? result.trim() : String(result?.pipe || '').trim();
            if (pipe && (pipe.startsWith('/') || pipe.startsWith('http') || pipe.startsWith('data:image'))) {
                return pipe;
            }
        } catch (err) {
            console.warn('[NoirBoard] /sd image generation failed:', err);
        }
    }
    return '';
}

function commonsImageRecord(page) {
    const image = page?.imageinfo?.[0];
    const meta = image?.extmetadata || {};
    const plain = value => String(value || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
    const license = plain(meta.LicenseShortName?.value);
    if (!/^(CC0|Public domain|CC BY(?:-SA)?(?: [\d.]+)?)$/i.test(license)) return null;
    if (meta.Restrictions?.value || meta.Permission?.value?.includes('No permission')) return null;
    const url = safeWebUrl(image.thumburl || image.url);
    if (!url || !['upload.wikimedia.org', 'thumb.wikimedia.org'].includes(new URL(url).hostname)) return null;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.mime)) return null;
    const pageUrl = safeWebUrl(image.descriptionurl);
    if (!pageUrl || new URL(pageUrl).hostname !== 'commons.wikimedia.org') return null;
    const author = plain(meta.Artist?.value || meta.Credit?.value);
    if (!author) return null;
    return { url, source: 'commons', title: plain(page.title).replace(/^File:/, ''), author,
        license, licenseUrl: safeWebUrl(meta.LicenseUrl?.value), pageUrl };
}

async function findCommonsImage(item, fetchFn = globalThis.fetch) {
    const query = String(item.imageSearchQuery || `${item.type === 'map' ? 'historic map ' : ''}${item.title} ${item.subtitle || ''}`)
        .replace(/["|{}\r\n]/g, ' ').trim().slice(0, 180);
    if (!query) throw new Error('Нет запроса для поиска изображения.');
    const params = new URLSearchParams({ action: 'query', format: 'json', origin: '*', generator: 'search',
        gsrsearch: `${query} filetype:bitmap`, gsrnamespace: '6', gsrlimit: '12', prop: 'imageinfo',
        iiprop: 'url|mime|extmetadata', iiurlwidth: '1280' });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
        const response = await fetchFn(`https://commons.wikimedia.org/w/api.php?${params}`, {
            signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer',
        });
        if (!response.ok) throw new Error(`Wikimedia Commons: HTTP ${response.status}`);
        const data = await response.json();
        if (data.error) throw new Error('Wikimedia Commons не смог выполнить поиск.');
        const pages = Object.values(data.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
        const image = pages.map(commonsImageRecord).find(Boolean);
        if (!image) throw new Error('Подходящих свободных изображений не найдено. Уточните поисковую фразу или используйте генерацию.');
        return image;
    } finally { clearTimeout(timer); }
}

async function acquireItemImages({ item, settings, getContextFn, findImage = findCommonsImage, generateImage = generateEvidenceImage }) {
    const results = [];
    const errors = [];
    const mode = settings.imageSource || 'generated';
    if (mode !== 'generated') {
        try { results.push(await findImage(item)); } catch (error) { errors.push(error.message); }
    }
    if (mode !== 'internet') {
        try {
            const url = await generateImage({ getContextFn, settings,
                prompt: item.imagePrompt || `${item.title}, ${item.subtitle || ''}, ${item.type === 'map' ? 'detailed topographic map, roads, terrain, cartography' : 'detective evidence photograph'}` });
            if (!safeImageUrl(url)) throw new Error('Генератор не вернул изображение.');
            results.push({ url, source: 'generated', title: item.title, author: '', license: '', pageUrl: '', licenseUrl: '' });
        } catch (error) { errors.push(error.message); }
    }
    if (!results.length) throw new Error(errors.join('\n'));
    return { images: results, errors };
}

function renderImageGallery(item) {
    if (!item.images?.length) return '';
    return `<section class="nb-image-gallery"><h4>Иллюстрации к материалу</h4><div class="nb-image-options">${item.images.map((image, index) => `
        <figure><button type="button" class="nb-image-choice ${item.imageUrl === image.url ? 'is-selected' : ''}" data-item-id="${escapeHtml(item.id)}" data-image-index="${index}" title="Использовать на документе и доске">
            <img src="${escapeHtml(safeImageUrl(image.url))}" alt="${escapeHtml(image.title)}" loading="lazy" referrerpolicy="no-referrer"></button>
        <figcaption>${image.source === 'commons'
            ? `Иллюстрация из Commons, не доказательство: <a href="${escapeHtml(safeWebUrl(image.pageUrl))}" target="_blank" rel="noopener noreferrer">${escapeHtml(image.title)}</a><br>${escapeHtml(image.author)} · ${image.licenseUrl ? `<a href="${escapeHtml(safeWebUrl(image.licenseUrl))}" target="_blank" rel="noopener noreferrer">${escapeHtml(image.license)}</a>` : escapeHtml(image.license)}`
            : 'Сгенерировано ИИ · иллюстрация к РП'}</figcaption></figure>`).join('')}</div></section>`;
}

function buildChatContextSnapshot(getContextFn, settings) {
    const ctx = typeof getContextFn === 'function' ? getContextFn() : globalThis.SillyTavern?.getContext?.() || {};
    const limit = Number(settings?.contextMessagesLimit) || 25;
    const chat = Array.isArray(ctx.chat) ? ctx.chat : [];

    const recentMessages = chat
        .filter(m => m && !m.is_system && typeof m.mes === 'string' && m.mes.trim())
        .slice(-limit)
        .map((m, idx) => {
            const speaker = m.name || (m.is_user ? (ctx.name1 || 'Detective') : (ctx.name2 || 'Character'));
            const cleanMes = m.mes
                .replace(/<think>[\s\S]*?<\/think>/gi, '')
                .replace(/<[^>]+>/g, '')
                .trim()
                .slice(0, 1200);
            return `[#${idx + 1}] ${speaker}: ${cleanMes}`;
        })
        .join('\n\n');

    let charBio = '';
    if (settings?.includeCharDescription !== false && !ctx.groupId) {
        const char = ctx.characters?.[ctx.characterId];
        if (char) {
            const parts = [
                char.name ? `Имя персонажа: ${char.name}` : '',
                char.description ? `Описание: ${char.description.slice(0, 1800)}` : '',
                char.personality ? `Характер: ${char.personality.slice(0, 800)}` : '',
                char.scenario ? `Сценарий: ${char.scenario.slice(0, 800)}` : '',
            ].filter(Boolean);
            charBio = parts.join('\n');
        }
    }

    return {
        userName: ctx.name1 || 'Детектив',
        charName: ctx.name2 || 'Фигурант',
        charBio,
        recentMessages: recentMessages || '(Чат пока пуст или начинается новое расследование)',
    };
}

function extractJsonFromResponse(rawText) {
    if (!rawText || typeof rawText !== 'string') {
        throw new Error('Модель вернула пустой ответ.');
    }

    const cleaned = rawText
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .trim();

    const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1].trim() : cleaned;

    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        const slice = candidate.slice(firstBrace, lastBrace + 1);
        try {
            return JSON.parse(slice);
        } catch {
            const repaired = slice
                .replace(/,\s*([}\]])/g, '$1')
                .replace(/[\u0000-\u0019]+/g, ' ');
            return JSON.parse(repaired);
        }
    }

    throw new Error('Не удалось распознать JSON-структуру материалов дела в ответе ИИ.');
}

async function scanChatForEvidence({ getContextFn, settings, currentCase }) {
    const snapshot = buildChatContextSnapshot(getContextFn, settings);
    const count = Math.max(1, Math.min(10, Number(settings.itemsPerScan) || 4));

    const enabledTypesList = Object.keys(ITEM_TYPES).filter(t => {
        if (t === 'occult' && settings.mode !== 'supernatural') return false;
        return settings.enabledTypes?.[t] !== false;
    });

    if (settings.mode === 'supernatural' && !enabledTypesList.includes('occult')) {
        enabledTypesList.push('occult');
    }
    if (!enabledTypesList.length) {
        enabledTypesList.push('dossier', 'newspaper', 'letter', 'evidence_bag');
    }

    const existingTitles = (currentCase?.items || [])
        .map(it => `- [${it.type}] ${it.title} (${it.code})`)
        .join('\n');

    const langInstruction = settings.language === 'en'
        ? 'Write ALL generated titles, content, metadata, and clues in English.'
        : settings.language === 'auto'
            ? 'Write all generated content in the same language as the chat messages (default to Russian if unclear).'
            : 'Пиши ВСЕ заголовки, тексты документов, поля метаданных и зацепки на русском языке (кроме кодов улик вроде Evidence #12A или штампов CONFIDENTIAL).';

    const modeSpecificInstruction = settings.mode === 'modern'
        ? 'РЕЖИМ: СОВРЕМЕННЫЙ (Кибер / Электронная криминалистика / OSINT). Оформляй материалы как цифровые досье спецслужб, распечатки биллинга, логи переписок, стоп-кадры CCTV, криминалистические базы данных, GPS-карты и отчёты ДНК/дактилоскопии.'
        : settings.mode === 'supernatural'
            ? 'РЕЖИМ: СВЕРХЪЕСТЕСТВЕННОЕ / МИСТИКА (Оккультный детектив). Помимо классических улик обязательно включай паранормальные и мистические детали: странные символы, аномальные отпечатки, дневники охотников, бестиарии, оккультные отчёты, мистические артефакты (тип "occult" или "diary").'
            : 'РЕЖИМ: КЛАССИЧЕСКИЙ ДЕТЕКТИВНЫЙ СТОЛ (Нуар / Архивное расследование). Оформляй материалы как бумажные личные дела с фотографиями на скрепках, газетные вырезки, письма на печатной машинке, дактилоскопические карты, зип-пакеты с вещдоками и рукописные дневники.';

    const systemPrompt = `Ты — сценарист детективных ролевых игр и криминалистический архивариус для расширения NoirBoard в SillyTavern.
Проанализируй текущий чат ролевой игры и сгенерируй ровно ${count} детализированных, атмосферных материалов расследования для стола детектива и Стены связей улик.

${langInstruction}
${modeSpecificInstruction}

Доступные типы материалов ("type"):
${enabledTypesList.map(t => `- "${t}": ${ITEM_TYPES[t]?.label}`).join('\n')}

Верни ТОЛЬКО валидный JSON-объект следующей структуры:
{
  "caseTitle": "Название дела",
  "caseSummary": "Краткая сводка расследования (2-3 предложения)",
  "items": [
    {
      "type": "${enabledTypesList[0]}",
      "title": "Заголовок документа или предмета",
      "subtitle": "Подзаголовок / классификация",
      "date": "Дата в мире игры",
      "code": "Evidence #12A или № 0426-K",
      "summary": "Короткое описание для карточки (1-2 предложения)",
      "content": "Полный литературный текст документа или описание предмета (2-4 абзаца с деталями, фактами и уликами)",
      "imageSearchQuery": "Short generic English stock-photo search phrase; no private names, no story spoilers",
      "imagePrompt": "Detailed English visual prompt for generating an illustration/photo of this person or evidence",
      "clues": ["Конкретная зацепка 1", "Конкретная зацепка 2"],
      "pinToWall": true,
      "metadata": {
        "dossierType": "folder или classified",
        "fullName": "ФИО фигуранта",
        "birthDate": "Дата рождения",
        "birthPlace": "Место рождения",
        "nationality": "Гражданство / Национальность",
        "heightWeight": "Рост / Вес",
        "appearance": ["Черта внешности 1", "Черта 2"],
        "character": ["Черта характера 1", "Черта 2"],
        "occupation": "Деятельность / Должность",
        "family": "Семья / Связи",
        "skills": "Подготовка, навыки или особые приметы",
        "stamp": "Текст круглой печати (например: COSA NOSTRA или АРХИВНЫЙ ОТДЕЛ)",
        "newspaperName": "Название газеты",
        "headline": "Главный заголовок статьи",
        "subheadline": "Подзаголовок статьи",
        "author": "Автор статьи / Отчёта / Письма",
        "recipient": "Адресат письма",
        "fingerprintPattern": "whorl | loop | arch | palm | footprint",
        "matchPercent": "94.8% или НЕ УСТАНОВЛЕНО",
        "surfaceFound": "Где обнаружен отпечаток / улика",
        "coordinates": "34.0522 N, -118.2437 W",
        "locations": ["Локация 1 — пометка", "Локация 2 — пометка"],
        "hiddenDetail": "Скрытая мелкая деталь, заметная при осмотре под лупой!"
      }
    }
  ],
  "suggestedConnections": [
    {
      "fromIndex": 0,
      "toIndex": 1,
      "color": "red",
      "label": "Связь между уликами"
    }
  ]
}`;

    const userPrompt = `ДАННЫЕ РАССЛЕДОВАНИЯ:
Детектив: ${snapshot.userName}
Персонаж: ${snapshot.charName}
${snapshot.charBio ? `\nКОНТЕКСТ ПЕРСОНАЖА:\n${snapshot.charBio}\n` : ''}
${settings.avoidDuplicates && existingTitles ? `\nУЖЕ ЕСТЬ НА СТОЛЕ (не дублируй):\n${existingTitles}\n` : ''}
${settings.customPromptInstructions ? `\nПОЖЕЛАНИЯ ИГРОКА:\n${settings.customPromptInstructions}\n` : ''}

СООБЩЕНИЯ ЧАТА:
${snapshot.recentMessages}

Сгенерируй ${count} новых материалов разных типов из списка (${enabledTypesList.join(', ')}).`;

    const rawResponse = await generateDetectiveText({
        getContextFn,
        settings,
        systemPrompt,
        userPrompt,
    });

    const parsed = extractJsonFromResponse(rawResponse);
    return applyGeneratedEvidenceToCase({
        parsed,
        currentCase,
        settings,
    });
}

function applyGeneratedEvidenceToCase({ parsed, currentCase, settings }) {
    if (!parsed || typeof parsed !== 'object') return { addedItems: [], caseData: currentCase };

    if (typeof parsed.caseTitle === 'string' && parsed.caseTitle.trim()) {
        currentCase.title = parsed.caseTitle.trim();
    }
    if (typeof parsed.caseSummary === 'string' && parsed.caseSummary.trim()) {
        currentCase.summary = parsed.caseSummary.trim();
    }

    const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
    const addedItems = [];
    const createdNodesByItemIndex = new Map();

    rawItems.forEach((raw, idx) => {
        const item = normalizeItem(raw, currentCase.items.length + idx);
        currentCase.items.unshift(item);
        addedItems.push(item);

        const shouldPin = settings?.autoPinImportant !== false
            && (raw.pinToWall === true || ITEM_TYPES[item.type]?.defaultPinned);
        if (shouldPin) {
            const node = pinItemToCaseWall(currentCase, item);
            if (node) {
                createdNodesByItemIndex.set(idx, node);
            }
        }
    });

    if (Array.isArray(parsed.suggestedConnections)) {
        for (const conn of parsed.suggestedConnections) {
            const fromNode = createdNodesByItemIndex.get(Number(conn?.fromIndex));
            const toNode = createdNodesByItemIndex.get(Number(conn?.toIndex));
            if (fromNode && toNode && fromNode.id !== toNode.id) {
                const exists = currentCase.connections.some(
                    c => (c.fromNodeId === fromNode.id && c.toNodeId === toNode.id)
                        || (c.fromNodeId === toNode.id && c.toNodeId === fromNode.id),
                );
                if (!exists) {
                    currentCase.connections.push({
                        id: uid('conn'),
                        fromNodeId: fromNode.id,
                        toNodeId: toNode.id,
                        color: ['red', 'yellow', 'blue', 'green', 'purple'].includes(conn.color) ? conn.color : 'red',
                        label: typeof conn.label === 'string' ? conn.label.slice(0, 100) : '',
                    });
                }
            }
        }
    }

    currentCase.updatedAt = Date.now();
    return { addedItems, caseData: currentCase };
}


/**
 * Modern Mode feature: Search the in-world Internet / Criminal Databases / OSINT.
 */
async function runModernSearch({ getContextFn, settings, currentCase, query }) {
    if (!query || !query.trim()) {
        throw new Error('Введите поисковый запрос.');
    }

    const snapshot = buildChatContextSnapshot(getContextFn, settings);
    const systemPrompt = `Ты — криминалистическая поисковая система OSINT и закрытая база данных спецслужб внутри мира ролевой игры SillyTavern.
Игрок ввёл поисковый запрос в терминал. На основе контекста чата, персонажей и лора сгенерируй реалистичную выдачу из 3 результатов (реестры, криминальные сводки, соцсети, переписки, финансовые транзакции, записи камер или статьи) и один готовый материал (generatedItem), который можно сохранить в дело.

Верни ТОЛЬКО валидный JSON:
{
  "query": "запрос",
  "databaseStatus": "НАЙДЕНО СОВПАДЕНИЙ: 3 | ДОСТУП: УРОВЕНЬ 4",
  "results": [
    {
      "source": "Название базы / сайта / архива (например: INTERPOL RED NOTICE / ГОСРЕЕСТР / DARKNET ARCHIVE)",
      "title": "Заголовок записи",
      "date": "Дата записи",
      "snippet": "Подробная выдержка из базы данных (3-5 предложений с конкретными фактами, номерами, адресами или уликами)",
      "relevance": "98%"
    }
  ],
  "generatedItem": {
    "type": "report",
    "title": "Выписка из базы данных по запросу",
    "subtitle": "ЭЛЕКТРОННЫЙ ЗАПРОС OSINT",
    "date": "Сегодня",
    "code": "#OSINT-1",
    "summary": "Краткая суть найденного",
    "content": "Полный развёрнутый отчёт по результатам электронного поиска",
    "clues": ["Найденный факт 1", "Найденный факт 2"],
    "metadata": {
      "author": "Аналитический терминал OSINT",
      "hiddenDetail": "Цифровая подпись или скрытый IP-адрес в логах"
    }
  }
}`;

    const userPrompt = `ПОИСКОВЫЙ ЗАПРОС В ТЕРМИНАЛЕ: "${query.trim()}"
Контекст персонажа: ${snapshot.charName}
${snapshot.charBio ? `${snapshot.charBio}\n` : ''}
Последние события чата:
${snapshot.recentMessages}`;

    const raw = await generateDetectiveText({ getContextFn, settings, systemPrompt, userPrompt });
    const parsed = extractJsonFromResponse(raw);

    const record = {
        id: uid('search'),
        query: query.trim(),
        timestamp: Date.now(),
        databaseStatus: parsed.databaseStatus || 'ПОИСК ЗАВЕРШЁН',
        results: Array.isArray(parsed.results) ? parsed.results : [],
        generatedItem: parsed.generatedItem ? normalizeItem(parsed.generatedItem, currentCase.items.length) : null,
    };

    currentCase.searchHistory = [record, ...(currentCase.searchHistory || [])].slice(0, 20);
    return record;
}

/**
 * Analyzes the Evidence Wall (pinned nodes + user-drawn thread connections) to produce a detective deduction.
 */
async function analyzeEvidenceWall({ getContextFn, settings, currentCase }) {
    const nodes = currentCase?.nodes || [];
    const connections = currentCase?.connections || [];
    if (!nodes.length) {
        throw new Error('На Стене связей пока нет закреплённых улик. Закрепите хотя бы пару материалов со стола.');
    }

    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const nodesText = nodes
        .map((n, i) => `${i + 1}. [${n.tag}] "${n.title}" (${n.subtitle}): ${n.snippet}${n.note ? ` | Заметка детектива: ${n.note}` : ''}`)
        .join('\n');

    const connText = connections
        .map((c, i) => {
            const from = nodeMap.get(c.fromNodeId);
            const to = nodeMap.get(c.toNodeId);
            if (!from || !to) return '';
            return `${i + 1}. "${from.title}" <==[нить: ${c.color}${c.label ? `, подпись: "${c.label}"` : ''}]==> "${to.title}"`;
        })
        .filter(Boolean)
        .join('\n');

    const systemPrompt = `Ты — аналитический ум детектива (в духе Шерлока Холмса, Раста Коула и Mind Place из Alan Wake 2).
Игрок разложил улики на Стене связей и соединил их нитями. Проанализируй эти улики и протянутые между ними связи.
Напиши атмосферный, проницательный дедуктивный вывод (3-4 абзаца):
1. Какие связи подтверждаются и какую картину преступления/тайны они складывают.
2. Какие противоречия, странности или несостыковки видны между уликами.
3. Какую следующую зацепку или вопрос стоит проверить в ролевой игре.`;

    const userPrompt = `ДЕЛО: ${currentCase.title} (${currentCase.caseNumber})
ЗАКРЕПЛЁННЫЕ НА СТЕНЕ УЛИКИ:
${nodesText}

ПРОТЯНУТЫЕ НИТИ СВЯЗЕЙ:
${connText || '(Нити ещё не протянуты — предложи, какие из этих улик связаны между собой)'}`;

    const deduction = await generateDetectiveText({
        getContextFn,
        settings,
        systemPrompt,
        userPrompt,
    });

    currentCase.deduction = deduction.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    currentCase.updatedAt = Date.now();
    return currentCase.deduction;
}

/* ═══ src/ui.js ═══ */
function createNoirBoardUI({ storage }) {
    let isOpen = false;
    let activeTab = 'desk';
    let activeTypeFilter = 'all';
    let inspectedItemId = null;
    let isSettingsOpen = false;
    let isAddModalOpen = false;
    let isBusy = false;
    let busyMessage = '';
    let magnifierActive = false;

    let connectMode = false;
    let selectedThreadColor = 'red';
    let connectSourceNodeId = null;
    let draggingNodeId = null;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    let rootEl = null;

    function notify(type, message) {
        const toastr = globalThis.toastr;
        if (toastr && typeof toastr[type] === 'function') {
            toastr[type](message, 'NoirBoard');
        } else {
            console.log(`[NoirBoard][${type}]`, message);
        }
    }

    function ensureRootModal() {
        if (rootEl && document.body.contains(rootEl)) return rootEl;
        rootEl = document.createElement('div');
        rootEl.id = 'noirboard-modal-overlay';
        rootEl.className = 'nb-overlay nb-hidden';
        document.body.appendChild(rootEl);
        bindGlobalEvents();
        return rootEl;
    }

    function open(initialTab = null) {
        ensureRootModal();
        if (initialTab === 'desk' || initialTab === 'wall') {
            activeTab = initialTab;
        }
        isOpen = true;
        rootEl.classList.remove('nb-hidden');
        render();
    }

    function close() {
        if (!rootEl) return;
        isOpen = false;
        inspectedItemId = null;
        isSettingsOpen = false;
        isAddModalOpen = false;
        magnifierActive = false;
        connectSourceNodeId = null;
        rootEl.classList.add('nb-hidden');
    }

    function toggle() {
        if (isOpen) close();
        else open();
    }

    function setBusy(state, msg = '') {
        isBusy = Boolean(state);
        busyMessage = msg;
        if (isOpen) render();
    }

    function render() {
        if (!rootEl || !isOpen) return;
        const settings = storage.getSettings();
        const currentCase = storage.getCurrentCase();
        const modeInfo = MODES[settings.mode] || MODES.standard;

        rootEl.setAttribute('data-nb-mode', settings.mode);

        rootEl.innerHTML = `
        <div class="nb-window nb-mode-${escapeHtml(settings.mode)}" role="dialog" aria-modal="true" aria-label="NoirBoard — рабочее место детектива" tabindex="-1">
            <header class="nb-topbar">
                <div class="nb-brand">
                    <span class="nb-brand-icon"><i class="${modeInfo.icon}"></i></span>
                    <div class="nb-brand-titles">
                        <div class="nb-brand-row">
                            <span class="nb-case-num">${escapeHtml(currentCase.caseNumber)}</span>
                            <h2 class="nb-case-title" title="Нажмите, чтобы переименовать дело">${escapeHtml(currentCase.title)}</h2>
                        </div>
                        <span class="nb-mode-pill">${escapeHtml(modeInfo.shortLabel)} • Материалов: ${currentCase.items.length} • На стене: ${currentCase.nodes.length}</span>
                    </div>
                </div>

                <nav class="nb-main-tabs" role="tablist">
                    <button type="button" class="nb-tab-btn ${activeTab === 'desk' ? 'is-active' : ''}" data-nb-tab="desk">
                        <i class="fa-solid fa-folder-tree"></i>
                        <span>Стол детектива</span>
                        <span class="nb-tab-count">${currentCase.items.length}</span>
                    </button>
                    <button type="button" class="nb-tab-btn ${activeTab === 'wall' ? 'is-active' : ''}" data-nb-tab="wall">
                        <i class="fa-solid fa-thumbtack"></i>
                        <span>Стена связи улик</span>
                        <span class="nb-tab-count">${currentCase.nodes.length}</span>
                    </button>
                </nav>

                <div class="nb-topbar-actions">
                    <button type="button" class="nb-btn nb-btn-primary nb-act-scan" ${isBusy ? 'disabled' : ''} title="Просканировать чат ИИ-моделью и создать материалы по истории">
                        <i class="fa-solid ${isBusy ? 'fa-spinner fa-spin' : 'fa-magnifying-glass-plus'}"></i>
                        <span>${isBusy ? escapeHtml(busyMessage || 'Изучаем дело...') : 'Изучить дело'}</span>
                    </button>
                    <button type="button" class="nb-btn nb-btn-secondary nb-act-open-add" title="Создать документ или улику вручную">
                        <i class="fa-solid fa-file-circle-plus"></i>
                    </button>
                    <button type="button" class="nb-btn nb-btn-secondary nb-act-open-settings" title="Настройки режима, профилей и генерации">
                        <i class="fa-solid fa-gear"></i>
                    </button>
                    <button type="button" class="nb-btn nb-btn-close nb-act-close" title="Закрыть">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </header>

            <main class="nb-workspace">
                ${activeTab === 'desk'
                    ? renderDeskSection(currentCase, settings)
                    : renderWallSection(currentCase, settings)}
            </main>

            ${inspectedItemId ? renderInspectorModal(currentCase, settings) : ''}
            ${isSettingsOpen ? renderSettingsModal(currentCase, settings) : ''}
            ${isAddModalOpen ? renderAddItemModal(settings) : ''}
        </div>`;

        if (activeTab === 'wall') {
            updateWallLinesSvg();
        }
    }

    function renderDeskSection(currentCase, settings) {
        const pinnedItemIds = new Set(currentCase.nodes.filter(n => !n.isSubClue).map(n => n.itemId));
        const items = currentCase.items.filter(it => activeTypeFilter === 'all' || it.type === activeTypeFilter);

        const typeFiltersHtml = [
            { id: 'all', label: 'Все материалы', icon: 'fa-solid fa-layer-group', count: currentCase.items.length },
            ...Object.values(ITEM_TYPES)
                .filter(t => t.id !== 'occult' || settings.mode === 'supernatural' || currentCase.items.some(i => i.type === 'occult'))
                .map(t => ({
                    id: t.id,
                    label: t.badge,
                    icon: t.icon,
                    count: currentCase.items.filter(i => i.type === t.id).length,
                })),
        ].map(f => `
            <button type="button" class="nb-filter-chip ${activeTypeFilter === f.id ? 'is-active' : ''}" data-filter-type="${f.id}">
                <i class="${f.icon}"></i>
                <span>${escapeHtml(f.label)}</span>
                <small>${f.count}</small>
            </button>
        `).join('');

        const modernTerminalHtml = settings.mode === 'modern' ? renderModernSearchTerminal(currentCase) : '';

        return `
        <section class="nb-desk-view">
            <div class="nb-desk-sidebar-bar">
                <div class="nb-filter-scroll">${typeFiltersHtml}</div>
                ${currentCase.summary ? `<div class="nb-case-summary-banner"><i class="fa-solid fa-clipboard-list"></i> <strong>Сводка дела:</strong> ${escapeHtml(currentCase.summary)}</div>` : ''}
            </div>

            ${modernTerminalHtml}

            <div class="nb-desk-surface">
                ${items.length
                    ? `<div class="nb-desk-grid">
                        ${items.map(item => renderDeskItemCard(item, pinnedItemIds.has(item.id))).join('')}
                    </div>`
                    : `<div class="nb-empty-desk">
                        <div class="nb-empty-desk-icon"><i class="fa-solid fa-folder-open"></i></div>
                        <h3>Стол детектива пока пуст</h3>
                        <p>Нажмите кнопку <strong>«Изучить дело»</strong> в правом верхнем углу — ИИ просканирует текущий чат и разложит на столе личные дела, газетные вырезки, отпечатки, письма, фотографии и улики.</p>
                        <div class="nb-empty-desk-btns">
                            <button type="button" class="nb-btn nb-btn-primary nb-act-scan" ${isBusy ? 'disabled' : ''}>
                                <i class="fa-solid fa-magnifying-glass-plus"></i> Изучить дело по чату
                            </button>
                            <button type="button" class="nb-btn nb-btn-secondary nb-act-load-demo">
                                <i class="fa-solid fa-wand-magic-sparkles"></i> Загрузить демонстрационный набор улик
                            </button>
                        </div>
                    </div>`}
            </div>
        </section>`;
    }

    function renderModernSearchTerminal(currentCase) {
        const latest = currentCase.searchHistory?.[0] || null;
        return `
        <div class="nb-modern-terminal">
            <div class="nb-terminal-header">
                <span><i class="fa-solid fa-satellite-dish"></i> ТЕРМИНАЛ OSINT // ПОИСК В СЕТИ И КРИМИНАЛЬНЫХ БАЗАХ ДАННЫХ</span>
                <span class="nb-terminal-status">${escapeHtml(latest?.databaseStatus || 'СИМУЛЯЦИЯ ПО МИРУ РП')}</span>
            </div>
            <div class="nb-terminal-search-bar">
                <input type="text" id="nb-modern-search-input" class="nb-input" placeholder="Введите имя, номер авто, адрес, телефон, организацию или улику для поиска в сети..." value="${escapeHtml(latest?.query || '')}">
                <button type="button" class="nb-btn nb-btn-primary nb-act-modern-search" ${isBusy ? 'disabled' : ''}>
                    <i class="fa-solid fa-globe"></i> Поискать в сети
                </button>
            </div>
            ${latest && Array.isArray(latest.results) && latest.results.length ? `
            <div class="nb-terminal-results">
                ${latest.results.map(r => `
                    <div class="nb-terminal-hit">
                        <div class="nb-terminal-hit-top">
                            <span class="nb-hit-source">${escapeHtml(r.source || 'БАЗА ДАННЫХ')}</span>
                            <span class="nb-hit-date">${escapeHtml(r.date || '')} • Совпадение: ${escapeHtml(r.relevance || '95%')}</span>
                        </div>
                        <div class="nb-terminal-hit-title">${escapeHtml(r.title)}</div>
                        <div class="nb-terminal-hit-snippet">${escapeHtml(r.snippet)}</div>
                    </div>
                `).join('')}
                ${latest.generatedItem ? `
                <div class="nb-terminal-save-bar">
                    <button type="button" class="nb-btn nb-btn-secondary nb-act-save-search-item" data-search-id="${escapeHtml(latest.id)}">
                        <i class="fa-solid fa-file-import"></i> Сохранить выписку «${escapeHtml(latest.generatedItem.title)}» на стол и стену улик
                    </button>
                </div>` : ''}
            </div>` : ''}
        </div>`;
    }

    function renderWallSection(currentCase) {
        const nodes = currentCase.nodes || [];
        const connections = currentCase.connections || [];

        const threadColorsHtml = THREAD_COLORS.map(tc => `
            <button type="button" class="nb-thread-color-btn ${selectedThreadColor === tc.id ? 'is-selected' : ''}" data-thread-color="${tc.id}" style="--nb-thread-hex: ${tc.hex};" title="${escapeHtml(tc.label)}">
                <span class="nb-thread-dot"></span>
            </button>
        `).join('');

        return `
        <section class="nb-wall-view">
            <div class="nb-wall-toolbar">
                <div class="nb-wall-tools-left">
                    <button type="button" class="nb-btn ${connectMode ? 'nb-btn-primary' : 'nb-btn-secondary'} nb-act-toggle-connect">
                        <i class="fa-solid fa-diagram-project"></i>
                        <span>${connectMode ? 'Режим нитей: ВКЛ (кликните 2 улики)' : 'Связать ниткой'}</span>
                    </button>
                    <div class="nb-thread-palette" title="Цвет нити для связи">
                        ${threadColorsHtml}
                    </div>
                    <button type="button" class="nb-btn nb-btn-secondary nb-act-add-wall-note" title="Приколоть текстовый стикер/зацепку прямо на доску">
                        <i class="fa-solid fa-note-sticky"></i> + Стикер
                    </button>
                </div>
                <div class="nb-wall-tools-right">
                    <button type="button" class="nb-btn nb-btn-primary nb-act-wall-deduce" ${isBusy ? 'disabled' : ''} title="Попросить ИИ проанализировать закреплённые улики и протянутые нити">
                        <i class="fa-solid fa-brain"></i> Дедукция ИИ по стене
                    </button>
                    ${connections.length ? `
                    <button type="button" class="nb-btn nb-btn-secondary nb-act-clear-threads" title="Срезать все нити">
                        <i class="fa-solid fa-scissors"></i> Срезать нити (${connections.length})
                    </button>` : ''}
                </div>
            </div>

            ${currentCase.deduction ? `
            <div class="nb-wall-deduction-box">
                <div class="nb-deduction-head">
                    <span><i class="fa-solid fa-user-secret"></i> ДЕДУКТИВНЫЙ АНАЛИЗ СВЯЗЕЙ НА ДОСКЕ</span>
                    <button type="button" class="nb-btn-icon nb-act-close-deduction" title="Скрыть сводку"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="nb-deduction-text">${escapeHtml(currentCase.deduction).replace(/\n/g, '<br>')}</div>
            </div>` : ''}

            <div class="nb-wall-board-wrap" id="nb-wall-board-wrap">
                <div class="nb-wall-board" id="nb-wall-board">
                    <svg class="nb-wall-svg" id="nb-wall-svg" width="2400" height="1600"></svg>
                    ${nodes.length ? nodes.map(node => renderWallNode(node)).join('') : `
                    <div class="nb-wall-empty">
                        <i class="fa-solid fa-thumbtack"></i>
                        <h3>Стена связи улик пуста</h3>
                        <p>Перейдите на <strong>«Стол детектива»</strong> и нажмите иконку булавки <i class="fa-solid fa-thumbtack"></i> на важных документах или вынесите отдельные зацепки изнутри досье, чтобы соединить их цветными нитями.</p>
                    </div>`}
                </div>
                <div class="nb-wall-watermark">TRUST NO ONE</div>
            </div>
        </section>`;
    }


    function renderWallNode(node) {
        const isSource = connectSourceNodeId === node.id;
        return `
        <div class="nb-wall-node nb-wall-node--${escapeHtml(node.type)} ${isSource ? 'is-connect-source' : ''}"
             data-node-id="${escapeHtml(node.id)}"
             style="left: ${node.x}px; top: ${node.y}px;">
            <div class="nb-wall-pin" data-pin-node-id="${escapeHtml(node.id)}" title="Нажмите, чтобы протянуть нитку к другой улике"></div>
            <div class="nb-wall-evidence-tag">${escapeHtml(node.tag)}</div>
            ${node.imageUrl ? `<div class="nb-wall-node-photo"><img src="${escapeHtml(node.imageUrl)}" alt="${escapeHtml(node.title)}"></div>` : ''}
            <div class="nb-wall-node-title">${escapeHtml(node.title)}</div>
            ${node.subtitle ? `<div class="nb-wall-node-sub">${escapeHtml(node.subtitle)}</div>` : ''}
            <div class="nb-wall-node-snippet">${escapeHtml(node.snippet)}</div>
            <div class="nb-wall-node-actions">
                ${node.itemId ? `<button type="button" class="nb-node-btn nb-act-inspect" data-item-id="${escapeHtml(node.itemId)}" title="Открыть документ"><i class="fa-solid fa-magnifying-glass"></i></button>` : ''}
                <button type="button" class="nb-node-btn nb-act-connect-node" data-node-id="${escapeHtml(node.id)}" title="Связать ниткой"><i class="fa-solid fa-link"></i></button>
                <button type="button" class="nb-node-btn nb-act-unpin-node" data-node-id="${escapeHtml(node.id)}" title="Убрать со стены"><i class="fa-solid fa-trash-can"></i></button>
            </div>
        </div>`;
    }

    function updateWallLinesSvg() {
        if (!rootEl) return;
        const svg = rootEl.querySelector('#nb-wall-svg');
        if (!svg) return;

        const currentCase = storage.getCurrentCase();
        const nodeMap = new Map((currentCase.nodes || []).map(n => [n.id, n]));
        const colorMap = new Map(THREAD_COLORS.map(tc => [tc.id, tc.hex]));

        const linesHtml = (currentCase.connections || []).map(conn => {
            const from = nodeMap.get(conn.fromNodeId);
            const to = nodeMap.get(conn.toNodeId);
            if (!from || !to) return '';

            const x1 = from.x + 95;
            const y1 = from.y + 10;
            const x2 = to.x + 95;
            const y2 = to.y + 10;
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2 + 18;
            const stroke = colorMap.get(conn.color) || '#c92a2a';

            return `
            <g class="nb-thread-group" data-conn-id="${escapeHtml(conn.id)}">
                <path d="M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}" stroke="rgba(0,0,0,0.45)" stroke-width="5" fill="none"/>
                <path d="M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}" stroke="${stroke}" stroke-width="3" fill="none" class="nb-thread-line" data-conn-id="${escapeHtml(conn.id)}"/>
                <circle cx="${x1}" cy="${y1}" r="5" fill="${stroke}"/>
                <circle cx="${x2}" cy="${y2}" r="5" fill="${stroke}"/>
                ${conn.label ? `
                <rect x="${mx - 65}" y="${my - 12}" width="130" height="20" rx="3" fill="#f6eedc" stroke="#4a3f35" class="nb-thread-label-box" data-conn-id="${escapeHtml(conn.id)}"/>
                <text x="${mx}" y="${my + 2}" text-anchor="middle" fill="#221c16" font-size="10" font-family="monospace">${escapeHtml(conn.label.slice(0, 20))}</text>
                ` : ''}
            </g>`;
        }).join('');

        svg.innerHTML = linesHtml;
    }


    function renderInspectorModal(currentCase, settings) {
        const item = currentCase.items.find(it => it.id === inspectedItemId);
        if (!item) return '';
        const typeInfo = ITEM_TYPES[item.type] || ITEM_TYPES.dossier;
        const isPinned = currentCase.nodes.some(n => n.itemId === item.id && !n.isSubClue);

        return `
        <div class="nb-submodal-backdrop nb-inspector-backdrop">
            <div class="nb-inspector-modal ${magnifierActive ? 'is-magnifier-active' : ''}">
                <header class="nb-inspector-topbar">
                    <div class="nb-inspector-meta">
                        <span class="nb-desk-badge"><i class="${typeInfo.icon}"></i> ${escapeHtml(typeInfo.label)}</span>
                        <strong>${escapeHtml(item.code)}</strong>
                    </div>
                    <div class="nb-inspector-tools">
                        <button type="button" class="nb-btn ${magnifierActive ? 'nb-btn-primary' : 'nb-btn-secondary'} nb-act-toggle-magnifier" title="Включить интерактивную лупу для осмотра мелких деталей">
                            <i class="fa-solid fa-magnifying-glass"></i> Лупа
                        </button>
                        <button type="button" class="nb-btn nb-btn-secondary nb-act-gen-item-image" data-item-id="${escapeHtml(item.id)}" ${isBusy ? 'disabled' : ''} title="Сгенерировать изображение/фото для этого документа через генератор картинок">
                            <i class="fa-solid fa-image"></i> Иллюстрации
                        </button>
                        <button type="button" class="nb-btn nb-btn-secondary nb-act-set-image-url" data-item-id="${escapeHtml(item.id)}" title="Указать ссылку на своё изображение">
                            <i class="fa-solid fa-link"></i> Фото URL
                        </button>
                        <button type="button" class="nb-btn ${isPinned ? 'nb-btn-primary' : 'nb-btn-secondary'} nb-act-pin" data-item-id="${escapeHtml(item.id)}">
                            <i class="fa-solid fa-thumbtack"></i> ${isPinned ? 'На стене улик' : 'Закрепить на стене'}
                        </button>
                        <button type="button" class="nb-btn nb-btn-danger nb-act-delete-item" data-item-id="${escapeHtml(item.id)}" title="Удалить этот материал из дела">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                        <button type="button" class="nb-btn nb-btn-close nb-act-close-inspector" title="Вернуться к столу">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </header>
                <div class="nb-inspector-scroll" id="nb-inspector-scroll">
                    ${renderInspectorContent(item, settings, magnifierActive)}
                    <div class="nb-inspector-notes-area">
                        <label for="nb-item-personal-notes"><i class="fa-solid fa-pen"></i> Личные пометки детектива по материалу:</label>
                        <textarea id="nb-item-personal-notes" class="nb-textarea" rows="2" data-item-id="${escapeHtml(item.id)}" placeholder="Запишите свои выводы, подозрения или несостыковки...">${escapeHtml(item.notes || '')}</textarea>
                    </div>
                    <div class="nb-magnifier-lens" id="nb-magnifier-lens"></div>
                </div>
            </div>
        </div>`;
    }

    function renderSettingsModal(currentCase, settings) {
        const profiles = listConnectionProfiles(storage.getContext);

        const profileOptions = [
            `<option value="" ${!settings.textProfileId ? 'selected' : ''}>Активное подключение SillyTavern (по умолчанию)</option>`,
            ...profiles.map(p => `<option value="${escapeHtml(p.id)}" ${settings.textProfileId === p.id ? 'selected' : ''}>${escapeHtml(p.name)}${p.model ? ` (${escapeHtml(p.model)})` : ''}</option>`),
        ].join('');

        const imageProfileOptions = [
            `<option value="" ${!settings.imageProfileId ? 'selected' : ''}>Image Generation в SillyTavern (/sd)</option>`,
            ...profiles.map(p => `<option value="${escapeHtml(p.id)}" ${settings.imageProfileId === p.id ? 'selected' : ''}>${escapeHtml(p.name)}${p.model ? ` — ${escapeHtml(p.model)}` : ''}</option>`),
        ].join('');

        const modeCardsHtml = Object.values(MODES).map(m => `
            <label class="nb-mode-option ${settings.mode === m.id ? 'is-selected' : ''}">
                <input type="radio" name="nb-setting-mode" value="${m.id}" ${settings.mode === m.id ? 'checked' : ''}>
                <div class="nb-mode-option-head">
                    <i class="${m.icon}"></i>
                    <strong>${escapeHtml(m.label)}</strong>
                </div>
                <p>${escapeHtml(m.description)}</p>
            </label>
        `).join('');

        const typesChecklistHtml = Object.values(ITEM_TYPES).map(t => `
            <label class="nb-type-check">
                <input type="checkbox" class="nb-setting-type-cb" data-type-key="${t.id}" ${settings.enabledTypes?.[t.id] !== false ? 'checked' : ''}>
                <i class="${t.icon}"></i>
                <span>${escapeHtml(t.label)}</span>
            </label>
        `).join('');

        return renderSettingsModalMarkup(settings, {
            profileOptions,
            imageProfileOptions,
            modeCardsHtml,
            typesChecklistHtml,
        });
    }

    function renderSettingsModalMarkup(settings, { profileOptions, imageProfileOptions, modeCardsHtml, typesChecklistHtml }) {
        return `
        <div class="nb-submodal-backdrop">
            <div class="nb-settings-modal">
                <header class="nb-submodal-header">
                    <h3><i class="fa-solid fa-sliders"></i> Настройки NoirBoard</h3>
                    <button type="button" class="nb-btn nb-btn-close nb-act-close-settings"><i class="fa-solid fa-xmark"></i></button>
                </header>
                <div class="nb-settings-body">
                    <section class="nb-settings-group">
                        <h4>1. Режим детективного расширения</h4>
                        <div class="nb-mode-cards">${modeCardsHtml}</div>
                    </section>

                    <section class="nb-settings-group">
                        <h4>2. Профили подключения (Connection Profiles)</h4>
                        <p class="nb-settings-hint"><i class="fa-solid fa-shield-halved"></i> Расширение использует только публичные названия профилей SillyTavern и никогда не читает и не затрагивает ваши API-ключи.</p>
                        <div class="nb-form-grid">
                            <div class="nb-field">
                                <label for="nb-set-text-profile">Профиль для генерации текста и улик:</label>
                                <select id="nb-set-text-profile" class="nb-select">${profileOptions}</select>
                            </div>
                            <div class="nb-field">
                                <label for="nb-set-image-profile">Генератор изображений:</label>
                                <select id="nb-set-image-profile" class="nb-select">${imageProfileOptions}</select>
                                <small class="nb-settings-hint">Профиль должен поддерживать вывод изображений через Chat Completions (например, совместимая Gemini image-модель). Обычная текстовая модель картинку не создаст. Ключами управляет только SillyTavern.</small>
                            </div>
                            <div class="nb-field">
                                <label for="nb-set-image-source">Откуда брать иллюстрации:</label>
                                <select id="nb-set-image-source" class="nb-select">
                                    <option value="generated" ${settings.imageSource === 'generated' ? 'selected' : ''}>Генерация ИИ</option>
                                    <option value="internet" ${settings.imageSource === 'internet' ? 'selected' : ''}>Свободные изображения из интернета</option>
                                    <option value="both" ${settings.imageSource === 'both' ? 'selected' : ''}>Оба варианта</option>
                                </select>
                                <small class="nb-settings-hint">Интернет: Wikimedia Commons, CC BY / CC BY-SA / CC0 / public domain. Внешний сервис получает короткий поисковый запрос и IP, не весь чат. Подписи с автором и лицензией сохраняются.</small>
                            </div>
                        </div>
                    </section>

                    <section class="nb-settings-group">
                        <h4>3. Параметры генерации и материалов</h4>
                        <div class="nb-form-grid">
                            <div class="nb-field">
                                <label for="nb-set-items-count">Количество материалов за одно изучение (1–10):</label>
                                <input type="number" id="nb-set-items-count" class="nb-input" min="1" max="10" value="${settings.itemsPerScan}">
                            </div>
                            <div class="nb-field">
                                <label for="nb-set-context-limit">Глубина чтения истории чата (сообщений):</label>
                                <input type="number" id="nb-set-context-limit" class="nb-input" min="3" max="150" value="${settings.contextMessagesLimit}">
                            </div>
                            <div class="nb-field">
                                <label for="nb-set-max-tokens">Макс. токенов ответа (512–8192):</label>
                                <input type="number" id="nb-set-max-tokens" class="nb-input" min="512" max="8192" step="128" value="${settings.maxResponseTokens}">
                            </div>
                            <div class="nb-field">
                                <label for="nb-set-dossier-style">Стиль оформления личных дел / досье:</label>
                                <select id="nb-set-dossier-style" class="nb-select">
                                    <option value="auto" ${settings.dossierStyle === 'auto' ? 'selected' : ''}>Автоматически (от сюжета)</option>
                                    <option value="folder" ${settings.dossierStyle === 'folder' ? 'selected' : ''}>Классическая папка с фото на скрепке</option>
                                    <option value="classified" ${settings.dossierStyle === 'classified' ? 'selected' : ''}>Строгий бланк «СЕКРЕТНОЕ ДОСЬЕ»</option>
                                </select>
                            </div>
                            <div class="nb-field">
                                <label for="nb-set-language">Язык генерируемых материалов:</label>
                                <select id="nb-set-language" class="nb-select">
                                    <option value="ru" ${settings.language === 'ru' ? 'selected' : ''}>Русский</option>
                                    <option value="en" ${settings.language === 'en' ? 'selected' : ''}>English</option>
                                    <option value="auto" ${settings.language === 'auto' ? 'selected' : ''}>По языку чата</option>
                                </select>
                            </div>
                        </div>

                        <div class="nb-toggles-row">
                            <label class="nb-type-check"><input type="checkbox" id="nb-set-auto-pin" ${settings.autoPinImportant ? 'checked' : ''}><span>Автоматически прикреплять ключевые улики на Стену связей</span></label>
                            <label class="nb-type-check"><input type="checkbox" id="nb-set-avoid-dups" ${settings.avoidDuplicates ? 'checked' : ''}><span>Не дублировать уже созданные на столе улики</span></label>
                            <label class="nb-type-check"><input type="checkbox" id="nb-set-char-bio" ${settings.includeCharDescription ? 'checked' : ''}><span>Учитывать описание и анкету персонажа</span></label>
                            <label class="nb-type-check"><input type="checkbox" id="nb-set-auto-img" ${settings.autoGenerateImages ? 'checked' : ''}><span>Автоматически подбирать иллюстрации при изучении дела</span></label>
                        </div>
                    </section>

                    <section class="nb-settings-group">
                        <h4>4. Типы создаваемых материалов</h4>
                        <div class="nb-types-grid">${typesChecklistHtml}</div>
                    </section>

                    <section class="nb-settings-group">
                        <h4>5. Дополнительные инструкции для ИИ</h4>
                        <textarea id="nb-set-custom-prompt" class="nb-textarea" rows="2" placeholder="Например: Сделай упор на нуар 1940-х годов, мафиозный клан Коза Ностра и финансовые махинации...">${escapeHtml(settings.customPromptInstructions)}</textarea>
                    </section>

                    <section class="nb-settings-group nb-settings-Archive">
                        <h4>6. Управление архивом текущего дела</h4>
                        <div class="nb-archive-btns">
                            <button type="button" class="nb-btn nb-btn-secondary nb-act-export-case"><i class="fa-solid fa-download"></i> Экспорт дела (JSON)</button>
                            <button type="button" class="nb-btn nb-btn-secondary nb-act-import-case"><i class="fa-solid fa-upload"></i> Импорт дела (JSON)</button>
                            <button type="button" class="nb-btn nb-btn-danger nb-act-reset-case"><i class="fa-solid fa-trash-can"></i> Очистить текущее дело</button>
                        </div>
                    </section>
                </div>
                <footer class="nb-submodal-footer">
                    <button type="button" class="nb-btn nb-btn-primary nb-act-save-settings"><i class="fa-solid fa-check"></i> Сохранить настройки</button>
                </footer>
            </div>
        </div>`;
    }

    function renderAddItemModal() {
        const typeOpts = Object.values(ITEM_TYPES)
            .map(t => `<option value="${t.id}">${escapeHtml(t.label)}</option>`)
            .join('');

        return `
        <div class="nb-submodal-backdrop">
            <div class="nb-settings-modal nb-add-item-modal">
                <header class="nb-submodal-header">
                    <h3><i class="fa-solid fa-file-circle-plus"></i> Добавить материал на стол</h3>
                    <button type="button" class="nb-btn nb-btn-close nb-act-close-add"><i class="fa-solid fa-xmark"></i></button>
                </header>
                <div class="nb-settings-body">
                    <div class="nb-form-grid">
                        <div class="nb-field">
                            <label for="nb-add-type">Тип материала:</label>
                            <select id="nb-add-type" class="nb-select">${typeOpts}</select>
                        </div>
                        <div class="nb-field">
                            <label for="nb-add-code">Код / Номер (например: № 0426-K или Evidence #12A):</label>
                            <input type="text" id="nb-add-code" class="nb-input" value="Evidence #${Math.floor(10 + Math.random() * 89)}A">
                        </div>
                        <div class="nb-field">
                            <label for="nb-add-title">Название / Имя фигуранта / Заголовок:</label>
                            <input type="text" id="nb-add-title" class="nb-input" placeholder="Например: Изабелла София Кинг">
                        </div>
                        <div class="nb-field">
                            <label for="nb-add-subtitle">Подзаголовок / Статус / Роль:</label>
                            <input type="text" id="nb-add-subtitle" class="nb-input" placeholder="Например: Подозреваемая / Улика с места">
                        </div>
                        <div class="nb-field">
                            <label for="nb-add-date">Дата в мире РП:</label>
                            <input type="text" id="nb-add-date" class="nb-input" placeholder="Например: 14.09.1998">
                        </div>
                        <div class="nb-field">
                            <label for="nb-add-image">Ссылка на изображение (необязательно):</label>
                            <input type="text" id="nb-add-image" class="nb-input" placeholder="https://...">
                        </div>
                    </div>
                    <div class="nb-field">
                        <label for="nb-add-content">Полный текст документа / Описание улики:</label>
                        <textarea id="nb-add-content" class="nb-textarea" rows="5" placeholder="Введите содержание досье, статьи, письма или описание вещдока..."></textarea>
                    </div>
                    <div class="nb-field">
                        <label for="nb-add-clues">Зацепки (каждая с новой строки):</label>
                        <textarea id="nb-add-clues" class="nb-textarea" rows="2" placeholder="Отпечатки на бокале\nБилет до Палермо"></textarea>
                    </div>
                </div>
                <footer class="nb-submodal-footer">
                    <button type="button" class="nb-btn nb-btn-primary nb-act-confirm-add"><i class="fa-solid fa-plus"></i> Добавить в дело</button>
                </footer>
            </div>
        </div>`;
    }


    async function handleScanCase() {
        if (isBusy) return;
        const settings = storage.getSettings();
        const currentCase = storage.getCurrentCase();
        const chatKey = storage.getCurrentChatKey();
        setBusy(true, 'ИИ изучает чат и создаёт улики...');

        try {
            const { addedItems } = await scanChatForEvidence({
                getContextFn: storage.getContext,
                settings,
                currentCase,
            });
            storage.saveCurrentCase(currentCase, chatKey);
            notify('success', `Добавлено материалов на стол: ${addedItems.length}`);

            if (settings.autoGenerateImages) {
                for (const item of addedItems) {
                    if (!['dossier', 'photo', 'newspaper', 'evidence_bag', 'map', 'fingerprints'].includes(item.type)) continue;
                    try {
                        const result = await acquireItemImages({ item, settings, getContextFn: storage.getContext });
                        item.images = result.images;
                        item.imageUrl = result.images[0].url;
                        currentCase.nodes.filter(n => n.itemId === item.id).forEach(n => { n.imageUrl = item.imageUrl; });
                        if (result.errors.length) notify('warning', result.errors.join('\n'));
                    } catch (error) { notify('warning', `${item.title}: ${error.message}`); }
                }
                storage.saveCurrentCase(currentCase, chatKey);
            }
        } catch (err) {
            console.error('[NoirBoard] Scan failed:', err);
            notify('error', err?.message || 'Ошибка при генерации материалов дела.');
        } finally {
            setBusy(false);
        }
    }

    async function handleModernSearch() {
        if (isBusy || !rootEl) return;
        const input = rootEl.querySelector('#nb-modern-search-input');
        const query = input?.value?.trim() || '';
        if (!query) {
            notify('warning', 'Введите запрос для поиска в сети / базе данных.');
            return;
        }

        const settings = storage.getSettings();
        const currentCase = storage.getCurrentCase();
        setBusy(true, 'Поиск в закрытых базах OSINT...');
        try {
            await runModernSearch({
                getContextFn: storage.getContext,
                settings,
                currentCase,
                query,
            });
            storage.saveCurrentCase(currentCase);
            notify('success', 'Результаты из базы данных получены.');
        } catch (err) {
            console.error('[NoirBoard] OSINT search failed:', err);
            notify('error', err?.message || 'Ошибка поиска.');
        } finally {
            setBusy(false);
        }
    }

    async function handleWallDeduction() {
        if (isBusy) return;
        const settings = storage.getSettings();
        const currentCase = storage.getCurrentCase();
        setBusy(true, 'Дедуктивный анализ связей...');
        try {
            await analyzeEvidenceWall({
                getContextFn: storage.getContext,
                settings,
                currentCase,
            });
            storage.saveCurrentCase(currentCase);
            notify('success', 'Дедуктивная сводка составлена!');
        } catch (err) {
            notify('error', err?.message || 'Не удалось выполнить дедукцию.');
        } finally {
            setBusy(false);
        }
    }

    function handleNodeConnectionClick(targetNodeId) {
        if (!targetNodeId) return;
        const currentCase = storage.getCurrentCase();

        if (!connectSourceNodeId) {
            connectSourceNodeId = targetNodeId;
            connectMode = true;
            render();
            return;
        }

        if (connectSourceNodeId === targetNodeId) {
            connectSourceNodeId = null;
            render();
            return;
        }

        const existingIdx = currentCase.connections.findIndex(
            c => (c.fromNodeId === connectSourceNodeId && c.toNodeId === targetNodeId)
                || (c.fromNodeId === targetNodeId && c.toNodeId === connectSourceNodeId),
        );

        if (existingIdx !== -1) {
            currentCase.connections.splice(existingIdx, 1);
            notify('info', 'Нить между уликами снята.');
        } else {
            const label = window.prompt('Подпись для связующей нити (необязательно):', '') ?? '';
            currentCase.connections.push({
                id: uid('conn'),
                fromNodeId: connectSourceNodeId,
                toNodeId: targetNodeId,
                color: selectedThreadColor,
                label: label.trim().slice(0, 80),
            });
            notify('success', 'Улики связаны нитью!');
        }

        connectSourceNodeId = null;
        storage.saveCurrentCase(currentCase);
        render();
    }


    function loadDemoCaseData() {
        const currentCase = storage.getCurrentCase();
        currentCase.title = 'Исчезновение у Трассы 9 / Клан Коза Ностра';
        currentCase.caseNumber = '№ 0426-K';
        currentCase.summary = 'Серия таинственных событий связывает исчезновение свидетеля у озера Форест, закрытое досье оперативника ОБ-17 и анонимные угрозы детективу.';

        const demoItems = [
            normalizeItem({
                type: 'dossier',
                title: 'Изабелла София Кинг',
                subtitle: 'Жена Джеймса Кинга • Фигурант дела',
                date: '20.01.2006',
                code: '№ 0426-K',
                summary: 'Владелица Школы Искусств, племянница Дона клана мафии Коза Ностра.',
                content: 'Дочь Кристофера Смитта и Камиллы Смитт. Племянница Дона. Вышла замуж в девятнадцать лет за среднего сына Дона клана мафии Козы Ностра Джеймса Кинга, после чего подарила ему дочь.\n\nПо данным наружного наблюдения, её галерея использовалась для закрытых встреч ключевых лиц семьи за два дня до инцидента на Трассе 9.',
                clues: ['Закрытая встреча в Школе Искусств за 48 часов до инцидента', 'Прямая связь с кланом Коза Ностра (Палермо)'],
                metadata: {
                    dossierType: 'folder',
                    fullName: 'Изабелла София Кинг',
                    birthDate: '20 января 2006 г.',
                    birthPlace: 'Палермо, Сицилия, Италия',
                    nationality: 'Итальянка',
                    occupation: 'Владелец Школы Искусств',
                    family: 'Муж Джеймс Кинг, дочь Эмили Кинг',
                    appearance: ['Прямые черные волосы', 'Голубые глаза', 'Светлая кожа', 'Высокая и стройная'],
                    character: ['Гордая', 'Смелая', 'Упрямая', 'Преданная семье'],
                    stamp: 'COSA NOSTRA • FAMIGLIA',
                    hiddenDetail: 'На скрепке фотографии остались микрочастицы сургуча с личной печатью Дона.',
                },
            }, 0),
            normalizeItem({
                type: 'dossier',
                title: 'Артём Воронцов (ОБ-17)',
                subtitle: 'Оперативный объект • Особый допуск',
                date: '12.08.1977',
                code: '04-781-K',
                summary: 'Специалист по контрнаблюдению и работе под прикрытием. Материалы частично засекречены.',
                content: 'Информация проверена. Дело находится под внутренним контролем архивного отдела. Распространение запрещено без письменного допуска.\n\nЗамечен в районе озера Форест в ночь исчезновения Сары Дженкинс. Скрылся на тёмном седане без номерных знаков.',
                clues: ['Шрам на правой скуле и татуировка на левом предплечье', 'Автомобиль замечен у сектора Lake Forest'],
                metadata: {
                    dossierType: 'classified',
                    fullName: 'Артём Воронцов',
                    birthDate: '12.08.1977',
                    birthPlace: 'Санкт-Петербург',
                    nationality: 'Россия',
                    heightWeight: '185 см / 84 кг',
                    occupation: 'Оперативный объект ОБ-17',
                    family: 'Вдовец (знание языков: русский, английский, немецкий)',
                    appearance: ['Шрам на правой скуле', 'Татуировка на левом предплечье', 'Следы старых ранений'],
                    character: ['Высокий уровень дисциплины', 'Сдержанность', 'Аналитический склад ума'],
                    skills: 'Тактическая подготовка, оперативное наблюдение, контрнаблюдение, работа под прикрытием.',
                    stamp: 'АРХИВНЫЙ ОТДЕЛ • СЕКРЕТНО',
                    hiddenDetail: 'Подпись начальника архивного отдела датирована задним числом.',
                },
            }, 1),
            normalizeItem({
                type: 'letter',
                title: 'Dear Detective...',
                subtitle: 'Анонимное письмо с угрозой',
                date: 'Вчера, 23:40',
                code: 'Evidence #12A',
                summary: 'Машинописное письмо, подброшенное под дверь кабинета. На углу листа — капля крови.',
                content: 'Dear Detective,\n\nyou are pretending to be so smart. Then why can\'t you figure out who I am?\nSeems like you are tapping in the dark longer than usual...\n\nOh and how is that little doctor of yours doing? I hope he didn\'t mind the gift I sent him?\n\nDO I HAVE YOUR ATTENTION NOW?\nCOME AND FIND ME. OR I WILL FIND YOU.',
                clues: ['Западающая литера "e" на печатной машинке Underwood', 'Упоминание «подарка» для доктора'],
                metadata: {
                    author: 'Неизвестный шантажист',
                    recipient: 'Ведущему детективу',
                    hiddenDetail: 'Водяной знак бумаги совпадает с бланками старой клиники у озера Форест.',
                },
            }, 2),
        ];

        demoItems.push(
            normalizeItem({
                type: 'fingerprints',
                title: 'Дактилоскопическая экспертиза #34B',
                subtitle: 'Оттиски пальцев и ладони с конверта и бокала',
                date: '14.09.1998',
                code: 'Evidence #34B',
                summary: 'Сравнительный анализ папиллярных узоров (завиток и оттиск правой ладони).',
                content: 'При обработке конверта нингидрином выявлены чёткие папиллярные линии большого и указательного пальцев, а также фрагмент ладони с характерным рубцом.\n\nСравнение с центральной картотекой показало совпадение по 14 точкам минуций с фигурантом закрытого реестра.',
                clues: ['Поперечный шрам через линию жизни на правой ладони'],
                metadata: {
                    fingerprintPattern: 'palm',
                    matchPercent: '96.2% (СОВПАДЕНИЕ)',
                    surfaceFound: 'Конверт письма угрозы и дверная ручка ангара',
                    hiddenDetail: 'В порах отпечатка обнаружены следы оружейного масла и морской соли.',
                },
            }, 3),
            normalizeItem({
                type: 'newspaper',
                title: 'VANISHED NEAR ROUTE 9: NO LEADS',
                subtitle: 'Экстренный выпуск криминальной хроники',
                date: '15.09.1998',
                code: 'PRESS #09',
                summary: 'Репортаж о загадочном исчезновении на шоссе 9 возле озера Форест.',
                content: 'Поисковые отряды продолжают прочёсывать лесной массив вокруг озера Форест после того, как вчера вечером на обочине Трассы 9 был обнаружен пустой автомобиль со включёнными фарами.\n\nСвидетели сообщают о странном свечении со стороны старого лодочного ангара за полчаса до полуночи.',
                clues: ['Брошенный автомобиль на обочине Route 9', 'Свет у заброшенного ангара в 23:30'],
                metadata: {
                    newspaperName: 'LITERATURA Y PERIODISMO • CRÓNICA',
                    headline: 'SEARCH CONTINUES — VANISHED NEAR ROUTE 9',
                    subheadline: 'Полиция не комментирует найденные у старого ангара следы',
                    author: 'Габриэль Энтвистл',
                    hiddenDetail: 'На фото ангара в углу кадра виден силуэт человека в плаще.',
                },
            }, 4),
            normalizeItem({
                type: 'map',
                title: 'Схема сектора Highway 9 & Lake Forest',
                subtitle: 'Оперативная карта с отметками патруля',
                date: '14.09.1998',
                code: 'MAP #77C',
                summary: 'Топографическая карта района исчезновения с нанесёнными красным маркером зонами поиска.',
                content: 'На карте отмечены три ключевые точки: место обнаружения брошенной машины на Трассе 9, развилка Route 79 и старый деревянный ангар на восточном берегу озера Форест.',
                clues: ['Координаты тайника: 34.0522 N, -118.2437 W'],
                metadata: {
                    coordinates: '34.0522 N, -118.2437 W',
                    locations: ['HIGHWAY 9 — Брошенный автомобиль', 'ROUTE 79 — Дорожный пост', 'LAKE FOREST — Заброшенный ангар'],
                    hiddenDetail: 'На обратной стороне карты карандашом записан код от замка ангара: 4891.',
                },
            }, 5),
        );

        currentCase.items = demoItems;
        currentCase.nodes = [];
        currentCase.connections = [];

        const n0 = pinItemToCaseWall(currentCase, demoItems[0]);
        const n1 = pinItemToCaseWall(currentCase, demoItems[1]);
        const n2 = pinItemToCaseWall(currentCase, demoItems[2]);
        const n3 = pinItemToCaseWall(currentCase, demoItems[3]);
        const n5 = pinItemToCaseWall(currentCase, demoItems[5]);

        if (n0 && n2) {
            currentCase.connections.push({ id: uid('conn'), fromNodeId: n0.id, toNodeId: n2.id, color: 'red', label: 'Мотив шантажа' });
        }
        if (n1 && n5) {
            currentCase.connections.push({ id: uid('conn'), fromNodeId: n1.id, toNodeId: n5.id, color: 'yellow', label: 'Замечен у озера' });
        }
        if (n2 && n3) {
            currentCase.connections.push({ id: uid('conn'), fromNodeId: n2.id, toNodeId: n3.id, color: 'blue', label: 'Отпечаток на конверте' });
        }

        storage.saveCurrentCase(currentCase);
        notify('success', 'Демонстрационное дело загружено! Откройте материалы или перейдите на Стену связей.');
        render();
    }


    function saveSettingsFromModal() {
        if (!rootEl) return;
        const settings = storage.getSettings();

        const selectedMode = rootEl.querySelector('input[name="nb-setting-mode"]:checked')?.value;
        if (selectedMode && MODES[selectedMode]) {
            settings.mode = selectedMode;
        }

        settings.textProfileId = rootEl.querySelector('#nb-set-text-profile')?.value || '';
        settings.imageProfileId = rootEl.querySelector('#nb-set-image-profile')?.value || '';
        settings.imageSource = rootEl.querySelector('#nb-set-image-source')?.value || 'generated';
        settings.itemsPerScan = Math.max(1, Math.min(10, Number(rootEl.querySelector('#nb-set-items-count')?.value) || 4));
        settings.contextMessagesLimit = Math.max(3, Math.min(150, Number(rootEl.querySelector('#nb-set-context-limit')?.value) || 25));
        settings.maxResponseTokens = Math.max(512, Math.min(8192, Number(rootEl.querySelector('#nb-set-max-tokens')?.value) || 2800));
        settings.dossierStyle = rootEl.querySelector('#nb-set-dossier-style')?.value || 'auto';
        settings.language = rootEl.querySelector('#nb-set-language')?.value || 'ru';

        settings.autoPinImportant = Boolean(rootEl.querySelector('#nb-set-auto-pin')?.checked);
        settings.avoidDuplicates = Boolean(rootEl.querySelector('#nb-set-avoid-dups')?.checked);
        settings.includeCharDescription = Boolean(rootEl.querySelector('#nb-set-char-bio')?.checked);
        settings.autoGenerateImages = Boolean(rootEl.querySelector('#nb-set-auto-img')?.checked);
        settings.customPromptInstructions = rootEl.querySelector('#nb-set-custom-prompt')?.value || '';

        rootEl.querySelectorAll('.nb-setting-type-cb').forEach(cb => {
            const key = cb.getAttribute('data-type-key');
            if (key) settings.enabledTypes[key] = Boolean(cb.checked);
        });

        storage.saveSettings();
        isSettingsOpen = false;
        notify('success', 'Настройки NoirBoard сохранены.');
        render();
    }

    function confirmAddManualItem() {
        if (!rootEl) return;
        const type = rootEl.querySelector('#nb-add-type')?.value || 'dossier';
        const code = rootEl.querySelector('#nb-add-code')?.value?.trim() || 'Evidence #01A';
        const title = rootEl.querySelector('#nb-add-title')?.value?.trim() || '';
        const subtitle = rootEl.querySelector('#nb-add-subtitle')?.value?.trim() || '';
        const date = rootEl.querySelector('#nb-add-date')?.value?.trim() || '';
        const imageUrl = rootEl.querySelector('#nb-add-image')?.value?.trim() || '';
        const content = rootEl.querySelector('#nb-add-content')?.value?.trim() || '';
        const cluesRaw = rootEl.querySelector('#nb-add-clues')?.value || '';

        if (!title) {
            notify('warning', 'Укажите название или заголовок материала.');
            return;
        }

        const currentCase = storage.getCurrentCase();
        const item = normalizeItem({
            type,
            code,
            title,
            subtitle,
            date,
            imageUrl,
            content: content || title,
            summary: content.slice(0, 150) || subtitle || title,
            clues: cluesRaw.split('\n').map(s => s.trim()).filter(Boolean),
        }, currentCase.items.length);

        currentCase.items.unshift(item);
        pinItemToCaseWall(currentCase, item);
        storage.saveCurrentCase(currentCase);

        isAddModalOpen = false;
        notify('success', `Материал «${item.title}» добавлен в дело!`);
        render();
    }

    function exportCurrentCaseJson() {
        const currentCase = storage.getCurrentCase();
        const blob = new Blob([JSON.stringify(currentCase, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `noirboard-case-${currentCase.caseNumber.replace(/[^a-zA-Z0-9_-]/g, '') || 'export'}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        notify('success', 'Файл дела экспортирован.');
    }

    function importCurrentCaseJson() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.addEventListener('change', async () => {
            const file = input.files?.[0];
            if (!file) return;
            try {
                const text = await file.text();
                const parsed = JSON.parse(text);
                const normalized = normalizeCase(parsed);
                storage.saveCurrentCase(normalized);
                isSettingsOpen = false;
                notify('success', `Импортировано дело «${normalized.title}»!`);
                render();
            } catch {
                notify('error', 'Не удалось прочитать JSON-файл дела.');
            }
        });
        input.click();
    }

    function bindGlobalEvents() {
        if (!rootEl) return;

        rootEl.addEventListener('click', async e => {
            const target = e.target;
            if (!(target instanceof Element)) return;

            if (target === rootEl || target.closest('.nb-act-close')) {
                close();
                return;
            }

            const tabBtn = target.closest('[data-nb-tab]');
            if (tabBtn) {
                activeTab = tabBtn.getAttribute('data-nb-tab') || 'desk';
                connectSourceNodeId = null;
                render();
                return;
            }

            const filterChip = target.closest('[data-filter-type]');
            if (filterChip) {
                activeTypeFilter = filterChip.getAttribute('data-filter-type') || 'all';
                render();
                return;
            }

            if (target.closest('.nb-case-title')) {
                const currentCase = storage.getCurrentCase();
                const nextTitle = window.prompt('Название расследования / дела:', currentCase.title);
                if (nextTitle && nextTitle.trim()) {
                    currentCase.title = nextTitle.trim();
                    storage.saveCurrentCase(currentCase);
                    render();
                }
                return;
            }

            if (target.closest('.nb-act-scan')) {
                await handleScanCase();
                return;
            }

            if (target.closest('.nb-act-load-demo')) {
                loadDemoCaseData();
                return;
            }

            if (target.closest('.nb-act-open-settings')) {
                isSettingsOpen = true;
                render();
                return;
            }

            if (target.closest('.nb-act-close-settings')) {
                isSettingsOpen = false;
                render();
                return;
            }

            if (target.closest('.nb-act-save-settings')) {
                saveSettingsFromModal();
                return;
            }

            if (target.closest('.nb-act-open-add')) {
                isAddModalOpen = true;
                render();
                return;
            }

            if (target.closest('.nb-act-close-add')) {
                isAddModalOpen = false;
                render();
                return;
            }

            if (target.closest('.nb-act-confirm-add')) {
                confirmAddManualItem();
                return;
            }

            if (target.closest('.nb-act-export-case')) {
                exportCurrentCaseJson();
                return;
            }

            if (target.closest('.nb-act-import-case')) {
                importCurrentCaseJson();
                return;
            }

            if (target.closest('.nb-act-reset-case')) {
                if (window.confirm('Очистить все материалы и стену улик для текущего чата?')) {
                    const fresh = createEmptyCase(`Дело: ${storage.getCurrentCharacterName()}`);
                    storage.saveCurrentCase(fresh);
                    isSettingsOpen = false;
                    inspectedItemId = null;
                    notify('info', 'Текущее дело очищено.');
                    render();
                }
                return;
            }

            await handleSecondaryClickActions(target);
        });
    }

    async function handleSecondaryClickActions(target) {
        if (target.closest('.nb-act-modern-search')) {
            await handleModernSearch();
            return;
        }

        const saveSearchBtn = target.closest('.nb-act-save-search-item');
        if (saveSearchBtn) {
            const searchId = saveSearchBtn.getAttribute('data-search-id');
            const currentCase = storage.getCurrentCase();
            const rec = (currentCase.searchHistory || []).find(s => s.id === searchId);
            if (rec?.generatedItem) {
                const item = normalizeItem(rec.generatedItem, currentCase.items.length);
                currentCase.items.unshift(item);
                pinItemToCaseWall(currentCase, item);
                storage.saveCurrentCase(currentCase);
                notify('success', 'Выписка из базы данных сохранена на стол и стену улик!');
                render();
            }
            return;
        }

        const inspectBtn = target.closest('.nb-act-inspect');
        if (inspectBtn) {
            inspectedItemId = inspectBtn.getAttribute('data-item-id');
            magnifierActive = false;
            render();
            return;
        }

        if (target.closest('.nb-act-close-inspector') || target.classList.contains('nb-inspector-backdrop')) {
            inspectedItemId = null;
            magnifierActive = false;
            render();
            return;
        }

        if (target.closest('.nb-act-toggle-magnifier')) {
            magnifierActive = !magnifierActive;
            render();
            return;
        }

        const pinBtn = target.closest('.nb-act-pin');
        if (pinBtn) {
            const itemId = pinBtn.getAttribute('data-item-id');
            const currentCase = storage.getCurrentCase();
            const item = currentCase.items.find(i => i.id === itemId);
            if (item) {
                const existingIdx = currentCase.nodes.findIndex(n => n.itemId === item.id && !n.isSubClue);
                if (existingIdx !== -1) {
                    const removed = currentCase.nodes.splice(existingIdx, 1)[0];
                    currentCase.connections = currentCase.connections.filter(
                        c => c.fromNodeId !== removed.id && c.toNodeId !== removed.id,
                    );
                    notify('info', 'Улика снята со Стены связей.');
                } else {
                    pinItemToCaseWall(currentCase, item);
                    notify('success', 'Улика закреплена на Стене связей!');
                }
                storage.saveCurrentCase(currentCase);
                render();
            }
            return;
        }

        const clueChip = target.closest('.nb-clue-chip');
        if (clueChip) {
            const itemId = clueChip.getAttribute('data-item-id');
            const clueIdx = Number(clueChip.getAttribute('data-clue-index'));
            const currentCase = storage.getCurrentCase();
            const item = currentCase.items.find(i => i.id === itemId);
            const clueText = item?.clues?.[clueIdx];
            if (item && clueText) {
                pinItemToCaseWall(currentCase, item, clueText);
                storage.saveCurrentCase(currentCase);
                notify('success', `Зацепка «${clueText.slice(0, 40)}...» вынесена на Стену связей!`);
            }
            return;
        }

        await handleItemAndWallActions(target);
    }


    async function handleItemAndWallActions(target) {
        const imageChoice = target.closest('.nb-image-choice');
        if (imageChoice) {
            const currentCase = storage.getCurrentCase();
            const item = currentCase.items.find(i => i.id === imageChoice.dataset.itemId);
            const image = item?.images?.[Number(imageChoice.dataset.imageIndex)];
            if (image) {
                item.imageUrl = image.url;
                currentCase.nodes.filter(n => n.itemId === item.id).forEach(n => { n.imageUrl = image.url; });
                storage.saveCurrentCase(currentCase);
                render();
            }
            return;
        }
        const genImgBtn = target.closest('.nb-act-gen-item-image');
        if (genImgBtn) {
            if (isBusy) return;
            const itemId = genImgBtn.getAttribute('data-item-id');
            const currentCase = storage.getCurrentCase();
            const chatKey = storage.getCurrentChatKey();
            const item = currentCase.items.find(i => i.id === itemId);
            if (item) {
                const settings = storage.getSettings();
                if (settings.imageSource !== 'generated') {
                    const query = window.prompt('Запрос в Wikimedia Commons (только эта фраза уйдёт в интернет):', item.imageSearchQuery || item.title);
                    if (query === null) return;
                    item.imageSearchQuery = query.trim().slice(0, 180);
                }
                setBusy(true, 'Подбираем иллюстрации...');
                try {
                    const result = await acquireItemImages({ item, settings, getContextFn: storage.getContext });
                    if (result.images.length) {
                        item.images = [...result.images, ...(item.images || [])].slice(0, 12);
                        item.imageUrl = result.images[0].url;
                        currentCase.nodes.forEach(n => {
                            if (n.itemId === item.id) n.imageUrl = item.imageUrl;
                        });
                        storage.saveCurrentCase(currentCase, chatKey);
                        notify('success', 'Иллюстрации добавлены. Выберите нужную внизу документа.');
                        if (result.errors.length) notify('warning', result.errors.join('\n'));
                    }
                } catch (error) {
                    notify('error', error.message || 'Не удалось получить изображение.');
                } finally {
                    setBusy(false);
                }
            }
            return;
        }

        const setUrlBtn = target.closest('.nb-act-set-image-url');
        if (setUrlBtn) {
            const itemId = setUrlBtn.getAttribute('data-item-id');
            const currentCase = storage.getCurrentCase();
            const item = currentCase.items.find(i => i.id === itemId);
            if (item) {
                const nextUrl = window.prompt('Укажите URL изображения для этого документа/улики:', item.imageUrl || '');
                if (nextUrl !== null) {
                    item.imageUrl = nextUrl.trim();
                    currentCase.nodes.forEach(n => {
                        if (n.itemId === item.id) n.imageUrl = item.imageUrl;
                    });
                    storage.saveCurrentCase(currentCase);
                    render();
                }
            }
            return;
        }

        const delItemBtn = target.closest('.nb-act-delete-item');
        if (delItemBtn) {
            const itemId = delItemBtn.getAttribute('data-item-id');
            const currentCase = storage.getCurrentCase();
            currentCase.items = currentCase.items.filter(i => i.id !== itemId);
            const removedNodeIds = new Set(currentCase.nodes.filter(n => n.itemId === itemId).map(n => n.id));
            currentCase.nodes = currentCase.nodes.filter(n => n.itemId !== itemId);
            currentCase.connections = currentCase.connections.filter(
                c => !removedNodeIds.has(c.fromNodeId) && !removedNodeIds.has(c.toNodeId),
            );
            inspectedItemId = null;
            storage.saveCurrentCase(currentCase);
            notify('info', 'Материал удалён из дела.');
            render();
            return;
        }

        await handleWallOnlyActions(target);
    }

    async function handleWallOnlyActions(target) {
        if (target.closest('.nb-act-toggle-connect')) {
            connectMode = !connectMode;
            connectSourceNodeId = null;
            render();
            return;
        }

        const threadColorBtn = target.closest('[data-thread-color]');
        if (threadColorBtn) {
            selectedThreadColor = threadColorBtn.getAttribute('data-thread-color') || 'red';
            render();
            return;
        }

        const connectNodeBtn = target.closest('.nb-act-connect-node') || target.closest('[data-pin-node-id]');
        if (connectNodeBtn) {
            const nodeId = connectNodeBtn.getAttribute('data-node-id') || connectNodeBtn.getAttribute('data-pin-node-id');
            handleNodeConnectionClick(nodeId);
            return;
        }

        const unpinNodeBtn = target.closest('.nb-act-unpin-node');
        if (unpinNodeBtn) {
            const nodeId = unpinNodeBtn.getAttribute('data-node-id');
            const currentCase = storage.getCurrentCase();
            currentCase.nodes = currentCase.nodes.filter(n => n.id !== nodeId);
            currentCase.connections = currentCase.connections.filter(
                c => c.fromNodeId !== nodeId && c.toNodeId !== nodeId,
            );
            storage.saveCurrentCase(currentCase);
            render();
            return;
        }

        if (target.closest('.nb-act-add-wall-note')) {
            const title = window.prompt('Заголовок стикера / заметки на стене:', 'Гипотеза детектива');
            if (!title || !title.trim()) return;
            const snippet = window.prompt('Текст заметки / координаты / версия:', '') || '';
            const currentCase = storage.getCurrentCase();
            currentCase.nodes.push({
                id: uid('node'),
                itemId: '',
                type: 'letter',
                title: title.trim(),
                subtitle: 'ЗАМЕТКА ДЕТЕКТИВА',
                snippet: snippet.trim(),
                tag: `NOTE #${currentCase.nodes.length + 1}`,
                imageUrl: '',
                x: 160 + (currentCase.nodes.length % 5) * 180,
                y: 120 + (currentCase.nodes.length % 4) * 140,
                note: '',
                isSubClue: true,
            });
            storage.saveCurrentCase(currentCase);
            render();
            return;
        }

        if (target.closest('.nb-act-wall-deduce')) {
            await handleWallDeduction();
            return;
        }

        if (target.closest('.nb-act-close-deduction')) {
            const currentCase = storage.getCurrentCase();
            currentCase.deduction = '';
            storage.saveCurrentCase(currentCase);
            render();
            return;
        }

        if (target.closest('.nb-act-clear-threads')) {
            const currentCase = storage.getCurrentCase();
            currentCase.connections = [];
            storage.saveCurrentCase(currentCase);
            render();
        }
    }

    document.addEventListener('pointerdown', e => {
        if (!isOpen || !rootEl || activeTab !== 'wall' || isSettingsOpen || inspectedItemId || e.button !== 0) return;
        const target = e.target;
        if (!(target instanceof Element)) return;
        if (target.closest('button') || target.closest('[data-pin-node-id]')) return;

        const nodeEl = target.closest('.nb-wall-node');
        if (!nodeEl) return;

        const nodeId = nodeEl.getAttribute('data-node-id');
        if (!nodeId) return;

        if (connectMode) {
            handleNodeConnectionClick(nodeId);
            return;
        }

        const board = rootEl.querySelector('#nb-wall-board');
        if (!board) return;
        const boardRect = board.getBoundingClientRect();

        draggingNodeId = nodeId;
        if (nodeEl.hasPointerCapture && e.isTrusted) nodeEl.setPointerCapture(e.pointerId);
        e.preventDefault();
        dragOffsetX = e.clientX - boardRect.left - nodeEl.offsetLeft;
        dragOffsetY = e.clientY - boardRect.top - nodeEl.offsetTop;
        nodeEl.classList.add('is-dragging');
    });

    document.addEventListener('pointermove', e => {
        if (!isOpen || !rootEl) return;

        if (magnifierActive && inspectedItemId) {
            const scrollArea = rootEl.querySelector('#nb-inspector-scroll');
            const lens = rootEl.querySelector('#nb-magnifier-lens');
            if (scrollArea && lens) {
                const rect = scrollArea.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top + scrollArea.scrollTop;
                lens.style.left = `${x - 75}px`;
                lens.style.top = `${y - 75}px`;
            }
        }

        if (!draggingNodeId) return;
        const board = rootEl.querySelector('#nb-wall-board');
        const nodeEl = rootEl.querySelector(`.nb-wall-node[data-node-id="${draggingNodeId}"]`);
        if (!board || !nodeEl) return;

        const boardRect = board.getBoundingClientRect();
        const nextX = Math.max(10, Math.min(2180, Math.round(e.clientX - boardRect.left - dragOffsetX)));
        const nextY = Math.max(10, Math.min(1420, Math.round(e.clientY - boardRect.top - dragOffsetY)));

        nodeEl.style.left = `${nextX}px`;
        nodeEl.style.top = `${nextY}px`;

        const currentCase = storage.getCurrentCase();
        const node = currentCase.nodes.find(n => n.id === draggingNodeId);
        if (node) {
            node.x = nextX;
            node.y = nextY;
            updateWallLinesSvg();
        }
    });

    function finishNodeDrag() {
        if (!draggingNodeId) return;
        if (rootEl) {
            rootEl.querySelectorAll('.nb-wall-node.is-dragging').forEach(el => el.classList.remove('is-dragging'));
        }
        draggingNodeId = null;
        storage.saveSettings();
    }
    document.addEventListener('pointerup', finishNodeDrag);
    document.addEventListener('pointercancel', finishNodeDrag);

    document.addEventListener('keydown', e => {
        if (!isOpen || e.key !== 'Escape') return;
        e.preventDefault();
        if (isSettingsOpen) isSettingsOpen = false;
        else if (isAddModalOpen) isAddModalOpen = false;
        else if (inspectedItemId) inspectedItemId = null;
        else { close(); return; }
        render();
    });

    document.addEventListener('input', e => {
        if (!isOpen || !rootEl) return;
        const target = e.target;
        if (target instanceof HTMLTextAreaElement && target.id === 'nb-item-personal-notes') {
            const itemId = target.getAttribute('data-item-id');
            const currentCase = storage.getCurrentCase();
            const item = currentCase.items.find(i => i.id === itemId);
            if (item) {
                item.notes = target.value;
                storage.saveSettings();
            }
        }
    });

    return {
        open,
        close,
        toggle,
        render,
        openSettings() {
            ensureRootModal();
            isOpen = true;
            isSettingsOpen = true;
            rootEl.classList.remove('nb-hidden');
            render();
        },
    };
}

/* ═══ index.js ═══ */
const WAND_BUTTON_ID = 'noirboard_wand_button';
const EXT_SETTINGS_ID = 'noirboard_extension_settings_card';

function initNoirBoard() {
    const storage = createStorageManager(() => globalThis.SillyTavern?.getContext?.() || {});
    const ui = createNoirBoardUI({ storage });

    mountWandMenuButton(ui);
    mountExtensionSettingsCard(storage, ui);
    registerSlashCommands(ui);
    bindTavernEvents(ui);

    console.log('[NoirBoard] Detective Desk & Evidence Wall initialized.');
}

function mountWandMenuButton(ui) {
    if (document.getElementById(WAND_BUTTON_ID)) return;

    const extensionsMenu = document.getElementById('extensionsMenu');
    if (!extensionsMenu) {
        setTimeout(() => mountWandMenuButton(ui), 1000);
        return;
    }

    const item = document.createElement('div');
    item.id = WAND_BUTTON_ID;
    item.className = 'list-group-item flex-container flexGap5 interactable';
    item.tabIndex = 0;
    item.title = 'Открыть Стол детектива и Стену связи улик (NoirBoard)';
    item.innerHTML = `
        <div class="fa-solid fa-user-secret extensionsMenuExtensionButton"></div>
        <span>NoirBoard — Стол детектива</span>
    `;

    item.addEventListener('click', () => {
        ui.open();
    });

    extensionsMenu.appendChild(item);
}

function mountExtensionSettingsCard(storage, ui) {
    if (document.getElementById(EXT_SETTINGS_ID)) return;

    const container = document.getElementById('extensions_settings2') || document.getElementById('extensions_settings');
    if (!container) {
        setTimeout(() => mountExtensionSettingsCard(storage, ui), 1000);
        return;
    }

    const settings = storage.getSettings();
    const modeInfo = MODES[settings.mode] || MODES.standard;

    const wrapper = document.createElement('div');
    wrapper.id = EXT_SETTINGS_ID;
    wrapper.className = 'extension_container';
    wrapper.innerHTML = `
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>NoirBoard — Стол детектива и Стена улик</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <div class="nb-ext-panel-box">
                    <p class="nb-ext-panel-desc">
                        Интерактивная сеть для детективных ролевых игр: папки с личными делами, секретные досье, газеты, дактилоскопия, вещдоки, письма и Стена связи улик с нитями.
                    </p>
                    <div class="nb-ext-panel-status">
                        Режим: <strong id="nb-ext-current-mode">${modeInfo.label}</strong>
                    </div>
                    <div class="nb-ext-panel-actions">
                        <button type="button" class="menu_button interactable" id="nb-ext-open-desk">
                            <i class="fa-solid fa-folder-tree"></i> Стол детектива
                        </button>
                        <button type="button" class="menu_button interactable" id="nb-ext-open-wall">
                            <i class="fa-solid fa-thumbtack"></i> Стена улик
                        </button>
                        <button type="button" class="menu_button interactable" id="nb-ext-open-settings">
                            <i class="fa-solid fa-gear"></i> Настройки
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.appendChild(wrapper);

    wrapper.querySelector('#nb-ext-open-desk')?.addEventListener('click', () => ui.open('desk'));
    wrapper.querySelector('#nb-ext-open-wall')?.addEventListener('click', () => ui.open('wall'));
    wrapper.querySelector('#nb-ext-open-settings')?.addEventListener('click', () => ui.openSettings());
}

function registerSlashCommands(ui) {
    const ctx = globalThis.SillyTavern?.getContext?.() || {};
    const parser = ctx.SlashCommandParser;
    const cmdClass = ctx.SlashCommand;

    if (parser && cmdClass && typeof parser.addCommandObject === 'function') {
        try {
            parser.addCommandObject(cmdClass.fromProps({
                name: 'noirboard',
                aliases: ['detective', 'caseboard'],
                helpString: 'Открыть NoirBoard (desk — стол детектива, wall — стена улик, settings — настройки)',
                callback: (_args, value) => {
                    const arg = String(value || '').trim().toLowerCase();
                    if (arg === 'wall') ui.open('wall');
                    else if (arg === 'settings') ui.openSettings();
                    else ui.open('desk');
                    return '';
                },
            }));
        } catch (err) {
            console.warn('[NoirBoard] Could not register slash command:', err);
        }
    }
}

function bindTavernEvents(ui) {
    const ctx = globalThis.SillyTavern?.getContext?.() || {};
    const { eventSource, event_types } = ctx;
    if (eventSource && event_types?.CHAT_CHANGED) {
        eventSource.on(event_types.CHAT_CHANGED, () => {
            ui.render();
        });
    }
}

if (typeof jQuery !== 'undefined') {
    jQuery(initNoirBoard);
} else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNoirBoard);
} else {
    initNoirBoard();
}
