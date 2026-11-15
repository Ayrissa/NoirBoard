import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, '.browser-check');
mkdirSync(output, { recursive: true });
const browser = process.env.NOIRBOARD_BROWSER || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
if (!existsSync(browser)) throw Error('Set NOIRBOARD_BROWSER to a Chromium browser executable.');
const source = readFileSync(path.join(root, 'index.js'), 'utf8');
const css = readFileSync(path.join(root, 'style.css'), 'utf8');

function browserTests(mode, view, viewportWidth, viewportHeight) {
    const results = [];
    const check = (name, condition) => { results.push({ name, pass: Boolean(condition) }); };
    const click = selector => {
        const element = document.querySelector(selector);
        if (!element) throw Error(`Missing ${selector}`);
        element.click();
    };
    const fits = element => {
        const rect = element.getBoundingClientRect();
        return rect.left >= -1 && rect.right <= viewportWidth + 1 && rect.top >= -1 && rect.bottom <= viewportHeight + 1;
    };
    try {
        const ctx = { extensionSettings: {}, characterId: 0, characters: [{ avatar: 'test.png', name: 'Detective' }], chatId: 'test', saveSettingsDebounced() {} };
        const storage = createStorageManager(() => ctx);
        storage.getSettings().mode = mode;
        const ui = createNoirBoardUI({ storage });
        ui.open();
        click('.nb-act-load-demo');
        check('desk grid is active', getComputedStyle(document.querySelector('.nb-desk-grid')).display === 'grid');
        check('main window fits viewport', fits(document.querySelector('.nb-window')));
        check('desk has no horizontal overflow', document.querySelector('.nb-desk-surface').scrollWidth <= document.querySelector('.nb-desk-surface').clientWidth + 1);
        const current = storage.getCurrentCase();
        for (const type of Object.keys(ITEM_TYPES)) {
            if (!current.items.some(item => item.type === type)) current.items.push(normalizeItem({ type, title: 'Материал расследования', content: 'Первый абзац.\n\nВторой абзац.\n\nТретий абзац.', metadata: {} }));
        }
        storage.saveCurrentCase(current);
        ui.render();
        for (const type of Object.keys(ITEM_TYPES)) {
            click(`.nb-desk-card--${type} .nb-act-inspect`);
            const scroll = document.querySelector('.nb-inspector-scroll');
            check(`${type}: inspector fits`, fits(document.querySelector('.nb-inspector-modal')));
            check(`${type}: no horizontal overflow`, scroll.scrollWidth <= scroll.clientWidth + 1);
            if (scroll.scrollWidth > scroll.clientWidth + 1) {
                const edge = scroll.getBoundingClientRect().right;
                results.push({ name: `Overflow details ${type}: ${[...scroll.querySelectorAll('*')].filter(el => el.getBoundingClientRect().right > edge).map(el => `${el.className.baseVal ?? el.className}:${Math.round(el.getBoundingClientRect().right - edge)}`).slice(0, 12).join(', ')}`, pass: false });
            }
            click('.nb-act-close-inspector');
        }
        click('.nb-desk-card--dossier .nb-act-inspect');
        check('hidden detail absent without magnifier', !document.querySelector('.nb-hidden-clue-spot'));
        click('.nb-act-toggle-magnifier');
        check('hidden detail revealed with magnifier', Boolean(document.querySelector('.nb-hidden-clue-spot')));
        click('.nb-act-toggle-magnifier');
        check('hidden detail removed after disabling magnifier', !document.querySelector('.nb-hidden-clue-spot'));
        const paperColor = getComputedStyle(document.querySelector('.nb-doc-folder')).backgroundColor;
        check('document uses complete theme palette', paperColor === ({ standard: 'rgb(229, 208, 167)', modern: 'rgb(16, 44, 71)', supernatural: 'rgb(211, 188, 223)' })[mode]);
        click('.nb-act-close-inspector');
        click('.nb-act-open-settings');
        const body = document.querySelector('.nb-settings-body');
        check('settings fits viewport', fits(document.querySelector('.nb-settings-modal')));
        check('settings no horizontal overflow', body.scrollWidth <= body.clientWidth + 1);
        check('settings scrolls', getComputedStyle(body).overflowY === 'auto');
        click('.nb-act-close-settings');
        click('[data-nb-tab="wall"]');
        check('wall scroll container fits', fits(document.querySelector('.nb-wall-board-wrap')));
        check('wall has threads', document.querySelectorAll('.nb-thread-line').length > 0);
        check('touch dragging enabled', getComputedStyle(document.querySelector('.nb-wall-node')).touchAction === 'none');
        const before = storage.getCurrentCase().nodes[0];
        const nodeId = before.id;
        const startX = before.x, startY = before.y;
        const element = [...document.querySelectorAll('.nb-wall-node')].find(el => el.dataset.nodeId === nodeId);
        const rect = element.getBoundingClientRect();
        element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerId: 1, clientX: rect.left + 30, clientY: rect.top + 30 }));
        document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: rect.left + 110, clientY: rect.top + 90 }));
        document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
        const moved = storage.getCurrentCase().nodes.find(n => n.id === nodeId);
        check('pointer drag changes stored coordinates', moved.x === startX + 80 && moved.y === startY + 60);
        ui.close(); ui.open('wall');
        const restored = [...document.querySelectorAll('.nb-wall-node')].find(el => el.dataset.nodeId === nodeId);
        check('drag survives reopening board', parseInt(restored.style.left) === startX + 80);
        if (view !== 'wall') {
            click('[data-nb-tab="desk"]');
            if (view === 'settings') click('.nb-act-open-settings');
            if (view === 'document') click('.nb-desk-card--dossier .nb-act-inspect');
            if (view === 'prints') click('.nb-desk-card--fingerprints .nb-act-inspect');
            if (view === 'map') click('.nb-desk-card--map .nb-act-inspect');
        }
    } catch (error) { results.push({ name: error.message, pass: false }); }
    document.body.dataset.testResults = JSON.stringify(results);
}

