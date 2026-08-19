#!/usr/bin/env bash
# API smoke — drives the Express service in server/ end to end over HTTP.
#
#   .claude/skills/run-flygaca/api-smoke.sh [http://localhost:8080]
#
# Registers a throwaway user, then exercises the session cookie against the
# account routes. Prints one line per check and exits non-zero on the first
# failure. Requires the API and its Postgres to be up (see SKILL.md).
#
# macOS ships bash 3.2, so this avoids two things that silently misbehave there:
# chained `local a=1 b=$a` (the second sees an empty `a`), and inline JSON
# literals in a command substitution (brace expansion splits `{"a":1,"b":2}`
# into separate arguments). JSON therefore goes through a variable, always.
set -uo pipefail

API="${1:-http://localhost:8080}"
JAR="$(mktemp -t flygaca-jar)"
EMAIL="smoke-$$@flygaca.test"
fails=0

req() { curl -s -b "$JAR" -c "$JAR" -w $'\n%{http_code}' "$@"; }
post() { req -X POST "$API$1" -H 'Content-Type: application/json' -d "$2"; }

# Failures print the response body: the routes answer with a machine code
# (`auth/weak-password`, `not-found`), which is the only useful thing to see.
check() {
  local label="$1"
  local expect="$2"
  local body="$3"
  local code
  local payload
  code="${body##*$'\n'}"
  payload="${body%$'\n'*}"
  if [ "$code" = "$expect" ]; then
    echo "PASS $label ($code)"
  else
    echo "FAIL $label — expected $expect, got ${code:-none}: ${payload:0:200}"
    fails=$((fails + 1))
  fi
}

check "healthz reports the database up" 200 "$(req "$API/healthz")"

body='{"email":"'"$EMAIL"'","password":"hunter2hunter2","displayName":"Smoke"}'
check "register mints a session" 201 "$(post /api/auth/register "$body")"

check "session echoes the new user" 200 "$(req "$API/api/auth/session")"

body='{"email":"weak@flygaca.test","password":"short"}'
check "a weak password is rejected" 400 "$(post /api/auth/register "$body")"

body='{"id":"smoke-1","date":"2026-03-04","type":"C172","reg":"HZ-SMK","from":"OERK","to":"OEDF","total":"2.1","pic":"2.1","night":"0","ifr":"0","ldg":"1","remarks":"api smoke"}'
check "logbook accepts a flight" 201 "$(post /api/account/logbook "$body")"

account="$(req "$API/api/account/")"
check "account read returns the flight" 200 "$account"
case "$account" in
  *HZ-SMK*) echo "PASS flight round-tripped through Postgres" ;;
  *) echo "FAIL flight missing from account payload"; fails=$((fails + 1)) ;;
esac

body='{"email":"'"$EMAIL"'","topic":"smoke"}'
check "waitlist capture" 201 "$(post /api/waitlist "$body")"

check "logout clears the cookie" 200 "$(req -X POST "$API/api/auth/logout")"
check "session is anonymous after logout" 200 "$(req "$API/api/auth/session")"

# An unauthenticated account read must not 200 — that is the whole access model.
check "account is closed to anonymous callers" 401 "$(curl -s -w $'\n%{http_code}' "$API/api/account/")"

rm -f "$JAR"
echo
if [ "$fails" -eq 0 ]; then echo "api-smoke: all checks passed"; else echo "api-smoke: $fails check(s) failed"; fi
exit $((fails > 0))
