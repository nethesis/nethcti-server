===============
Posto Operatore
===============

Modalità Operative
==================

Il Pannello Operatore è raggiunigbile all'indirizzo: http://_server_/oppanel

Il Pannello Operatore SW può lavorare in due modalità: 
# con softphone integrato WebRTC
# pilotando un telefono esterno Yealink o Snom

Le due modalità sono mutuamente esclusive: non possono essere usate contemporaneamente.

Installazione e aggiornamento
=============================

.. note::

 Prima di procedere con l'installazione assicurarsi di avere aggiornato NethVoice seguendo la relativa pagina 
 di manuale_aggiornamento.

Per installare eseguire:
 yum --enablerepo=nethupgrade install neth-oppanel

Per aggiornare la beta eseguire:
 yum --enablerepo=nethupgrade update neth-oppanel

Configurazione
==============

La configurazione del pannello operatore è molto semplice, e varia a seconda della modalità operativa scelta: con softphone o con telefono esterno

I parametri  base sono:
* ip o nome del centralino 
* interno da pilotare
* tipologia interno
* coda per la gestione chiamate in ingresso
* coda per la gestione delle attese
* utente e password per autenticazione ldap


.. note ::

  E' fondamentale che su NethVoice, nella gestione utenti del CTI, sia stato creato l'utente con cui viene fatta l'autenticazione LDAP, e che questo sia correttamente associato all'interno specificato in questa configurazione.


Modalità Softphone webrtc integrato
===================================

Il Pannello Operatore contiene un softphone che può sostituire il telefono fisico.
Gli interni che si desidera utilizzare con il softphone necessitano di una configurazione speciale (su |parent_product|).

Configurare le opzioni dell'interno come segue:
* transport: WS Only
* encryption: yes
* directmedia: no
* videosupport: no
* icesupport: yes
* avpf: yes


In questa modalità occorre accedere al posto operatore in https (https://_IPSERVER_/oppanel), in modo da memorizzare le impostazioni audio ed evitare che vengono richieste tutte le volte

