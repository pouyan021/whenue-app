#!/usr/bin/env bash
# One command from a running backend to the camera screen on the Android emulator:
# boots an emulator if none is running, points its localhost at this machine, makes a
# fresh visit link on the local whenue-api, starts Metro and opens the link in Expo Go.
#
#   npm run android:dev            open the record screen
#   npm run android:dev -- --visit open the visit screen, as tapping the link would
#
# Settings (all optional):
#   WHENUE_AVD           emulator to boot; default the first one Android Studio lists
#   WHENUE_FRONT_CAMERA  front camera for an emulator this script boots; default webcam0
#                        (your computer's webcam). Use `emulated` or `none` without one.
#   ANDROID_HOME         Android SDK folder; default Android Studio's location
# Plus the WHENUE_* settings of scripts/dev-visit-link.mjs.
set -euo pipefail

cd "$(dirname "$0")/.."

screen=record
case "${1:-}" in
  --visit) screen=visit ;;
  '') ;;
  *) echo "Usage: $0 [--visit]" >&2; exit 2 ;;
esac

die() { echo "error: $*" >&2; exit 1; }
step() { echo "==> $*"; }

# npm records the installed tree in node_modules/.package-lock.json; a newer package-lock.json
# means someone added or bumped a package since the last install
if [[ ! -f node_modules/.package-lock.json || package-lock.json -nt node_modules/.package-lock.json ]]; then
  step "Installing packages (package-lock.json changed)"
  npm install
fi

sdk="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [[ -z "$sdk" ]]; then
  for candidate in "$HOME/Library/Android/sdk" "$HOME/Android/Sdk"; do
    [[ -d "$candidate" ]] && sdk="$candidate" && break
  done
fi
[[ -n "$sdk" && -d "$sdk" ]] || die "Android SDK not found. Install Android Studio, or set ANDROID_HOME."
adb="$sdk/platform-tools/adb"
emulator="$sdk/emulator/emulator"
[[ -x "$adb" ]] || die "adb not found at $adb. Install Android SDK Platform-Tools in Android Studio's SDK Manager."

running_emulator() { "$adb" devices | awk '$1 ~ /^emulator-/ && $2 == "device" { print $1; exit }'; }

serial="$(running_emulator)"
if [[ -z "$serial" ]]; then
  [[ -x "$emulator" ]] || die "Android Emulator not found at $emulator. Install it in Android Studio's SDK Manager."
  avd="${WHENUE_AVD:-$("$emulator" -list-avds | grep -v '^INFO' | head -n 1)}"
  [[ -n "$avd" ]] || die "No virtual device yet. Create one in Android Studio's Device Manager."
  step "Booting emulator $avd"
  mkdir -p .expo
  nohup "$emulator" -avd "$avd" -camera-front "${WHENUE_FRONT_CAMERA:-webcam0}" -camera-back virtualscene \
    > .expo/emulator.log 2>&1 &
  for _ in $(seq 1 60); do
    serial="$(running_emulator)"
    [[ -n "$serial" ]] && break
    kill -0 $! 2> /dev/null || die "The emulator quit. See .expo/emulator.log."
    sleep 2
  done
  [[ -n "$serial" ]] || die "The emulator did not come up within 2 minutes. See .expo/emulator.log."
fi
adb_s() { "$adb" -s "$serial" "$@"; }

step "Waiting for $serial to finish booting"
until [[ "$(adb_s shell getprop sys.boot_completed 2> /dev/null | tr -d '\r')" == 1 ]]; do sleep 2; done

# The API, the storage host in presigned upload URLs, and Metro
step "Pointing the emulator's localhost:8080, 9000 and 8081 at this machine"
for port in 8080 9000 8081; do adb_s reverse "tcp:$port" "tcp:$port" > /dev/null; done

step "Creating a visit link on whenue-api"
token="$(node scripts/dev-visit-link.mjs)"
path="visit/$token"
[[ "$screen" == record ]] && path="$path/record"
link="exp://127.0.0.1:8081/--/$path"
echo "    whenue://$path"

expo_go_installed() { adb_s shell pm path host.exp.exponent 2> /dev/null | grep -q package:; }

# Opens the link once Metro is up and Expo Go is installed, while Expo's CLI keeps the terminal
open_link() {
  until curl -fs http://localhost:8081/status 2> /dev/null | grep -q running; do sleep 1; done
  until expo_go_installed; do sleep 2; done
  # Saves tapping Allow on the first run; the app still asks if this does not take
  adb_s shell pm grant host.exp.exponent android.permission.CAMERA 2> /dev/null || true
  adb_s shell pm grant host.exp.exponent android.permission.RECORD_AUDIO 2> /dev/null || true
  # Give Expo Go a moment if `--android` just launched it, so the link lands after it
  sleep 3
  adb_s shell am start -a android.intent.action.VIEW -d "$link" > /dev/null
  echo "==> Opened $link"
}
open_link &
opener=$!
trap 'kill $opener 2> /dev/null || true' EXIT

expo_args=(start --port 8081)
# Expo's CLI installs Expo Go when the emulator does not have it yet
expo_go_installed || expo_args+=(--android)
step "Starting Metro (press r to reload, Ctrl+C to stop)"
npx expo "${expo_args[@]}"
