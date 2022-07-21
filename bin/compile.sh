#!/bin/bash

timestamp="$1"
syntax="$2"

case $syntax in
'clike')
  gcc -x c - -o "$1" 2>&1 && echo -e "\n\n\n" && ./"$1" 2>&1
  rm "$1" 2>/dev/null
  ;;
'python')
  python3
  ;;
'javascript')
  node
  ;;
'ruby')
  ruby
  ;;
'haskell') # doesnt work
  hs
  ;;
'r') # doesnt work
  r
  ;;
'less')
  lessc --no-color -
  ;;
'rust')
  rustc -
  ./rust_out
  rm rust_out
  ;;
esac 

