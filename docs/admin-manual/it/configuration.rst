==============
Configurazione
==============

Il pacchetto che consente di configurare il CTI è nethcti-nethvoice-module e viene installato automaticamente come dipendenza.

È necessario riconfigurare gli utenti del CTI (si veda la sezione "Server: prima configurazione").



Al termine dell'installazione è necessario collegarsi alla pagina di configurazione di NethVoice (http://_server_/nethvoice) e cliccare su "Applica modifiche". Procedere quindi con la configurazione del CTI.

NethCTI2 introduce il concetto di ''Presence'' che ruota intorno all'utente: ogni utente ha associati degli endpoint (interni, e-mail, cellulare, chat, ecc) presso cui è raggiungibile. Il CTI è in grado di fornire una visione d'insieme dello stato dell'utente. 

L'autenticazione all'interno di NethCTI avviene con le credenziali dell'utente di sistema. Quindi, ogni utente che deve accedere al CTI, deve essere anche un utente di sistema.

Ciascun utente ha associato un profilo. Un profilo è composto da uno o più permessi che descrivono quello che l'utente può fare all'interno del CTI.
Ogni utente deve inoltre obbligatoriamente essere associato ad un interno telefonico.

Oltre alla lista sopra citata, ciascun utente ha dei permessi aggiuntivi che comprendono:
* lista delle schede clienti personalizzate
* lista dei video in streaming (citofoni, ecc)
* lista dei gruppi utenti

Si consiglia di seguire quest'ordine per la configurazione:
* creazione delle sorgenti di streaming (opzionale)
* creazione delle customer card personalizzate (opzionale)
* creazione degli utenti senza profilo associato
* creazione dei gruppi del pannello operatore
* creazione dei profili comprendenti permessi, schede cliente, streaming e gruppi
* associazione dei profili a ciascun utente

Infine è possibile configurare la modalità di invio SMS.




Questo modulo per NethVoice consente di configurare il CTI. In
particolare è possibile definire l'accesso ad ogni funzione del CTI per
ogni interno. Il modulo contiene sei pagine: *Customer Cards, Etichette
linee esterne, Gruppi pannello operatore, Permessi, SMS, Streaming.*

Customer Cards
==============

Questa pagina consente di creare e modificare delle customer card. Una
customer card è un modulo che consente di definire una query ad un
database (locale o remoto) al momento dell'arrivo di una chiamata e di
mostrare in NethCTI il risultato.

-  **Nome**: è il nome della customer card, deve essere diverso da
   quello di altre customer card salvate. *Default* e *Calls* sono nomi
   riservati alle customer card di default.
-  **Tipo di database**: è il tipo di database dove verrà effettuata la
   query. Al momento sono supportati *mysql* è *mssql*.
-  **Porta Database**: è la porta usata per raggiungere il database. Nel
   caso di database locale su Nethservice è possibile utilizzare una
   sock al posto della porta (chiusa di default) =>
   /var/lib/mysql/mysql.sock
-  **Host**: è l'host che ospita il database
-  **Query**: è la query da effettuare
-  **Visibile di default** Se questo campo è abilitato, automaticamente
   tutti gli interni saranno abilitati a visualizzare la customer card.
   Sarà comunque possibile ridefinire i permessi per ogni singolo
   interno nella pagina **Configurazione CTI**

Esempio
-------

L'esempio seguente crea una customer card *"ticket"* che, all'arrivo di
una chiamata, mostra in NethCTI i risultati di una query effettuata sul
database di otrs:

+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **Nome:** ticket                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **Nome Visualizzato:** ticket                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **Tipo di database:** mysql                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **Porta Database:** /var/lib/mysql/mysql.sock                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **Nome Database:** otrs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **Database Username:** otrs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **Database Password:**' \*\*\*\*\*\*\*\*                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **Query:** SELECT T.title as Titolo, date\_format(T.create\_time,'%d/%m/%Y %H:%i') as c\_time, date\_format(T.change\_time,'%d/%m/%Y %H:%i') as m\_time, concat(U.first\_name,' ',U.last\_name) as gestore, 'Cliente', TS.name as stato, lp from ticket T inner join customer\_user CU on T.customer\_user\_id=CU.login inner join ticket\_state TS on T.ticket\_state\_id=TS.id inner join users U on T.change\_by=U.id where (CU.phone like '%$EXTEN%' or CU.phone2 like '%$EXTEN%' or CU.phone3 like '%$EXTEN%' or CU.phone4 like '%$EXTEN%' or CU.phone5 like '%$EXTEN%') limit 10;   |
+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **Visibile di default:** True                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
+-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

