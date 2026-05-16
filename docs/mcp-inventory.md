# MCP inventory

Generated on **2026-04-03** for the active Codex session in `/Users/letitbe/letitbe/korea-event-radar`.

This inventory covers MCP servers returned by `codex mcp list` and the callable tools exposed in the session. Connector apps such as GitHub, Gmail, Google Drive, and Notion are intentionally excluded because they are surfaced through app tools rather than the MCP registry. Shared MCP resources and resource templates were empty when this inventory was generated.

## Servers

| Server | Status | Auth | Transport |
| --- | --- | --- | --- |
| `omx_code_intel` | enabled | unsupported | `node …/code-intel-server.js` |
| `omx_memory` | enabled | unsupported | `node …/memory-server.js` |
| `omx_state` | enabled | unsupported | `node …/state-server.js` |
| `omx_team_run` | enabled | unsupported | `node …/team-server.js` |
| `omx_trace` | enabled | unsupported | `node …/trace-server.js` |
| `pencil` | enabled | unsupported | `mcp-server-darwin-arm64 --app desktop` |
| `cloudflare-api` | enabled | oauth | `https://mcp.cloudflare.com/mcp` |
| `hf-mcp-server` | enabled | oauth | `https://huggingface.co/mcp?login` |
| `vercel` | enabled | oauth | `https://mcp.vercel.com` |

## Tool inventory

### `omx_code_intel`
- `ast_grep_replace` — AST-based search and replace with dry-run preview by default.
- `ast_grep_search` — AST-based code search using metavariables.
- `lsp_diagnostics` — file-level diagnostics such as errors and warnings.
- `lsp_diagnostics_directory` — project-wide diagnostics for a directory.
- `lsp_document_symbols` — hierarchical symbol outline for a file.
- `lsp_find_references` — find references to a symbol across the workspace.
- `lsp_hover` — get approximate type information and documentation at a position.
- `lsp_servers` — list available diagnostic backends and their status.
- `lsp_workspace_symbols` — search workspace symbols by name.

### `omx_memory`
- `notepad_prune` — prune old working-memory entries from the notepad.
- `notepad_read` — read the notepad or a specific section.
- `notepad_stats` — get size and age statistics for the notepad.
- `notepad_write_manual` — add a persistent manual note.
- `notepad_write_priority` — replace the priority-context section.
- `notepad_write_working` — append a timestamped working-memory note.
- `project_memory_add_directive` — add a persistent directive to project memory.
- `project_memory_add_note` — add a categorized note to project memory.
- `project_memory_read` — read project memory.
- `project_memory_write` — write or merge project memory JSON.

### `omx_state`
- `state_clear` — clear stored state for a mode.
- `state_get_status` — get status for one mode or all modes.
- `state_list_active` — list all active modes.
- `state_read` — read state JSON for a specific mode.
- `state_write` — write or update state for a specific mode.

### `omx_team_run`
- `omx_run_team_cleanup` — stop worker panes for a background team job.
- `omx_run_team_start` — start tmux-backed parallel workers.
- `omx_run_team_status` — poll non-blocking status for a team job.
- `omx_run_team_wait` — wait for team completion or the next team event.

### `omx_trace`
- `trace_summary` — show aggregate trace statistics.
- `trace_timeline` — show the chronological agent trace timeline.

### `pencil`
- `batch_design` — apply multi-operation edits to `.pen` design files.
- `batch_get` — read or search nodes in a `.pen` file.
- `export_nodes` — export nodes to PNG, JPEG, WEBP, or PDF.
- `find_empty_space_on_canvas` — find open canvas space near a node or the full document.
- `get_editor_state` — inspect the active Pencil editor and selection.
- `get_guidelines` — load Pencil guides and style presets.
- `get_screenshot` — render a screenshot of a specific node.
- `get_variables` — read document variables and themes.
- `open_document` — open an existing `.pen` document or create a new one.
- `replace_all_matching_properties` — bulk replace repeated style or layout properties.
- `search_all_unique_properties` — inventory unique property values in a node tree.
- `set_variables` — write document variables and themes.
- `snapshot_layout` — inspect layout structure and layout problems.

### `cloudflare-api`
- `search` — search the Cloudflare OpenAPI spec for endpoints.
- `execute` — run JavaScript against the Cloudflare API using `cloudflare.request()`.

### `hf-mcp-server`
- `dynamic_space` — discover and invoke supported Hugging Face Space tasks.
- `gr1_z_image_turbo_generate` — generate an image with Z-Image Turbo.
- `hf_doc_fetch` — fetch a chunk of Hugging Face or Gradio documentation.
- `hf_doc_search` — search Hugging Face or Gradio documentation.
- `hf_hub_query` — run structured read-only queries against the Hugging Face Hub.
- `hf_whoami` — return the authenticated Hugging Face user.
- `hub_repo_details` — fetch detailed metadata for model, dataset, or space repositories.
- `hub_repo_search` — search Hugging Face Hub repositories.
- `paper_search` — search machine learning papers on Hugging Face.
- `space_search` — run semantic search over Hugging Face Spaces.

### `vercel`
- `add_toolbar_reaction` — add an emoji reaction to a Vercel toolbar comment.
- `change_toolbar_thread_resolve_status` — resolve or unresolve a Vercel toolbar thread.
- `check_domain_availability_and_price` — check domain availability and pricing.
- `deploy_to_vercel` — deploy the current project to Vercel.
- `edit_toolbar_message` — edit an existing Vercel toolbar comment.
- `get_access_to_vercel_url` — create a temporary auth-bypass share link for a Vercel deployment.
- `get_deployment` — fetch deployment details by ID or URL.
- `get_deployment_build_logs` — fetch Vercel build logs.
- `get_project` — fetch Vercel project details.
- `get_runtime_logs` — query runtime logs for a Vercel project or deployment.
- `get_toolbar_thread` — fetch a full Vercel toolbar thread.
- `list_deployments` — list deployments for a Vercel project.
- `list_projects` — list accessible Vercel projects.
- `list_teams` — list accessible Vercel teams.
- `list_toolbar_threads` — list Vercel toolbar comment threads.
- `reply_to_toolbar_thread` — reply to a Vercel toolbar thread.
- `search_vercel_documentation` — search Vercel documentation.
- `web_fetch_vercel_url` — fetch a protected Vercel URL through the Vercel MCP.

## Machine-readable source

- JSON inventory: [`docs/mcp-inventory.json`](./mcp-inventory.json)
