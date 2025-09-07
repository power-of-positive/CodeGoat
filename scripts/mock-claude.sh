#!/bin/bash

# Mock claude script for testing
# This simulates Claude's output format

echo '{"type":"system","subtype":"init","cwd":"'$(pwd)'","session_id":"mock-session-123","tools":[],"model":"claude-opus-4-1-20250805","permissionMode":"default","slash_commands":[],"apiKeySource":"none"}'
echo '{"type":"assistant","message":{"id":"msg_mock","type":"message","role":"assistant","model":"claude-opus-4-1-20250805","content":[{"type":"text","text":"Mock response to: '$@'"}],"stop_reason":null,"stop_sequence":null,"usage":{"input_tokens":4,"output_tokens":10,"service_tier":"standard"}},"parent_tool_use_id":null,"session_id":"mock-session-123"}'
echo '{"type":"result","subtype":"success","is_error":false,"duration_ms":100,"duration_api_ms":50,"num_turns":1,"result":"Mock response","session_id":"mock-session-123","total_cost_usd":0.001,"usage":{"input_tokens":4,"output_tokens":10},"permission_denials":[]}'