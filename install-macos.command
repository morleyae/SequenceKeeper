#!/bin/bash

set -u

SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions/SequenceKeeper"

printf 'SequenceKeeper Installer for macOS\n'
printf '===================================\n\n'
if [[ ! -f "$SOURCE_DIR/CSXS/manifest.xml" ]]; then
  printf 'Installer files are incomplete.\n'
  exit 1
fi
if [[ "$SOURCE_DIR" == "$TARGET_DIR" ]]; then
  printf 'Run this installer from the extracted SequenceKeeper folder, not the installed folder.\n'
  exit 1
fi

printf 'Premiere Pro wird während der Installation geschlossen.\n'
printf 'Installationspfad: %s\n\n' "$TARGET_DIR"
printf 'Enter zum Fortfahren, Control+C zum Abbrechen: '
read -r _

if ! mkdir -p "$TARGET_DIR" || ! ditto "$SOURCE_DIR" "$TARGET_DIR"; then
  printf '\nInstallation fehlgeschlagen. Prüfe die Schreibrechte des Installationsordners.\n'
  exit 1
fi
if ! defaults write com.adobe.CSXS.11 PlayerDebugMode 1; then
  printf '\nDateien wurden kopiert, CEP konnte aber nicht aktiviert werden.\n'
  printf 'Im Terminal ausführen: defaults write com.adobe.CSXS.11 PlayerDebugMode 1\n'
  exit 1
fi

printf '\nInstallation abgeschlossen. Starte Premiere Pro neu und öffne Window > Extensions (Legacy) > SequenceKeeper.\n'