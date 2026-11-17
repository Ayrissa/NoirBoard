import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const source = readFileSync(new URL('../index.js', import.meta.url), 'utf8').replace(/import\.meta\.url/g, JSON.stringify(new URL('../index.js', import.meta.url).href));
function load() {
    const sandbox = vm.createContext({ console, URL, URLSearchParams, AbortController, setTimeout, clearTimeout, jQuery: () => {} });
    vm.runInContext(source, sandbox);
    return sandbox;
}

test('manifest loads the external CSS; no stale embedded stylesheet remains', () => {
    const manifest = JSON.parse(readFileSync(new URL('../manifest.json', import.meta.url)));
    assert.equal(manifest.css, 'style.css');
    assert.doesNotMatch(source, /NB_CSS|injectNoirStyles/);
});

test('stylesheet has no unintended nesting or orphan declarations', () => {
    const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const stack = [];
    let text = '';
    for (const character of css) {
        if (character === '{') {
            const head = text.trim();
            assert.ok(!stack.length || stack.at(-1).startsWith('@media'), `Nested rule: ${head}`);
            assert.ok(!head.includes(';'), `Orphan declaration before ${head}`);
            stack.push(head);
            text = '';
        } else if (character === '}') {
            assert.ok(stack.length, 'Unmatched closing brace');
            stack.pop();
            text = '';
        } else text += character;
    }
    assert.equal(stack.length, 0);
    assert.equal(text.trim(), '');
});

test('profile listing never reads secret properties', () => {
    const app = load();
    const profile = { id: 'test', name: 'Detective', api: 'openai', model: 'test-model' };
    for (const key of ['apiKey', 'secret', 'password']) {
        Object.defineProperty(profile, key, { get() { throw Error('Secret accessed'); } });
    }
    const list = app.listConnectionProfiles(() => ({ extensionSettings: { connectionManager: { profiles: [profile] } } }));
    assert.deepEqual(Object.keys(list[0]).sort(), ['api', 'id', 'model', 'name']);
});

test('selected profile failures never fall back to another connection', async () => {
    const app = load();
    let fallbacks = 0;
    const ctx = { generateRaw() { fallbacks++; }, generateQuietPrompt() { fallbacks++; } };
    const request = { getContextFn: () => ctx, settings: { textProfileId: 'selected' }, systemPrompt: 'system', userPrompt: 'user' };
    await assert.rejects(app.generateDetectiveText(request), /Другое подключение/);
    ctx.ConnectionManagerRequestService = { async sendRequest() { throw Error('Unavailable'); } };
    await assert.rejects(app.generateDetectiveText(request), /другое подключение/);
    ctx.ConnectionManagerRequestService.sendRequest = async () => '';
    await assert.rejects(app.generateDetectiveText(request), /другое подключение/);
    assert.equal(fallbacks, 0);
});

test('selected profile success uses its ID and returns text', async () => {
    const app = load();
    const ctx = { ConnectionManagerRequestService: { async sendRequest(id) { assert.equal(id, 'chosen'); return { content: 'Evidence' }; } } };
    assert.equal(await app.generateDetectiveText({ getContextFn: () => ctx, settings: { textProfileId: 'chosen' }, systemPrompt: '', userPrompt: '' }), 'Evidence');
});

test('existing cases, pins, notes and connections survive normalization', () => {
    const app = load();
    const data = app.createEmptyCase('Existing case');
    const item = app.normalizeItem({ id: 'item1', type: 'letter', title: 'Letter', notes: 'Personal note', content: '<script>bad</script>' });
    data.items.push(item);
    const first = app.pinItemToCaseWall(data, item);
    const second = app.pinItemToCaseWall(data, item, 'Detail');
    first.x = 123;
    data.connections.push({ id: 'thread', fromNodeId: first.id, toNodeId: second.id, color: 'red', label: 'Hypothesis' });
    const restored = app.normalizeCase(JSON.parse(JSON.stringify(data)));
    assert.equal(restored.items[0].notes, 'Personal note');
    assert.equal(restored.nodes[0].x, 123);
    assert.equal(restored.connections[0].label, 'Hypothesis');
    assert.doesNotMatch(app.renderInspectorContent(item), /<script>/);
});

