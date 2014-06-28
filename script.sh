#!/bin/bash -x
git archive --format=tar --remote=ssh://git.nethesis.it/var/git/nethcti-server.git master_2.1.7_nethserver | gzip > nethcti-server-source.tar.gz
tar -zcf nethcti-server.tar.gz nethcti-server
