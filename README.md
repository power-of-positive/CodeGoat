# CodeGoat Proxy

A configurable Node.js TypeScript proxy server that routes requests based on a YAML configuration file with support for streaming responses and flexible header management.

## Features

- **Configuration-based routing** - Define routes and targets in YAML
- **Streaming support** - Handles SSE and streaming responses
- **Header management** - Forward, remove, or add headers per route
- **Path rewriting** - Rewrite request paths before forwarding
- **Logging** - JSON or text format logging with configurable levels
- **Hot reload** - Reload configuration with SIGHUP signal
- **Error handling** - Graceful error handling with appropriate status codes

## Installation

```bash
npm install
```

## Configuration

Create a `proxy-config.yaml` file:

```yaml
proxy:
  port: 3000
  host: "0.0.0.0"
  
routes:
  - name: "OpenAI API"
    match:
      path: "/v1/chat/completions"
      method: "POST"
    target:
      url: "https://api.openai.com/v1/chat/completions"
      headers:
        forward: ["content-type", "accept", "authorization"]
        add:
          X-Proxy-Name: "codegoat-proxy"
    streaming: true
```

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Reload Configuration
```bash
kill -HUP <process-id>
```

## Route Configuration

### Match Options
- `path`: Request path pattern (supports wildcards with `*`)
- `method`: HTTP method(s) - string or array

### Target Options
- `url`: Target server URL
- `rewritePath`: Whether to rewrite the path (for wildcard routes)
- `headers`:
  - `forward`: Array of headers to forward (use `["*"]` for all)
  - `remove`: Array of headers to remove
  - `add`: Object of headers to add

### Streaming
Set `streaming: true` to enable streaming support for SSE/NDJSON responses.

## Example Routes

```yaml
routes:
  # Exact path match
  - name: "API v1"
    match:
      path: "/api/v1/users"
      method: "GET"
    target:
      url: "https://api.example.com/users"
      
  # Wildcard path match with rewrite
  - name: "API Gateway"
    match:
      path: "/api/*"
      method: ["GET", "POST", "PUT", "DELETE"]
    target:
      url: "https://backend.example.com"
      rewritePath: true
      
  # Streaming endpoint
  - name: "Chat Stream"
    match:
      path: "/chat/stream"
      method: "POST"
    target:
      url: "https://ai.example.com/stream"
    streaming: true
```# Test change
# Test comment
# Another test
