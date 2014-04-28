=============
Installazione
=============

Per installare eseguire: ::

  yum --enablerepo=nethupgrade install nethcti-server

In caso di aggiornamento eseguire: ::

  service proxycti stop
  mkdir -p /home/e-smith/nethcti/backup
  mysqldump nethcti > /home/e-smith/nethcti/backup/nethcti.sql 2>/dev/null
  mysqldump asterisk > /home/e-smith/nethcti/backup/asterisk.sql 2>/dev/null
  rm -f /etc/nethcti/user_prefs.json /etc/nethcti/asterisk.json 2>/dev/null
  yum --enablerepo=nethupgrade update nethcti-server 


Dall'interfaccia grafica di configurazione di NethVoice, cliccare il pulsante "Applica cambiamenti", se presente.


Aggiornamento
=============


     Note di aggiornamento da NethCTI 1.x: 

In caso di aggiornamento dalla release 1.x, è possibile migrare il database dei dati con il seguente comando:
 /usr/lib/node/nethcti-server/docs/migratedb.js `config getprop nethcti-server DbPasswd`

Durante la fase di aggiornamento i dati del CTI (rubriche, postit, ecc) vengono convertiti automaticamente al nuovo formato.

La configurazione deve essere comunque rifatta a mano.


