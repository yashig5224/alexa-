# TrackMate AI — MCP Tools Reference

**Protocol Version**: `2025-11-25`  
**Transport**: Streamable HTTP (`POST /mcp`)  
**Header**: `Mcp-Session-Id: <uuid>`

---

## Tool Summary (12 Tools)

| Tool Name | Category | Description |
|---|---|---|
| `get_tasks` | Tasks | Query tasks with multi-field filtering, pagination, and sorting |
| `get_task` | Tasks | Retrieve a single task by UUID |
| `create_task` | Tasks | Create a new task with title, priority, due date, tags, and project link |
| `update_task` | Tasks | Update task status, priority, due date, assignee, or tags |
| `delete_task` | Tasks | Permanently remove a task |
| `get_projects` | Projects | List all projects with status, owner, and repository links |
| `get_project_status` | Projects | Compute project completion metrics, counts by state, and active blockers |
| `get_deadlines` | Deadlines | Retrieve tasks due within an upcoming sliding window (default 7 days) |
| `get_daily_priorities` | Priorities | Compute urgency-weighted ranking using priority multipliers and due dates |
| `get_overdue_tasks` | Deadlines | List all uncompleted tasks whose due date has lapsed |
| `get_github_issues` | GitHub | Fetch open/closed issues from a linked GitHub repo via GitHub REST API |
| `summarize_project` | AI / Analytics | Synthesize natural-language executive summary of project health |

---

## Detailed Tool Specifications

### 1. `get_tasks`
- **Description**: Query tasks with optional filters.
- **Parameters**:
  - `projectId` *(string, optional)*: Filter by project UUID.
  - `status` *(string, optional)*: `'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked'`.
  - `priority` *(string, optional)*: `'low' | 'medium' | 'high' | 'critical'`.
  - `limit` *(number, optional, default: 50)*: Number of tasks to return.
  - `offset` *(number, optional, default: 0)*: Pagination offset.

### 2. `create_task`
- **Description**: Creates a new task in a project.
- **Parameters**:
  - `title` *(string, required)*: Task title (1-200 chars).
  - `projectId` *(string, required)*: Associated project UUID.
  - `description` *(string, optional)*: Extended description.
  - `priority` *(string, default: 'medium')*: `'low' | 'medium' | 'high' | 'critical'`.
  - `dueDate` *(string, optional)*: Format `YYYY-MM-DD`.
  - `tags` *(array of strings, default: [])*: Category tags.

### 3. `update_task`
- **Description**: Modifies properties of an existing task.
- **Parameters**:
  - `id` *(string, required)*: Task UUID.
  - `status` *(string, optional)*: `'todo' | 'in_progress' | 'in_review' | 'done' | 'blocked'`.
  - `priority` *(string, optional)*: `'low' | 'medium' | 'high' | 'critical'`.
  - `dueDate` *(string, optional)*: Format `YYYY-MM-DD`.
  - `title` *(string, optional)*: New title.

### 4. `delete_task`
- **Description**: Permanently deletes a task.
- **Parameters**:
  - `id` *(string, required)*: Task UUID.

### 5. `get_projects`
- **Description**: Lists all tracked projects with metadata.
- **Parameters**: None required.

### 6. `get_project_status`
- **Description**: Computes completion percentage, breakdown by task status, and lists all blocking tasks.
- **Parameters**:
  - `projectId` *(string, required)*: Project UUID.

### 7. `get_deadlines`
- **Description**: Returns all incomplete tasks due in the next N days.
- **Parameters**:
  - `withinDays` *(number, optional, default: 7)*: Lookahead window in days.

### 8. `get_daily_priorities`
- **Description**: Calculates today's most urgent tasks using an algorithm:
  $$\text{Urgency Score} = \text{Priority Weight} + \text{Due Date Proximity Factor}$$
- **Parameters**:
  - `limit` *(number, optional, default: 5)*: Maximum items to return.

### 9. `get_overdue_tasks`
- **Description**: Lists all tasks past their deadline that are not marked 'done'.
- **Parameters**: None required.

### 10. `get_github_issues`
- **Description**: Queries GitHub REST API for issues in a project's repository.
- **Parameters**:
  - `projectId` *(string, optional)*: Auto-resolves owner/repo from project.
  - `owner` *(string, optional)*: GitHub user or organization name.
  - `repo` *(string, optional)*: GitHub repository name.
  - `state` *(string, default: 'open')*: `'open' | 'closed' | 'all'`.
  - `limit` *(number, default: 20)*: Page limit.

### 11. `summarize_project`
- **Description**: Generates an intelligent state summary and actionable next step recommendations for a project.
- **Parameters**:
  - `projectId` *(string, required)*: Project UUID.

### 12. `get_task`
- **Description**: Fetches complete task details by ID.
- **Parameters**:
  - `id` *(string, required)*: Task UUID.