const scenarios = [
    ['desktop-desk', 1440, 1000, 'standard', 'desk'],
    ['phone-desk', 390, 844, 'standard', 'desk'],
    ['phone-settings', 360, 800, 'standard', 'settings'],
    ['desktop-document', 1440, 1000, 'standard', 'document'],
    ['phone-modern', 390, 844, 'modern', 'desk'],
    ['desktop-wall', 1440, 1000, 'supernatural', 'wall'],
    ['desktop-modern-document', 1440, 1000, 'modern', 'document'],
    ['desktop-mystic', 1440, 1000, 'supernatural', 'desk'],
    ['phone-mystic-document', 390, 844, 'supernatural', 'document'],
    ['desktop-prints', 1440, 1000, 'standard', 'prints'],
    ['desktop-map', 1440, 1000, 'standard', 'map'],
];
let failures = 0;
for (const [name, width, height, mode, view] of scenarios) {
    // Desktop headless Edge imposes a minimum layout viewport wider than its screenshot.
    // Constrain the containing overlay too, so mobile layout checks use the requested width.
    const html = `<!doctype html><html lang="ru"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:#111} ${css}\n#noirboard-modal-overlay{width:${width}px;height:${height}px;right:auto;bottom:auto}</style><body><script>window.jQuery=()=>{};${source.replace(/<\/script/gi, '<\\/script')}\n(${browserTests.toString()})(${JSON.stringify(mode)},${JSON.stringify(view)},${width},${height});</script></body></html>`;
    const page = path.join(output, `${name}.html`);
    writeFileSync(page, html);
    const run = spawnSync(browser, ['--headless', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--force-device-scale-factor=1', `--user-data-dir=${path.join(output, 'profile')}`, `--window-size=${width},${height}`, '--dump-dom', `--screenshot=${path.join(output, `${name}.png`)}`, pathToFileURL(page).href], { encoding: 'utf8', timeout: 60000, maxBuffer: 4 * 1024 * 1024 });
    writeFileSync(path.join(output, `${name}.dom.html`), run.stdout || '');
    const match = run.stdout?.match(/data-test-results="([^"]*)"/);
    if (!match) { failures++; console.error(name, 'No browser results', run.error?.message || run.stderr?.slice(-1200)); continue; }
    const results = JSON.parse(match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
    const failed = results.filter(result => !result.pass);
    writeFileSync(path.join(output, `${name}.results.json`), JSON.stringify({ scenario: name, results }, null, 2));
    failures += failed.length;
    console.log(`${name}: ${results.length - failed.length}/${results.length} checks passed`, failed);
}
process.exitCode = failures ? 1 : 0;