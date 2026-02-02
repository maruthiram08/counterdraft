#!/bin/bash

# Extended Golden Set Evaluation Runner (50 Scenarios)
# Executes 50 diverse scenarios against the e2e-simulation endpoint.
# Logs are written to trace.log in the app root.

echo "🚀 Starting Extended Golden Set Evaluation (50 Realistic Hooks)..."
echo "Logs will appear in trace.log"

API_URL="http://localhost:3000/api/test/e2e-simulation"

run_test() {
    id=$1
    query=$2
    intent=$3
    echo "Running [$id] Hook: '$query' (Intent: $intent)..."
    # URL encode params (basic)
    encoded_query=$(echo "$query" | sed 's/ /+/g')
    encoded_intent=$(echo "$intent" | sed 's/ /+/g')
    
    curl -s "${API_URL}?q=${encoded_query}&intent=${encoded_intent}" > /dev/null
    echo "✅ [$id] Complete"
    sleep 0.5 # Small pause
}

# --- TYPE 1: Tone Inversion (12) ---
# Intent: Criticism/Optimism
run_test "E1" "Why I stopped writing unit tests" "Criticism"
run_test "E2" "I love merge conflicts" "Optimism"
run_test "E3" "In defense of technical debt" "Optimism"
run_test "E4" "The tyranny of documentation" "Criticism"
run_test "E5" "The problem with Clean Code" "Criticism"
run_test "E6" "Why slow websites sell better" "Optimism" # Counter-intuitive
run_test "E7" "The beauty of spaghetti code" "Optimism"
run_test "E8" "Why you should optimize for churn" "Optimism"
run_test "E9" "Why mentorship is a waste of time" "Criticism"
run_test "E10" "The toxic positivity of high performance teams" "Criticism"
run_test "E11" "Stop trying to learn from failure" "Criticism"
run_test "E12" "Embracing legacy systems" "Optimism"

# --- TYPE 2: Abstraction (12) ---
# Intent: Philosophy
run_test "E13" "Kubernetes as a metaphor for society" "Philosophy"
run_test "E14" "The zen of Javascript" "Philosophy"
run_test "E15" "Meditation on the loading spinner" "Philosophy"
run_test "E16" "Binary thinking in a non-binary world" "Philosophy"
run_test "E17" "The existential dread of infinite scrolling" "Philosophy"
run_test "E18" "Coding as a spiritual practice" "Philosophy"
run_test "E19" "The theology of Open Source" "Philosophy"
run_test "E20" "Git history as memory" "Philosophy"
run_test "E21" "The phenomenology of clicks" "Philosophy"
run_test "E22" "Serverless computing and the void" "Philosophy"
run_test "E23" "Debugging the universe" "Philosophy"
run_test "E24" "Algorithms as divine judgement" "Philosophy"

# --- TYPE 3: Concretization (13) ---
# Intent: Operational/Metrics/Framework
run_test "E25" "Operationalizing empathy at scale" "Operational"
run_test "E26" "The ROI of kindness" "Metrics"
run_test "E27" "A framework for building trust" "Framework"
run_test "E28" "Scaling intimacy in remote teams" "Operational"
run_test "E29" "The unit economics of patience" "Metrics"
run_test "E30" "How to engineer serendipity" "Process"
run_test "E31" "Debugging your team culture" "Tutorial"
run_test "E32" "Psychological safety checklist" "Tutorial"
run_test "E33" "The Joy KPI" "Framework"
run_test "E34" "Refactoring organizational trauma" "Operational"
run_test "E35" "Measuring respect in code reviews" "Metrics"
run_test "E36" "A daily workflow for gratitude" "Tutorial"
run_test "E37" "SLA for ambiguity" "Framework"

# --- TYPE 4: Domain Crossing (13) ---
# Intent: Cross-Domain Application
run_test "E38" "Managing dating like a supply chain" "Life"
run_test "E39" "Applying DevOps to cooking dinner" "Life"
run_test "E40" "UX design patterns for parenting" "Life"
run_test "E41" "Orchestrating your day with Kubernetes" "Productivity"
run_test "E42" "Security groups for your relationships" "Life"
run_test "E43" "Agile methodology for writing a novel" "Art"
run_test "E44" "Distributed consensus in local politics" "Society"
run_test "E45" "Game theory strategies for salary negotiation" "Career"
run_test "E46" "The thermodynamics of burnout" "Science"
run_test "E47" "Biological evolution in startup growth" "Business"
run_test "E48" "Military tactics for customer support" "Business"
run_test "E49" "Software architecture for financial planning" "Finance"
run_test "E50" "Incident response for daily life" "Life"

echo "🎉 All 50 extended scenarios executed!"
echo "Please check trace.log for detailed results."