test('all ten document types render without exceptions', () => {
    const app = load();
    for (const type of ['dossier', 'newspaper', 'fingerprints', 'evidence_bag', 'photo', 'map', 'letter', 'diary', 'report', 'occult']) {
        const item = app.normalizeItem({ type, title: 'Test', content: 'First paragraph.\n\nSecond paragraph.' });
        assert.match(app.renderDeskItemCard(item), /nb-desk-card/);
        assert.match(app.renderInspectorContent(item), /nb-doc-/);
    }
});

test('hidden details are absent from markup until magnifier is enabled', () => {
    const app = load();
    const item = app.normalizeItem({ metadata: { hiddenDetail: 'SECRET DETAIL' } });
    assert.doesNotMatch(app.renderInspectorContent(item), /SECRET DETAIL|nb-hidden-clue-spot/);
    assert.match(app.renderInspectorContent(item, {}, true), /SECRET DETAIL/);
    assert.doesNotMatch(app.renderInspectorContent(item, {}, false), /SECRET DETAIL/);
});

test('case reads preserve live references so dragging and note edits persist', () => {
    const app = load();
    const ctx = { extensionSettings: {}, characterId: 0, chatId: 'one' };
    const storage = app.createStorageManager(() => ctx);
    const original = storage.getCurrentCase();
    const item = app.normalizeItem({ title: 'Evidence' });
    original.items.push(item);
    app.pinItemToCaseWall(original, item);
    original.nodes[0].x = 400;
    original.items[0].notes = 'Note';
    assert.equal(storage.getCurrentCase(), original);
    assert.equal(storage.getCurrentCase().nodes[0].x, 400);
    assert.equal(storage.getCurrentCase().items[0].notes, 'Note');
    storage.saveCurrentCase(original);
    assert.equal(storage.getCurrentCase().nodes[0].x, 400);
    const oldKey = storage.getCurrentChatKey();
    ctx.chatId = 'two';
    storage.saveCurrentCase(original, oldKey);
    assert.equal(storage.getCurrentCase().items.length, 0);
});

test('direct image API uses session key only and saves inline result', async () => {
    const app = load();
    app.setImageSessionKey('test-key', 'https://example.com/v1');
    const settings = { imageApiUrl: 'https://example.com/v1', imageModel: 'image-model' };
    const ctx = { saveBase64AsFile: async () => '/images/generated.png' };
    const fetchFn = async (url, options) => {
        assert.equal(url, 'https://example.com/v1/images/generations');
        assert.equal(options.headers.Authorization, 'Bearer test-key');
        assert.equal(options.redirect, 'error'); assert.equal(options.credentials, 'omit');
        assert.equal(JSON.parse(options.body).model, 'image-model');
        return { ok: true, json: async () => ({ data: [{ b64_json: 'AAAA' }] }) };
    };
    assert.equal(await app.generateEvidenceImage({ settings, prompt: 'map', getContextFn: () => ctx, fetchFn }), '/images/generated.png');
    assert.doesNotMatch(JSON.stringify(settings), /test-key/);
    await assert.rejects(app.generateEvidenceImage({ settings: { ...settings, imageApiUrl: 'https://other.test/v1' }, prompt: 'map', fetchFn }), /изменён/);
    assert.throws(() => app.imageEndpoint('http://external.test/v1'));
    assert.throws(() => app.imageEndpoint('https://example.com/v1?key=test'));
    assert.equal(app.imageEndpoint('http://localhost:1234/v1/'), 'http://localhost:1234/v1/images/generations');
});

