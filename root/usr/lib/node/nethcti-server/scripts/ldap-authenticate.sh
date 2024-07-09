#!/usr/bin/env sh

if [ $# -ne 2 ]; then
    echo "No username/password provided or too many parameters passed."
    exit 1
fi

if [ "$NETHVOICE_LDAP_SCHEMA" = "rfc2307" ]; then
    exec ldapsearch \
        -x \
        -s base \
        -b "$NETHVOICE_LDAP_BASE" \
        -H "ldap://$NETHVOICE_LDAP_HOST:$NETHVOICE_LDAP_PORT" \
        -D "uid=$1,ou=People,$NETHVOICE_LDAP_BASE" \
        -w "$2" >  /dev/null
elif [ "$NETHVOICE_LDAP_SCHEMA" = "ad" ]; then
	if echo "$NETHVOICE_LDAP_USER" | grep -q '@' ; then
        NETHVOICE_AD_DOMAIN=$(echo "$NETHVOICE_LDAP_USER" | sed 's/.*@\(.*\)/\1/')
	else
	    NETHVOICE_AD_DOMAIN=$(echo "$NETHVOICE_LDAP_USER" | tr '[:upper:]' '[:lower:]' | rev | sed 's/\(.*\)=cd.*/\1/;s/=cd,/./g' | rev)
    fi
	exec ldapsearch \
        -x \
        -s base \
        -b "$NETHVOICE_LDAP_BASE" \
        -H "ldap://$NETHVOICE_LDAP_HOST:$NETHVOICE_LDAP_PORT" \
        -D "$1@$NETHVOICE_AD_DOMAIN" \
        -w "$2" > /dev/null
else
    echo "Unknown LDAP schema"
    exit 1
fi