#!/usr/bin/env bash
echoerr() { echo "$@" 1>&2; }
if which node >/dev/null; then
    node ./r.js -o ./build.js
else
    echoerr "ERROR:  node.js is required to build - see https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager"
    exit 1
fi
