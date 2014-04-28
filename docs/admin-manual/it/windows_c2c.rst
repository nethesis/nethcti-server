==================
Click2Call Windows
==================

Introduzione
============

**NethCTI Click2Call** per **Windows** è il programma che consente di
telefonare tramite la semplice pressione del tasto F11
(personalizzabile) della tastiera dopo aver selezionato il numero da
chiamare.

Versioni di Windows compatibili: Windows XP, Windows Vista, Windows 7 e
Windows 8.

Requisiti
=========

Richiede il server proxycti (1.2.1 < versione >= 1.3.x)

Installazione
=============

È sufficiente effettuare il download dell'installer
ed eseguirlo. Terminata la fase d'installazione il programma verrà
avviato automaticamente.

Aggiornamento
=============

Prima di eseguire l'installer è necessario arrestare il programma
correntemente in esecuzione: cliccare la voce *Esci* del menù della
system tray.

Descrizione
===========

NethCTI Click2Call è sempre visibile tramite l'icona presente nella
system tray di Windows e cliccando col tasto destro del mouse su di essa
è disponibile un menu con voci multiple.

Per **effettuare una chiamata** è sufficiente selezionare il numero
telefonico in una qualsiasi parte del sistema operativo e premere la
combinazione di tasti scelta (di default è il tasto **F11**).

In questo modo verrà eseguita una richiesta HTTP al server proxycti con
il seguente formato:

::

    http://<SERVER>:<PORT>/click2call?ext=<EXTENSION>&pwd=<PWD>&to=<NUM_TO_CALL>

In qualsiasi momento è possibile **sospendere** l'attività di NethCTI
Click2Call tramite la voce *"Sospendi Hotkeys"* del menù che appare
dall'icona della system tray. L'icona diventerà di colore rosso.

.. note::

   La funzionalità non è supportata durante l'utilizzo di programmi di teleassistenza (Teamviewer, Nethcontrol, Putty). In tal caso sospendere l'attività

Configurazione
==============

È necessaria solamente la prima volta. I dati da inserire sono:

-  *interno telefonico*
-  *password*
-  *indirizzo del server proxycti*

In qualsiasi momento è possibile modificare la configurazione cliccando
la voce *"Configurazione"* presente nel menu che appare dall'icona
presente nella system tray di Windows.

Attraverso la modifica manuale del file di configurazione è inoltre
possibile cambiare i seguenti parametri:

-  ***porta di connessione al server proxycti***

-  ***hotkey:*** è il tasto utilizzato per effettuare le chiamate (F11 è
   il default). È possibile utilizzare le comuni keyword *CTRL, ALT,
   SHIFT e WIN* unite dal segno '+' e seguite dal tasto scelto.
   Sintassi: [CTRL+][SHIFT+][ALT+] TASTO. Esempi:

   -  per telefonare tramite la pressione del tasto CTRL, SHIFT e C è
      sufficiente inserire *"CTRL+SHIFT+C"* alla voce *hotkey*
   -  per telefonare tramite il tasto F5 è sufficiente inserire *"F5"*

Il file di configurazione è accessibile aprendo il menù *Programmi* di
Windows, cliccano la voce *NethCTI Click2Call* e *Configurazione*.

.. note:: Dopo ogni modifica manuale al file di configurazione è necessario riavviare il programma

Rimozione
=========

È sufficiente aprire il menu *Programmi* di Windows, cliccare la voce
*NethCTI Click2Call* e *Disinstalla NethCTI Click2Call*.

Riavvio
=======

È necessario selezionare la voce *"Esci"* presente nel menu dell'icona
situata nella system tray e riavviare il programma tramite il menù
*Start* di Windows.

