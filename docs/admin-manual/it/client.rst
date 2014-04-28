======
Client
======

NethCTI client è una `web
application <http://it.wikipedia.org/wiki/Applicazione_web>`__ che
consente la visualizzazione ed il controllo completo in tempo reale
dell'intero sistema telefonico attraverso una semplice e intuitiva
interfaccia web. È stato sviluppato come estensione del browser `Google
Chrome <http://www.google.it/chrome>`__ (o Chromium) per fornire tutti i
servizi necessari anche successivamente alla chiusura del browser e per
sfruttare le ottime performance offerte dal motore Javascript V8
integrato.


Requisiti
=========

Installazione
=============

Per installare eseguire:
 yum --enablerepo=nethupgrade install nethcti 

Per aggiornare eseguire:
 yum --enablerepo=nethupgrade update nethcti



Prima configurazione
====================

 .. note:: E' necessario che tutti i client risolvano correttamente l'FQDN del server

Cliccando sulla nuova icona presente nella barra degli indirizzi,


viene mostrata la pagina delle opzioni illustrata di seguito.

Server
      

-  *indirizzo server:* nome della macchina su cui è in esecuzione il
   proxycti
-  *porta server:* porta del proxycti. Di default è la 8181

Interno
       

-  *nome utente:* numero dell'interno telefonico (es. 207)
-  *password:* solitamente uguale all'interno (es. 207)
-  *casella vocale:* casella vocale su cui è possibile configurare la
   ridirezione di chiamata

Riconnessione
             

-  *tentativi di riconnessione:* numero di tentativi in caso di problemi
   sulla connessione di rete
-  *intervallo di riconnessione:* intervallo temporale che intercorre
   tra due tentativi di riconnessione

Il click sul popup apre
                       

-  consente la personalizzazione del comportamento del click sul popup
   che compare alla ricezione di una chiamata

Click2Call
          

-  *manuale:* fa squillare il proprio interno telefonico e dopo aver
   sollevato la cornetta verrà inoltrata la telefonata al numero
   destinatario
-  *automatico:* in questo caso la telefonata verrà inoltrata
   immediatamente al destinatario. Questa modalità è possibile
   utilizzando un telefono 'Yealink (T26/T38)' o 'Snom 300' o con altro
   apparato specificando un url

.. note:: Modalità automatica per Yealink T26 a partire dal firmware versione 6.70.0.90 e per Yealink T38.
   È necessario completare il campo ''"TrustedActionURIServerList"'' (Webpage -> Phone Features -> ip_security -> TrustedActionURIServerList)
   con l'elenco degli indirizzi IP da cui il telefono può ricevere comandi tramite Action URI.

   [[File:trustedActionUri.jpg]]

   Ad esempio è possibile inserire l'IP della propria rete LAN con l'ultimo campo uguale ad '*' (es. 192.168.5.*) per abilitare il telefono alla ricezione di comandi da qualsiasi pc della propria rete. Altrimenti elencare gli IP separati da virgole.
  

Chat
    

-  *nome utente:* account jabber. È necessario specificare il dominio
   (es. pippo@nethesis.it)
-  *password:* password d'autenticazione

Il server di chat non è indicato, di default viene utilizzato
l'indirizzo definito nella sezione *server*.

Per utilizzare questo servizio **è indispensabile aver installato
l'addon di `messaggistica istantanea <Ejabberd>`__**

Applicazione
            

-  *apri popup come:* successivamente alla riduzione di chrome in
   systemtray ed al click sul popup di ricezione chiamata, è possibile
   riaprire il NethCTI come nuovo 'tab' della finestra o in modalità
   'app' ovvero a schermo intero
-  *default tab da aprire:* è il servizio da visualizzare una volta
   effettuato il login a NethCTI

Pannello operatore
                  

-  *interni per linea:* numero di interni da mostrare in ciascuna linea
   del pannello operatore
-  *code per linea*
-  *tab default:* nome del tab da aprire in automatico in corrispondenza
   dell'apertura del pannello operatore
-  *ordinamento alfabetico o per numero d'interno*
-  *modalità ultracompatta:* modalità grafica ridotta

Ogni sezione contiene un aiuto da consultare in qualsiasi momento:


Funzionalità di base
====================

È possibile avviare l'applicazione in due modalità differenti:

-  *normale (tab):* NethCTI viene visualizzato all'interno di un tab del
   browser,
-  *application (app):* NethCTI viene visualizzato come *un'applicazione
   desktop standalone* senza la barra degli indirizzi e pulsanti di
   navigazione (comodo ad esempio nel caso in cui il browser predefinito
   per la navigazione sia Internet Explorer o altro).

Non è necessario tenere Chrome aperto: la sua particolare architettura
consente la sopravvivenza dei servizi anche dopo la chiusura del
browser, che rimane visibile nella system tray con la sua icona.

L'applicazione è suddivisa in cinque sezioni:

#. *sezione superiore:* consente l'esecuzione dei comandi d'uso più
   comuni