Permessi
========

Questa pagina mostra tre tabelle. Nella prima tabella è possibile
definire, per ogni interno, i permessi per ogni funzione del CTI

-  **Rubrica** Consente di visualizzare la rubrica
-  **Chiamate in ingresso** Visualizza le chiamate in entrata
-  **Chiamate in uscita** Visualizza le chiamate in uscita
-  **Trasferimento** Consente di abilitare il trasferimento di chiamata
-  **Registra** Permette di registrare le chiamate
-  **Registro chiamate** Permette di visualizzare lo storico delle
   chiamate
-  **Operatore Base** Permette di utilizzare le funzioni operatore
-  **Operatore Avanzato** Abilita le funzioni operatore più "delicate"
   (ascolto delle chiamate ed intromissione)
-  **Chat** Permette di utilizzare il client chat integrato
-  **Servizi Telefonici** consente di impostare: avviso di chiamata, non
   disturbare, inoltro di chiamata, casella vocale
-  **Privacy** se disabilitato, nasconde le ultime cifre dei numeri
-  **SMS** Permette all'utente di inviare sms
-  **Voicemail** Permette di consultare le vocemail, impostare messaggi
   personalizzati di casella vocale e abilitare/disabilitare la
   redirezione incondizionata alla casella vocale

La seconda tabella consente di definire i permessi delle customer card.
Di default sono presenti la customer card che ricerca nella rubrica
(Vcard) e quella che consente la visualizzazione dello storico delle
chiamate (Log Chiamate). Per definire customer card personalizzate,
vedere `Configurazione Customer Card <NethCTI_Customer_Card>`__. Dopo
averle create, verranno mostrate in questa tabella e sarà possibile
definire i permessi per interno.

La terza tabella, **"Configurazione globale pannello operatore"**
permette di decidere se saranno visibili le schede *Linee esterne, Code,
Parcheggio e Interni* nel pannello operatore. Queste opzioni sono
*globali*, avranno effetto per tutti gli utenti.

SMS
===

Questa pagina consente la configurazione della modalità d'invio degli
SMS.

-  **Tipo**: È possibile inviare SMS tramite degli operatori esterni
   *(http)* o utilizzando il *Portech*. La prima opzione è quella
   consigliata. Nel menù sono presenti alcuni operatori, con dei
   template di url predefiniti.
-  **Username**: login richiesto dal tipo d'accesso.
-  **Password**: password richiesta dal tipo d'accesso.
-  **Url**: I parametri necessari all'invio dell'SMS vengono inviati al
   server tramite l'URL (indipendentemente dal metodo GET o POST).
   Quando si configura un server personalizzato è necessario sapere che
   nome devono avere le variabili utente, password, numero e testo.

   -  Per esempio:
      http://www.smshosting.it/smsMaster/invioSmsHttp.do?user\ =$USER&password=$PASSWORD&numero=$NUMBER&testo=$TEXT&test=N
      *(In questo caso, il nome utente si chiama "user" e la password
      "password")*.
   -  Se un ipotetico servizio di hosting chiamasse l'utente "username"
      e la password "pass", l'URL risultante sarebbe del tipo:

      -  http://servizio.com/pagina.php?username\ =$USER&pass=$PASSWORD&numero=$NUMBER&testo=$TEXT

-  **Metodo**: è il metodo per l'invio dei parametri. Se non è
   specificato diversamente dall'operatore, è consigliato l'utilizzo di
   GET.
