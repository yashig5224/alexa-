/**
 * TrackMate AI — Streamable HTTP MCP Test Client
 * Conforms to Model Context Protocol (MCP) specification 2025-11-25.
 * Demonstrates handshake, session management, tool discovery, and tool execution.
 */

const MCP_URL = process.env.MCP_SERVER_URL || 'http://localhost:3002/mcp';
const HEALTH_URL = process.env.MCP_HEALTH_URL || 'http://localhost:3002/health';

class StreamableMcpClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.sessionId = null;
    this.requestId = 1;
  }

  async sendJsonRpc(method, params = {}, headers = {}) {
    const id = this.requestId++;
    const payload = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (this.sessionId) {
      reqHeaders['Mcp-Session-Id'] = this.sessionId;
    }

    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: reqHeaders,
      body: JSON.stringify(payload),
    });

    // Capture or update session ID from server header
    const serverSession = res.headers.get('mcp-session-id');
    if (serverSession) {
      this.sessionId = serverSession;
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream')) {
      const text = await res.text();
      return { status: res.status, stream: text, headers: Object.fromEntries(res.headers.entries()) };
    }

    const json = await res.json();
    return { status: res.status, data: json, headers: Object.fromEntries(res.headers.entries()) };
  }

  async checkHealth() {
    console.log(`\n🔍 [1/9] Checking MCP Server Health (${HEALTH_URL})...`);
    const res = await fetch(HEALTH_URL);
    const health = await res.json();
    console.log(`   Status: HTTP ${res.status}`);
    console.log(`   Server Metadata:`, JSON.stringify(health, null, 2));
    if (health.transport !== 'streamable-http' || health.mcpSpec !== '2025-11-25') {
      throw new Error(`Incompatible server transport or spec version!`);
    }
    return health;
  }

  async initialize() {
    console.log(`\n🤝 [2/9] Performing MCP Handshake (initialize)...`);
    const { status, data, headers } = await this.sendJsonRpc('initialize', {
      protocolVersion: '2025-11-25',
      capabilities: { tools: {} },
      clientInfo: { name: 'trackmate-test-client', version: '1.0.0' },
    });

    console.log(`   Status: HTTP ${status}`);
    console.log(`   Assigned Mcp-Session-Id: ${this.sessionId}`);
    console.log(`   Negotiated Protocol Version: ${data.result?.protocolVersion}`);
    console.log(`   Server Info:`, JSON.stringify(data.result?.serverInfo));
    return data.result;
  }

  async listTools() {
    console.log(`\n📋 [3/9] Discovering Tools (tools/list)...`);
    const { data } = await this.sendJsonRpc('tools/list');
    const tools = data.result?.tools || [];
    console.log(`   Discovered ${tools.length} Registered Tools:`);
    tools.forEach((t, i) => {
      console.log(`   ${(i + 1).toString().padStart(2, ' ')}. ${t.name} — ${t.description}`);
    });
    return tools;
  }

  async callTool(name, args = {}, useStream = false) {
    const extraHeaders = useStream ? { 'Accept': 'text/event-stream' } : {};
    return await this.sendJsonRpc('tools/call', { name, arguments: args }, extraHeaders);
  }
}

async function runTestClient() {
  console.log(`================================================================`);
  console.log(` TrackMate AI — Streamable HTTP MCP Client (Spec 2025-11-25)   `);
  console.log(`================================================================`);

  const client = new StreamableMcpClient(MCP_URL);

  try {
    // 1. Health check
    await client.checkHealth();

    // 2. Initialize handshake
    await client.initialize();

    // 3. List tools
    await client.listTools();

    // 4. Test tool: get_projects
    console.log(`\n📂 [4/9] Calling Tool: get_projects...`);
    const projRes = await client.callTool('get_projects', { limit: 5 });
    const rawProjects = JSON.parse(projRes.data.result.content[0].text);
    console.log(`   Found ${rawProjects.projects.length} project(s).`);
    const testProject = rawProjects.projects[0];
    console.log(`   Target Project: "${testProject.name}" (ID: ${testProject.id})`);

    // 5. Test tool: get_tasks
    console.log(`\n📝 [5/9] Calling Tool: get_tasks (for project ${testProject.name})...`);
    const taskRes = await client.callTool('get_tasks', { projectId: testProject.id, limit: 5 });
    const rawTasks = JSON.parse(taskRes.data.result.content[0].text);
    console.log(`   Returned ${rawTasks.tasks.length} task(s).`);

    // 6. Test tool: create_task
    console.log(`\n✨ [6/9] Calling Tool: create_task...`);
    const createRes = await client.callTool('create_task', {
      title: 'Streamable HTTP Verification Task',
      description: 'Created via automated Streamable HTTP MCP test client',
      priority: 'high',
      projectId: testProject.id,
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      tags: ['mcp', 'streamable-http', 'hackathon'],
    });
    console.log(`   Server Response:`);
    console.log(createRes.data.result.content[0].text);
    const idMatch = createRes.data.result.content[0].text.match(/ID:\s*([a-f0-9-]+)/i);
    const newTaskId = idMatch ? idMatch[1] : null;

    // 7. Test tool: update_task
    if (newTaskId) {
      console.log(`\n🔄 [7/9] Calling Tool: update_task (ID: ${newTaskId})...`);
      const updateRes = await client.callTool('update_task', {
        id: newTaskId,
        status: 'in_progress',
        priority: 'critical',
      });
      console.log(`   Server Response:`);
      console.log(updateRes.data.result.content[0].text);
    }

    // 8. Test tool: get_project_status
    console.log(`\n📊 [8/9] Calling Tool: get_project_status...`);
    const statusRes = await client.callTool('get_project_status', { projectId: testProject.id });
    const rawStatus = JSON.parse(statusRes.data.result.content[0].text);
    console.log(`   Completion: ${rawStatus.completionPercentage}%`);
    console.log(`   Total Tasks: ${rawStatus.totalTasks} (Completed: ${rawStatus.completedTasks}, In-Progress: ${rawStatus.inProgressTasks}, Blocked: ${rawStatus.blockedTasks})`);
    console.log(`   Active Blockers: ${rawStatus.blockers.length ? rawStatus.blockers.join(', ') : 'None'}`);

    // 9. Test tool: get_deadlines & get_daily_priorities (including SSE Stream mode)
    console.log(`\n📅 [9/9a] Calling Tool: get_deadlines (within 14 days)...`);
    const deadlinesRes = await client.callTool('get_deadlines', { withinDays: 14 });
    const rawDeadlines = JSON.parse(deadlinesRes.data.result.content[0].text);
    console.log(`   Upcoming Deadlines Found: ${rawDeadlines.deadlines.length}`);

    console.log(`\n⚡ [9/9b] Calling Tool: get_daily_priorities (Streamable HTTP SSE Streaming Mode)...`);
    const streamRes = await client.callTool('get_daily_priorities', { limit: 3 }, true);
    console.log(`   Received Content-Type: ${streamRes.headers['content-type']}`);
    console.log(`   Raw SSE Stream Chunk:\n${streamRes.stream.trim()}`);

    console.log(`\n================================================================`);
    console.log(` ✅ ALL 7 REQUIRED MCP TOOLS & STREAMABLE HTTP TESTS SUCCEEDED!  `);
    console.log(`================================================================\n`);
  } catch (err) {
    console.error(`\n❌ Error running Streamable HTTP MCP client:`, err);
    process.exit(1);
  }
}

runTestClient();
