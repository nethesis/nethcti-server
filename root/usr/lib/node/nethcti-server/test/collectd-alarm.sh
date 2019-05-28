#!/bin/bash
/usr/bin/echo -e "PUTNOTIF host=$(hostname) type=queuefewop type_instance=252 severity=warning time=$(date +%s) message=\"foo bar\"" | /usr/bin/nc -U /var/run/collectd.sock
echo "alarm \"queuefewop\" alarm emitted with severity \"warning\""