test('Commons search accepts only eligible licenses with attribution and omits credentials', async () => {
    const app = load();
    const page = { title: 'File:Forest.jpg', imageinfo: [{ mime: 'image/jpeg', thumburl: 'https://upload.wikimedia.org/test.jpg', descriptionurl: 'https://commons.wikimedia.org/wiki/File:Forest.jpg', extmetadata: {
        LicenseShortName: { value: 'CC BY-SA 4.0' }, Artist: { value: '<b>Photographer</b>' }, LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0/' },
    } }] };
    const result = await app.findCommonsImage({ imageSearchQuery: 'forest road' }, async (url, options) => {
        assert.match(url, /commons.wikimedia.org/); assert.equal(options.credentials, 'omit'); assert.equal(options.referrerPolicy, 'no-referrer');
        return { ok: true, json: async () => ({ query: { pages: { 1: page } } }) };
    });
    assert.equal(result.author, 'Photographer'); assert.equal(result.source, 'commons');
    page.imageinfo[0].extmetadata.LicenseShortName.value = 'All rights reserved';
    assert.equal(app.commonsImageRecord(page), null);
    assert.equal(app.safeImageUrl('javascript:alert(1)'), '');
    assert.equal(app.safeWebUrl('data:text/html,test'), '');
});

test('both image modes retain both sources and preserve partial success', async () => {
    const app = load();
    const args = { item: { title: 'Map', type: 'map' }, settings: { imageSource: 'both' },
        findImage: async () => ({ url: 'https://upload.wikimedia.org/map.jpg', source: 'commons' }),
        generateImage: async () => '/images/map.png' };
    assert.equal((await app.acquireItemImages(args)).images.length, 2);
    args.generateImage = async () => { throw Error('Provider failed'); };
    const partial = await app.acquireItemImages(args);
    assert.equal(partial.images.length, 1); assert.equal(partial.errors.length, 1);
    args.settings.imageSource = 'internet';
    assert.equal((await app.acquireItemImages(args)).errors.length, 0);
});

test('fingerprint ridge patterns differ and maps use context instead of hard-coded place names', () => {
    const app = load();
    assert.notEqual(app.renderFingerprintSvg('arch', 'seed'), app.renderFingerprintSvg('loop', 'seed'));
    assert.match(app.renderFingerprintSvg('whorl', 'seed'), /SPECIMEN/);
    const map = app.renderCrimeMapSvg({ title: 'Town', metadata: { waterName: 'River' } });
    assert.match(map, /River/); assert.doesNotMatch(map, /LAKE FOREST/);
});

test('demo pack adds all evidence types without replacing existing items and is removable alone', () => {
    const app = load();
    const data = app.createEmptyCase('My case');
    data.items.push(app.normalizeItem({ id: 'mine', title: 'My evidence' }));
    const count = app.addDemoMaterials(data, 'standard').length;
    assert.ok(count >= 10);
    assert.equal(data.items.find(item => item.id === 'mine').title, 'My evidence');
    assert.equal(app.addDemoMaterials(data, 'standard').length, 0);
    app.addDemoMaterials(data, 'supernatural');
    assert.ok(data.items.some(item => item.metadata.demoKey?.includes('Серебряный амулет')));
    assert.equal(data.items.find(item => item.id === 'mine').isDemo, false);
    data.deduction = 'Saved deduction';
    app.addDemoMaterials(data, 'supernatural');
    assert.equal(data.deduction, 'Saved deduction');
    const mine = app.pinItemToCaseWall(data, data.items.find(item => item.id === 'mine'));
    app.removeCaseItems(data, data.items.filter(item => item.isDemo).map(item => item.id));
    assert.equal(data.items.length, 1);
    assert.equal(data.nodes.length, 1);
    assert.equal(data.nodes[0].id, mine.id);
    assert.equal(data.connections.length, 0);
});

test('obsolete image profiles and persistent key fields are removed', () => {
    const app = load();
    const settings = app.normalizeSettings({ imageProfileId: 'old', imageBackend: 'sillyimages', imageApiKey: 'secret', apiKey: 'secret' });
    assert.equal(settings.imageProfileId, undefined); assert.equal(settings.imageBackend, undefined);
    assert.doesNotMatch(JSON.stringify(settings), /secret/);
    assert.equal(settings.hideChatConclusions, false);
});

