#!/bin/bash
if [ $# -eq 0 ]; then
  echo "use: $0 <QUEUE_NUMBER>"
  exit 1
fi
QUEUE=$1
/usr/bin/echo -e "PUTNOTIF host=$(hostname) type=queuefewop type_instance=$QUEUE severity=warning time=$(date +%s) message=\"foo bar\"" | /usr/bin/nc -U /var/run/collectd.sock
echo "alarm \"queuefewop\" alarm emitted with severity \"warning\" for QUEUE $QUEUE"