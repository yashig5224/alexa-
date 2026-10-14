/**
 * MCP Audit Script — TrackMate AI
 * Tests all 7 audit questions against the live MCP server at http://localhost:3002
 * Run with: node mcp-audit.mjs
 */

const BASE = process.env['MCP_SERVER_URL'] ?? 'http://127.0.0.1:3002';

let pass = 0;
let fail = 0;
let sessionId = null;

function ok(label, detail = '') {
  console.log(`  ✅ PASS  ${label}${detail ? ' — ' + detail : ''}`);
  pass++;
}

function bad(label, detail = '') {
  console.error(`  ❌ FAIL  ${label}${detail ? ' — ' + detail : ''}`);
  fail++;
}

async function post(body, extraHeaders = {}) {
  const headers = { 'Content-Type': 'application/json', ...extraHeaders };
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;
  const res = await fetch(`${BASE}/mcp`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return { res, data: await res.json() };
}

// ── CHECK 0: Health endpoint ──────────────────────────────────────────────────
console.log('\n[CHECK 0] Health endpoint');
try {
  const res = await fetch(`${BASE}/health`);
  const data = await res.json();
  if (data.status === 'ok') ok('status ok');
  else bad('status', JSON.stringify(data));
  if (data.transport === 'streamable-http') ok('transport = streamable-http');
  else bad('transport', data.transport);
  if (data.mcpSpec === '2025-11-25') ok('mcpSpec = 2025-11-25');
  else bad('mcpSpec', data.mcpSpec);
} catch (e) {
  bad('health reachable', String(e));
}

// ── CHECK 1: initialize + session ID ─────────────────────────────────────────
console.log('\n[CHECK 1] initialize — JSON-RPC handshake + session ID');
try {
  const { res, data } = await post({
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'audit', version: '1.0' } },
  });
  if (res.status === 200) ok('HTTP 200');
  else bad('HTTP status', res.status);
  if (data.jsonrpc === '2.0') ok('jsonrpc: 2.0');
  else bad('jsonrpc field', data.jsonrpc);
  if (data.result?.protocolVersion === '2025-11-25') ok('protocolVersion = 2025-11-25');
  else bad('protocolVersion', data.result?.protocolVersion);
  if (data.result?.serverInfo?.name) ok(`serverInfo.name = ${data.result.serverInfo.name}`);
  else bad('serverInfo missing');
  sessionId = res.headers.get('mcp-session-id');
  if (sessionId) ok(`Mcp-Session-Id issued = ${sessionId}`);
  else bad('No Mcp-Session-Id header returned');
} catch (e) {
  bad('initialize', String(e));
}

// ── CHECK 2: ping ─────────────────────────────────────────────────────────────
console.log('\n[CHECK 2] ping');
try {
  const { res, data } = await post({ jsonrpc: '2.0', id: 2, method: 'ping' });
  if (res.status === 200 && JSON.stringify(data.result) === '{}') ok('ping returns {}');
  else bad('ping', JSON.stringify(data));
} catch (e) {
  bad('ping', String(e));
}

// ── CHECK 3: tools/list — discover all 15 tools ───────────────────────────────
console.log('\n[CHECK 3] tools/list — tool discovery');
let tools = [];
try {
  const { res, data } = await post({ jsonrpc: '2.0', id: 3, method: 'tools/list' });
  tools = data.result?.tools ?? [];
  if (res.status === 200) ok('HTTP 200');
  else bad('HTTP status', res.status);
  if (Array.isArray(tools)) ok(`tools array returned`);
  else bad('tools is not array');
  if (tools.length === 15) ok(`15 tools registered`);
  else bad(`tool count`, `got ${tools.length}, expected 15`);
  const names = tools.map(t => t.name);
  const required = ['get_tasks', 'create_task', 'update_task', 'delete_task', 'get_projects', 'get_daily_priorities', 'get_overdue_tasks'];
  for (const r of required) {
    if (names.includes(r)) ok(`tool: ${r}`);
    else bad(`missing tool: ${r}`);
  }
  // Check each tool has name, description, inputSchema
  const allHaveSchema = tools.every(t => t.name && t.description && t.inputSchema);
  if (allHaveSchema) ok('all tools have name + description + inputSchema');
  else bad('some tools missing schema fields');
} catch (e) {
  bad('tools/list', String(e));
}

// ── CHECK 4: tools/call — get_tasks (plain JSON) ──────────────────────────────
console.log('\n[CHECK 4] tools/call get_tasks (plain JSON response)');
let firstTaskId = null;
let firstProjectId = null;
try {
  const { res, data } = await post({
    jsonrpc: '2.0', id: 4, method: 'tools/call',
    params: { name: 'get_tasks', arguments: { limit: 5 } },
  });
  if (res.status === 200) ok('HTTP 200');
  else bad('HTTP status', res.status);
  if (!data.error) ok('no JSON-RPC error');
  else bad('JSON-RPC error', data.error.message);
  const content = data.result?.content;
  if (Array.isArray(content) && content[0]?.type === 'text') {
    ok('result.content is text array');
    const parsed = JSON.parse(content[0].text);
    ok(`tasks returned: ${parsed.tasks?.length ?? 0}`);
    if (parsed.tasks?.length > 0) {
      firstTaskId = parsed.tasks[0].id;
      firstProjectId = parsed.tasks[0].projectId;
      ok(`first task id: ${firstTaskId}`);
    }
  } else {
    bad('unexpected content format', JSON.stringify(content));
  }
} catch (e) {
  bad('get_tasks', String(e));
}

