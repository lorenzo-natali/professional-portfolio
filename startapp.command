#!/bin/zsh

cd "$(dirname "$0")" || {
  echo "Could not change to the app directory."
  read -k 1 "?Press any key to close this window..."
  exit 1
}

npm run dev
status=$?

if [ $status -ne 0 ]; then
  echo
  echo "The development server exited with status $status."
  read -k 1 "?Press any key to close this window..."
fi
