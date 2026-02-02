#!/bin/bash

# Golden Set Evaluation Runner
# Executes 20 scenarios against the e2e-simulation endpoint.
# Logs are written to trace.log in the app root.

echo "🚀 Starting Golden Set Evaluation (20 Scenarios)..."
echo "Logs will appear in trace.log"

API_URL="http://localhost:3000/api/test/e2e-simulation"

run_test() {
    id=$1
    query=$2
    intent=$3
    echo "Running [$id] Query: '$query' (Intent: $intent)..."
    # URL encode params (basic)
    encoded_query=$(echo "$query" | sed 's/ /+/g')
    encoded_intent=$(echo "$intent" | sed 's/ /+/g')
    
    curl -s "${API_URL}?q=${encoded_query}&intent=${encoded_intent}" > /dev/null
    echo "✅ [$id] Complete"
    sleep 1 # Pause to prevent rate limiting/race conditions
}

# --- TYPE 1: Tone Inversion ---
run_test "P1" "Risks of Moltbot" "Criticism"
run_test "P2" "Growth opportunities in 2026 recession" "Optimism"
run_test "P3" "Why burnout is a necessary signal" "Optimism"
run_test "P4" "Creative uses for Deepfakes" "Optimism"
run_test "P5" "Why Rust is bad for rapid prototyping" "Criticism"

# --- TYPE 2: Abstraction ---
run_test "P6" "Philosophical beauty of COBOL" "Philosophy"
run_test "P7" "What layoffs teach us about loyalty" "Philosophy"
run_test "P8" "The theology of AI Art" "Philosophy"
run_test "P9" "Sleep deprivation as a spiritual practice" "Philosophy"
run_test "P10" "The moral hazard of VC funding" "Philosophy"

# --- TYPE 3: Concretization ---
run_test "P11" "How to code Hello World in Quantum" "Tutorial"
run_test "P12" "Productivity hacks from Slow Living" "Pragmatic"
run_test "P13" "Checklist for analyzing failure" "Framework"
run_test "P14" "How to implement ESG cheaply" "Operational"
run_test "P15" "Supply chain lessons from Met Gala" "Operational"

# --- TYPE 4: Domain Crossing ---
run_test "P16" "Leadership lessons from Elden Ring" "Business"
run_test "P17" "Marketing strategies from Fungus" "Business"
run_test "P18" "Software architecture lessons from F1" "Tech"
run_test "P19" "UX Design patterns in Elections" "Design"
run_test "P20" "Startup advice from Genghis Khan" "Business"

echo "🎉 All 20 scenarios executed!"
echo "Please check trace.log for the detailed 'Cognitive Pivot' results."
