#!/bin/bash -x
if [[ -z $1 ]] ; then 
    BRANCH="master";
else 
    BRANCH=$1
fi
git archive --format=tar --remote=ssh://git.nethesis.it/var/git/nethcti-server.git $BRANCH | gzip > nethcti-server-source.tar.gz
tar -zcf nethcti-server.tar.gz nethcti-server
