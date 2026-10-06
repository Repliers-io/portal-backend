#!/usr/bin/env bash

# Script to check the number of files in TypeScript and JavaScript migration directories.
# Return code is 0 if both directories have the same number of files, 1 otherwise.
# Should be used as a decision maker, whether there is need to run npm run build before migration or not

TS_MIGRATIONS="./src/migrations"
JS_MIGRATIONS="./dist/migrations"

if [ ! -d "$TS_MIGRATIONS" ] || [ ! -d "$JS_MIGRATIONS" ]; then
   echo "All migrations are built, proceed to migration"
   exit 0
fi

count1=$(find "$TS_MIGRATIONS" -type f | wc -l)
count2=$(find "$JS_MIGRATIONS" -type f | wc -l)

if [ "$count1" -eq "$count2" ]; then
   echo "Both directories have the same number of files."
   exit 0
else
   echo "There are new migrations in ts directory which don't exist in js directory, please run \033[1mnpm run build\033[0m before migration"

   if [ -t 0 ]; then
      # Interactive terminal available
      read -p "Run it now? " -n 1 -r
      echo
      if [[ $REPLY =~ ^[Yy]$ ]] || [[ $ALL_YES ]]; then
         npm run build
         exit 0
      fi
      exit 1
   else
      # Non-interactive (Heroku, CI, etc.)
      echo "Non-interactive mode detected, running build automatically..."
      npm run build
      exit 0
   fi
fi