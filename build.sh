#!/bin/bash
rm -rf .angular
npm link sb-shared-lib
ng build --configuration production --base-href="/workbench/"
touch manifest.json && rm -f web.app && cp manifest.json dist/symbiose/ && cd dist/symbiose && zip -r ../../web.app * && cd ../..
cat web.app | md5sum | awk '{print $1}'