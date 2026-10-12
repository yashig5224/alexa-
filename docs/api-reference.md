# TrackMate AI — REST API Reference

The backend API runs on port `3001` (by default) with JSON body parsing, CORS, and rate limiting.

---

## Health & Metadata
- **`GET /health`**
  - Returns backend status, active AI provider, MCP server connectivity URL, and timestamp.

---

## Projects
- **`GET /api/projects`**: List all projects.
- **`GET /api/projects/:id`**: Get single project by UUID.
- **`POST /api/projects`**: Create project.
  - Body: `{ name: string, description?: string, status?: string, githubRepo?: string, color?: string }`
- **`PATCH /api/projects/:id`**: Partial update of project attributes.
- **`DELETE /api/projects/:id`**: Delete project and associated records.
- **`GET /api/projects/:id/tasks`**: List all tasks belonging to a specific project.
- **`GET /api/projects/:id/github-issues`**: Fetch issues from linked GitHub repository via MCP tool.
- **`POST /api/projects/:id/convert-issue`**: Convert a GitHub issue into a native project task.
  - Body: `{ title: string, description?: string, issueNumber?: number, issueUrl?: string, priority?: string }`
- **`POST /api/projects/:id/summarize`**: Generate an AI status summary for the project.

---

## Tasks
- **`GET /api/tasks`**: Query tasks with optional query params `?projectId=&status=&priority=`.
- **`GET /api/tasks/:id`**: Retrieve task details by UUID.
- **`POST /api/tasks`**: Create a new task.
  - Body: `{ title: string, projectId: string, priority?: string, status?: string, dueDate?: string, description?: string }`
- **`PATCH /api/tasks/:id`**: Update task fields (status, priority, dueDate, assigneeId, etc.).
- **`DELETE /api/tasks/:id`**: Delete a task.

---

## Users & Team
- **`GET /api/users`**: List team members with avatars, roles, and emails.

---

## AI Agent
- **`POST /api/ai/chat`**: Process conversational turn through Bedrock Converse / MCP agent loop.
  - Body: `{ messages: [{ role: "user" | "assistant", content: string }] }`
  - Returns: `{ reply: string }`