// ── CHECK 5: tools/call — get_tasks (SSE / streaming) ────────────────────────
console.log('\n[CHECK 5] tools/call get_tasks with Accept: text/event-stream (Streamable HTTP SSE)');
try {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
  };
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;
  const res = await fetch(`${BASE}/mcp`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'get_tasks', arguments: {} } }),
  });
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('text/event-stream')) ok(`Content-Type = ${ct}`);
  else bad('Content-Type not SSE', ct);
  const text = await res.text();
  if (text.startsWith('data:')) ok('SSE stream starts with "data:"');
  else bad('SSE format wrong', text.slice(0, 80));
  // Parse the data line
  const jsonLine = text.split('\n').find(l => l.startsWith('data:'))?.slice(5).trim();
  if (jsonLine) {
    const parsed = JSON.parse(jsonLine);
    if (parsed.result?.content) ok('SSE payload contains result.content');
    else bad('SSE payload malformed', jsonLine.slice(0, 120));
  }
} catch (e) {
  bad('SSE tools/call', String(e));
}

// ── CHECK 6: tools/call — create_task ────────────────────────────────────────
console.log('\n[CHECK 6] tools/call create_task');
let createdTaskId = null;
if (!firstProjectId) {
  console.log('  ⚠️  SKIP  no projectId from get_tasks, skipping create_task');
} else {
  try {
    const { res, data } = await post({
      jsonrpc: '2.0', id: 6, method: 'tools/call',
      params: {
        name: 'create_task',
        arguments: {
          title: 'MCP Audit Test Task',
          projectId: firstProjectId,
          priority: 'high',
          dueDate: '2026-10-31',
        },
      },
    });
    if (res.status === 200) ok('HTTP 200');
    else bad('HTTP status', res.status);
    if (!data.error) ok('no JSON-RPC error');
    else bad('JSON-RPC error', data.error?.message);
    const text = data.result?.content?.[0]?.text ?? '';
    if (text.includes('Task created')) ok(`create_task: ${text.split('\n')[0]}`);
    else bad('unexpected create response', text.slice(0, 100));
    // Extract ID from response
    const idMatch = text.match(/ID:\s*([a-f0-9-]+)/i);
    createdTaskId = idMatch?.[1] ?? null;
    if (createdTaskId) ok(`created task id: ${createdTaskId}`);
  } catch (e) {
    bad('create_task', String(e));
  }
}

// ── CHECK 7: tools/call — update_task ────────────────────────────────────────
console.log('\n[CHECK 7] tools/call update_task');
const taskToUpdate = createdTaskId ?? firstTaskId;
if (!taskToUpdate) {
  console.log('  ⚠️  SKIP  no task ID available');
} else {
  try {
    const { res, data } = await post({
      jsonrpc: '2.0', id: 7, method: 'tools/call',
      params: {
        name: 'update_task',
        arguments: { id: taskToUpdate, status: 'in_progress', priority: 'critical' },
      },
    });
    if (res.status === 200) ok('HTTP 200');
    else bad('HTTP status', res.status);
    if (!data.error) ok('no JSON-RPC error');
    else bad('JSON-RPC error', data.error?.message);
    const text = data.result?.content?.[0]?.text ?? '';
    if (text.includes('updated')) ok(`update_task: ${text}`);
    else bad('unexpected update response', text.slice(0, 100));
  } catch (e) {
    bad('update_task', String(e));
  }
}

// ── CHECK 8: invalid request ──────────────────────────────────────────────────
console.log('\n[CHECK 8] Invalid JSON-RPC → INVALID_REQUEST error');
try {
  const res = await fetch(`${BASE}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 99, method: 'ping' }), // missing jsonrpc: '2.0'
  });
  const data = await res.json();
  if (res.status === 400) ok('HTTP 400 for invalid request');
  else bad('expected HTTP 400', res.status);
  if (data.error?.code === -32600) ok('error code -32600 (INVALID_REQUEST)');
  else bad('wrong error code', data.error?.code);
} catch (e) {
  bad('invalid request handling', String(e));
}

// ── SUMMARY ───────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(60));
console.log(`AUDIT COMPLETE:  ${pass} passed  |  ${fail} failed`);
if (fail === 0) {
  console.log('✅  MCP implementation is SPEC-COMPLIANT (2025-11-25, Streamable HTTP)');
  console.log('✅  Alexa+ readiness: VERIFIED');
} else {
  console.log('❌  Issues found — fix before claiming Alexa+ readiness');
}
console.log('='.repeat(60) + '\n');
process.exit(fail > 0 ? 1 : 0);