test('object evidence uses item-specific SVGs instead of treating every exhibit as paper', () => {
    const app = load();
    for (const [name, kind] of [['weapon', 'pistol'], ['blood sample', 'blood_bag'], ['amulet', 'amulet'], ['cloth doll', 'doll'], ['crystal', 'crystal']]) {
        const item = app.normalizeItem({ type: 'evidence_bag', title: name, metadata: { objectKind: kind } });
        assert.match(app.renderObjectVisual(item), /<(svg|img)/);
        assert.match(app.renderInspectorContent(item), /nb-doc-object/);
    }
});

test('sent conclusions are marked without altering context visibility flags', () => {
    const app = load();
    const ctx = { chat: [], chatId: 'one', characterId: 0, extensionSettings: {} };
    const key = app.createStorageManager(() => ctx).getCurrentChatKey();
    app.stageConclusion(ctx, key, 'My deduction');
    ctx.chat.push({ is_user: true, mes: 'My deduction', is_system: false });
    assert.equal(app.markSentConclusion(ctx, 0), true);
    assert.equal(ctx.chat[0].extra.noirboardConclusion, true);
    assert.equal(ctx.chat[0].is_system, false); assert.equal(ctx.chat[0].mes, 'My deduction');
    app.stageConclusion(ctx, key, 'Other deduction');
    ctx.chat.push({ is_user: true, mes: 'Ordinary message' });
    assert.equal(app.markSentConclusion(ctx, 1), false); assert.equal(ctx.chat[1].extra, undefined);
});

test('modern search abort signal prevents applying a late response', async () => {
    const app = load();
    const controller = new AbortController();
    const context = { chat: [], generateRaw: async () => new Promise(resolve => setTimeout(() => resolve('{"results":[{"title":"Late result"}]}'), 5)) };
    const currentCase = app.createEmptyCase();
    const pending = app.runModernSearch({ getContextFn: () => context, settings: {}, currentCase, query: 'query', signal: controller.signal });
    controller.abort();
    await assert.rejects(pending);
    assert.equal(currentCase.searchHistory.length, 0);
});

test('image credits retain attribution but render no duplicate pictures', () => {
    const app = load();
    const html = app.renderImageGallery({ id: 'evidence', images: [{ source: 'commons', title: 'Photo', author: 'Photographer', license: 'CC BY 4.0', url: 'https://upload.wikimedia.org/example.png', pageUrl: 'https://commons.wikimedia.org/wiki/File:Example.png' }] });
    assert.match(html, /Photographer/);
    assert.match(html, /CC BY 4.0/);
    assert.match(html, /<details/);
    assert.doesNotMatch(html, /<img/);
});

test('built-in asset matching covers supplied exhibits without breaking custom images', () => {
    const app = load();
    const cases = [['Складной нож', 'folding_knife'], ['Связка ключей', 'keys'], ['Флакон лекарства', 'medicine'],
        ['Разбитый телефон', 'phone'], ['Купюры', 'money'], ['Патроны', 'cartridges'], ['Тактический нож', 'knife'],
        ['Серебристый пистолет', 'pistol_silver'], ['Пакет с уликами', 'evidence_package'], ['Растительный образец', 'plant_sample']];
    for (const [title, kind] of cases) {
        const item = app.normalizeItem({ type: 'evidence_bag', title });
        assert.equal(app.objectKind(item), kind);
        assert.ok(existsSync(new URL(app.builtinEvidenceUrl(kind))));
        assert.match(app.renderObjectVisual(item), /nb-builtin-evidence/);
        item.imageUrl = '/images/custom.png';
        assert.match(app.renderObjectVisual(item), /\/images\/custom.png/);
        assert.doesNotMatch(app.renderObjectVisual(item), /nb-builtin-evidence/);
    }
    assert.equal(app.builtinEvidenceUrl('../../unknown'), '');
    assert.match(app.renderFingerprintSample('test', 1), /fingerprint-[12]\.png/);
});