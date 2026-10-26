#!/bin/bash

set -e

src=.
dest=output_build
mkdir $dest


cp $src/moment.js $dest
cp $src/moment.d.ts $dest
cp $src/package.json $dest
cp $src/README.md $dest
cp $src/CHANGELOG.md $dest
cp $src/LICENSE $dest
cp -r $src/locale $dest
cp -r $src/min $dest
cp -r $src/src $dest && rm -r $dest/src/test
cp $src/ender.js $dest
cp $src/package.js $dest
cp $src/.npmignore $dest
cp -r $src/ts3.1-typings $dest
cp -r $src/dist $dest


echo "Check out $dest"