-  **Prefisso**: è il prefisso internazionale ed è in generale
   obbligatorio (es. 0039 per l'Italia). Una volta configurato, tutti
   gli SMS saranno inviati con tale prefisso (es. in Italia solamente).
   Tuttavia l'utente NethCTI ha la possibilità di specificare un
   prefisso diverso anteponendolo al numero stesso nel campo
   "Destinatario" presente nella finestra d'invio.

-  Alcuni servizi richiedono anche il *mittente* come parametro: è
   sufficiente personalizzare l'URL. Ad esempio se è richiesto il
   parametro *mittente* e voglio che abbia valore *Pippo*, l'URL sarà
   del tipo:
   http://servizio.com/pagina.phpusername\ =$USER&pass=$PASSWORD&numero=$NUMBER&testo=$TEXT&mittente=Pippo

**Modalità d'invio tramite Portech:** gli SMS non verranno inoltrati
immediatamente, ma accodati. Ogni cinque minuti uno script si occupa
d'inviarli a destinazione in maniera sequenziale e di registrare l'esito
dell'operazione nel database. Tale modalità è dovuta alle limitazioni
dell'apparato. Nel campo Url si dovrà inserire *l'indirizzo IP del
Portech*.

.. raw:: mediawiki

   {{Nota|Se si utilizza il portech modello MV-374 è necessario specificare anche la porta 8023 nel campo Url. Se ad esempio l'IP del dispositivo è 192.168.1.5, l'url deve essere 192.168.1.5:8023}}

**Modalità d'invio tramite Web:** NethCTI è stato testato con il
servizio *smshosting*. A causa della diversa granularità nella gestione
degli errori da parte dei vari operatori, si garantisce l'esito
dell'operazione solo con tale servizio. Tuttavia è possibile utilizzare
liberamente altri gestori, tenendo in cosiderazione che in alcuni casi
l'esito d'invio potrebbe risultare positivo quando in realtà non lo è
(es. prefisso errato). È comunque possibile contattare l'assistenza in
caso di problemi o per la richiesta d'estensione del supporto.

Prefisso per SMS
----------------

*Il prefisso telefonico internazionale per l'invio degli SMS è in
generale obbligatorio.*

È possibile configurarlo in due modi:

#. tramite NethCTI, modificando il campo "Destinatario"
#. nella configurazione lato server che vale per tutti gli utenti
   NethCTI.

**NOTA:** la configurazione tramite il secondo metodo, non preclude la
possibilità per l'utente, di inviare SMS utilizzando un prefisso
diverso. Infatti il prefisso inserito nel campo "Destinatario" , ha
priorità rispetto a quello configurato col metodo due. Se tuttavia
l'utente inserisce un numero telefonico privo di prefisso, allora verrà
utilizzato quello del secondo metodo.

**Esempio 1:** l'amministratore configura il prefisso *0039* tramite il
secondo metodo. L'utente Pippo, tramite NethCTI invia un SMS al numero
*3331234567*. Il risultato è l'inoltro dell'SMS a *00393331234567*.

**Esempio 2:** l'amministratore configura il prefisso *0039* tramite il
secondo metodo. L'utente Pippo, tramite NethCTI invia un SMS al numero
*00303331234567*. Il risultato è l'inoltro dell'SMS a *00303331234567*.

**Esempio 3:** l'amministratore configura il prefisso *vuoto* tramite il
secondo metodo. L'utente Pippo, tramite NethCTI invia un SMS al numero
*3331234567*. Il risultato è l'inoltro dell'SMS a *3331234567*.

Streaming
=========

Da questa pagina è possibile definire le sorgenti di streaming che
verranno poi mostrate in NethCTI. I permessi di ogni sorgente possono
essere definiti per ogni interno.

I parametri per configurare una sorgente streaming sono:

-  **Nome**: è il nome della telecamera. Deve essere unico.
-  **Descrizione**: è l'etichetta che sarà visibile nel client.
-  **Tipo**: per ora l'unico tipo supportato è 2n Helios IP
-  **Url**: è l'indirizzo della sorgente video.

   -  Qui vengono definite anche le dimensioni del video:
      http://INDIRIZZOIP/enu/cameraLARGHEZZAxALTEZZA.jpg
      LARGHEZZAxALTEZZA può assumere i valori 160x120, 320x240, 352x272,
      352x288, 640x480 Esempio:
      http://192.168.1.123/enu/camera640x480.jpg

-  **Username**
-  **Password**
-  **Framerate**: è la frequenza di refresh delle immagini. Questo
   numero rappresenta i frame mostrati ogni 1/1000 (millesimo) di
   secondo. Per esempio, inserendo 1000 si avrà un frame al secondo, 500
   è uguale a due frame al secondo ...
-  **Interno**: è l'interno assegnato alla videocamera. Questo campo può
   essere omesso.
-  **Comando di apertura**: è il comando per aprire la porta, nel caso
   alla videocamera sia associato un citofono. Questo campo può essere
   omesso.
-  **Visibile di default**: Abilitando questa checkbox la sorgente verrà
   di default resa visibile a tutti gli interni. È comunque possibile
   definire i permessi per ogni singolo utente.

La tabella **Permessi** elenca tutti gli interni. Da qui è possibile per
ogni interni se la videocamera in questione sarà visibile o meno.