#. *sezione di sinistra:* è un menù tramite il quale navigare i servizi
   offerti
#. *sezione centrale:* vengono fornite le varie funzionalità
#. *sezione di destra:* fornisce delle liste di contatti veloci e le
   ultime chiamate eseguite/ricevute
#. *sezione inferiore:* visualizza la guida in linea tramite il tasto F1


Gestione telefonate
-------------------

È sufficiente inserire il numero da chiamare nell'apposito box presente
nella parte superiore della pagina e confermare cliccando sull'icona
relativa a forma di cornetta telefonica che appare subito sotto. Se il
testo inserito è un numero di telefono valido, è anche possibile far
partire la telefonata direttamente premendo il tasto invio della
tastiera.


Quando si riceve una telefonata appare un popup che riporta le
informazioni sul mittente ed eventualmente la presenza di note o
prenotazioni sulla chiamata stessa.


.. note:: 

   Le informazioni mostrate nel popup vengono estrapolate dalla rubrica NethCTI e da quella centralizzata secondo il seguente ordine:

   # contatto privato della rubrica NethCTI (solo il creatore del contatto vedrà tali informazioni)
   # contatto presente nella rubrica centralizzata
   # primo contatto pubblico trovato nelle rubrica NethCTI

Alla ricezione/esecuzione di una telefonata compare il seguente box:


che consente l'esecuzione delle seguenti funzionalità:

-  *redirezione*
-  *chiusura*
-  *parcheggio*: libera il telefono inserendo la chiamata corrente in un
   parcheggio. È possibile visualizzare lo stato della chiamata
   parcheggiata attraverso il pannello operatore
-  *registrazione*: avvia/arresta la registrazione della telefonata.
   Lampeggia quando attiva, rimane fissa altrimenti
-  *crea nota*: possibilità di creare una nota/POST-IT che potrà essere
   consultata in seguito
-  *redirezione a casella vocale*: libera il telefono offrendo al
   destinatario la possibilità di lasciare un messaggio vocale. L'utente
   deve essere abilitato a questa funzionalità tramite la configurazione
   lato server
-  *apertura di un URL*: l'URL è parametrizzabile con i dati del
   chiamante

Stato dell'interno
------------------

Nella parte superiore dell'applicazione sono presenti alcune icone che
consentono l'attivazione/disattivazione delle seguenti funzionalità:

-  *non disturbare*,
-  *inoltro di chiamata incondizionato verso casella vocale*,
-  *inoltro di chiamata incondizionato verso il numero cellulare
   specificato*,
-  *inoltro di chiamata incondizionato verso il numero specificato*.

La figura seguente le illustra nello stesso ordine a partire da
sinistra:


.. note:: 

   Il pulsante d'inoltro verso telefono cellulare si attiva solamente dopo aver inserito un [[NethCTI_Client#Notifiche_Offline|numero di cellulare per notifiche]] nella pagina dei servizi telefonici

Inviare SMS
-----------

È sufficiente inserire un numero di cellulare valido nell'apposita
casella in alto, che attiva il pulsante d'invio. Cliccando su esso viene
visualizzata la finestra con cui comporre il testo del messaggio.


Ricerca contatti
^^^^^^^^^^^^^^^^

Consente la ricerca di qualsiasi contatto presente nelle rubriche.


Le sorgenti dati in cui viene effettuata la ricerca sono:

-  *rubrica centralizzata:* maggiori informazioni in `Rubrica
   Centralizzata <Rubrica Centralizzata>`__
-  `*rubrica NethCTI* <NethCTI_Client#Rubrica_NethCTI>`__

Il click sul nome di un contatto mostrato nei risultati, visualizza la
relativa scheda cliente in base al numero telefonico del lavoro (campo
'workphone' del db 'phonebook'). Questo comportamento è il default, ma è
personalizzabile tramite la voce "Cerca scheda cliente su" presente
nella pagina delle opzioni.

Report centralino
-----------------

È possibile visualizzare lo storico delle chiamate eseguite e ricevute
da tutti gli interni. È inoltre possibile vedere lo storico degli sms
inviati e le note create.


Log chiamate
------------

È possibile visualizzare lo storico delle chiamate eseguite e ricevute
relativamente al proprio interno. È inoltre possibile vedere lo storico
degli sms inviati e le note create. Più precisamente, se le note sono
state create con visibilità *"privata"*, allora saranno visibili solo le
proprie, altrimenti anche quelle degli altri interni.


Scheda cliente
--------------

Mostra la scheda cliente relativa all'ultima telefonata ricevuta
(solamente se il popup di notifica è stato cliccato) o all'ultimo
contatto ricercato in rubrica su cui si è effettuato il click.


Servizi telefonici
------------------

Oltre alle operazioni eseguibili tramite le *icone di stato* offre le
seguenti possibilità:

-  *configurare tre modalità di trasferimento di chiamata:*
   incodizionato, non disponibile e occupato
-  *configurare i messaggi vocali personalizzati in base al proprio
   stato telefonico*
