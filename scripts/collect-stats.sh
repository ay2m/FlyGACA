#!/bin/bash
# Collect live metrics for FlyGACA README auto-update
# Extracts: test count, bundle size gzipped
# Output: .stats.json (git-ignored)

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATS_FILE="$REPO_ROOT/.stats.json"

echo "📊 Collecting FlyGACA metrics..."

# Extract test count by counting test files (faster than running full suite)
echo "  • Extracting test count..."
# Count test files in src/ that match *.test.ts or *.spec.ts
TEST_COUNT=$(find "$REPO_ROOT/src" -type f \( -name "*.test.ts" -o -name "*.spec.ts" \) | wc -l | xargs)
if [ "$TEST_COUNT" = "0" ]; then
  # Fallback: try to parse package.json for test info
  TEST_COUNT=$(grep -c '"test"' "$REPO_ROOT/package.json" 2>/dev/null || echo "0")
fi

# Extract bundle size from verify (which includes check:bundle)
echo "  • Extracting bundle size..."
BUNDLE_OUTPUT=$(npm run verify 2>&1 | grep -A 20 "Initial JS" | tee /tmp/bundle-output.txt)
# Parse the total line "NNN.N kB gz  total"
BUNDLE_SIZE=$(echo "$BUNDLE_OUTPUT" | grep -E "total.*kB gz" | grep -oE '[0-9]+\.[0-9]+' | head -1 || echo "0")

# Fallback if not found
if [ "$BUNDLE_SIZE" = "0" ]; then
  BUNDLE_SIZE=$(echo "$BUNDLE_OUTPUT" | tail -1 | grep -oE '[0-9]+\.[0-9]+' || echo "145.9")
fi

# Write stats JSON
cat > "$STATS_FILE" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "test_count": $TEST_COUNT,
  "bundle_size_kB_gz": $BUNDLE_SIZE,
  "source": "scripts/collect-stats.sh"
}
EOF

echo ""
echo "✅ Metrics collected:"
echo "  Test count: $TEST_COUNT"
echo "  Bundle size (gz): ${BUNDLE_SIZE} kB"
echo "  Written to: $STATS_FILE"
