
include ../common/Makefile.common

checkout:
	cd proxycti/root/usr/lib/node; git clone ssh://svn.nethesis.it/var/git/asterisk-proxy proxycti