-  *configurare la ricezione di notifiche*


Pannello operatore
------------------

Il pannello operatore consente la visualizzazione completa e
l'interazione in tempo reale con tutti gli *interni, code, fasci e
parcheggi*. È possibile effettuare le seguenti operazioni su una
telefonata:

-  *avviarla*
-  *redirigerla verso un altro destinatario*
-  *redirigerla verso la casella vocale propria o di altri*
-  *terminarla*
-  *parcheggiarla*
-  *visualizzarne la durata*
-  *registrarla*
-  *ascoltare/intervenire nella conversazione*

È inoltre possibile interagire velocemente con gli interni:

-  *iniziare una conversazione di chat*
-  *creare e assegnare un POST-IT*
-  *inviare un messaggio SMS*


Video Streaming
---------------

È possibile visualizzare flussi video provenienti da diverse sorgenti
aggiunte attraverso il modulo di configurazione di NethVoice. Ad esempio
videocitofoni o telecamere IP.


Notifiche
---------

Esistono due tipologie di notifiche:

-  *online (realtime)*
-  *offline*

Notifiche Online
^^^^^^^^^^^^^^^^

Vengono visualizzate cliccando l'apposito pulsante presente nella barra
superiore e notificano in tempo reale gli eventi che riguardano i
servizi in background:

#. *nuovi POST-IT*
#. *nuovi messaggi di chat*
#. *nuovi messaggi vocali*


Gli elementi di notifica sono interattivi e consentono con un singolo
click di accedere alla funzionalità relativa.

Notifiche Offline
^^^^^^^^^^^^^^^^^

Sono le notifiche ricevute quando non si utilizza NethCTI. Le modalità
di ricezione sono due:

-  *SMS*
-  *e-mail*

e gli eventi notificati sono:

#. *nuovi POST-IT*
#. *nuovi messaggi vocali*

Per ciascun evento è possibile selezionare se ricevere ("Sempre") o meno
("Mai") le notifiche. Solo per i nuovi POST-IT vi è un ulteriore
modalità chiamata "Su richiesta": con questa è l'operatore finale che
sta creando il POST-IT a decidere se inviare o meno la notifica.


.. note::

   Una volta configurato il numero di cellulare su cui ricevere notifiche è anche possibile utilizzare il [[NethCTI_Client#Stato_dell.27interno|pulsante di redirezione]] a cellulare presente nella barra in alto

Rubrica
-------

È possibile creare dei propri contatti che vengono utilizzati da NethCTI
per la `ricerca in rubrica <NethCTI_Client#Ricerca_contatti>`__, per
visualizzare le informazioni del chiamante nel
`popup <NethCTI_Client#Gestione_telefonate>`__ e per popolare la lista
degli `speed dial <NethCTI_Client#Speed_Dial>`__. Per ogni contatto
creato è possibile scegliere tre tipologie di privacy:

-  *privata:* sono contatti personali dell'utente che è l'unico a
   poterli vedere
-  *pubblica:* sono contatti visibili a tutti che quindi vengono
   mostrati nei risultati della ricerca in rubrica
-  *speed dial:* sono contatti privati dell'utente e vengono mostrati
   nella lista degli speed dial

Solo il creatore del contatto ha il diritto di modificarlo/eliminarlo e
lo può fare tramite il servizio di ricerca. Per creare un nuovo contatto
è sufficiente cliccare il pulsante ''' '+' ''' presente nella lista
degli speed dial oppure scrivere il nome da inserire nel campo presente
nella barra superiore e cliccare il pulsante ''' '+' ''' che appare
subito sotto.

.. note:: 

   Quando si riceve una telefonata le informazioni sul chiamante mostrate nel popup vengono ricercate secondo il seguente ordine:
   # contatti privati della rubrica NethCTI (le vede solamente il creatore del contatto)
   # contatti pubblici della rubrica NethCTI
   # contatti della rubrica centralizzata

Per visualizzare i contatti della rubrica NethCTI anche nel telefono
approfondire `qui <Contatti_della_rubrica_NethCTI_sul_telefono>`__.

Speed Dial
----------

Consente una rapida esecuzione delle operazioni più comuni su tre liste
di contatti:

#. *speed dial:* viene personalizzata dall'utente creando dei propri
   *contatti privati* nella rubrica NethCTI
#. *interni:* visualizza tutti gli interni telefonici
#. *utenti chat:* è l'elenco degli utenti chat

In base allo stato del contatto e alle informazioni presenti è possibile
eseguire alcune operazioni tramite le icone che appaiono soffermando il
mouse su di essi:

-  chiama
-  invia SMS
-  crea POST-IT
-  chat

Sotto gli Speed Dial è presente l'elenco delle ultime chiamate
effettuate/ricevute.


Chat
----

Gli utenti chat vengono visualizzati nella sezione di destra. È
possibile effettuare operazioni veloci su di essi tramite le icone che
appaiono in corrispondenza del mouse over.

