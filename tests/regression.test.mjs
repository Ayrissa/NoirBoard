import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../index.js', import.meta.url), 'utf8');
function load() {
    const sandbox = vm.createContext({ console, jQuery: () => {} });
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