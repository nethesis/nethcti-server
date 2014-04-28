=============
Customer card
=============

Con il termine *customer card* si indica un insieme di informazioni che
il server fornisce ai client NethCTI ogni volta che si riceve una
chiamata o che si fa click su un elemento della rubrica.

Una customer card è costituita da due parti fondamentli:

-  una query su un database locale o remoto
-  un template per il rendering dei risultati della query

La configurazione di default fornisce già le seguenti customer card:

-  dettagli anagrafici dalla rubrica centralizzata
-  ultime 10 chiamate associate al cliente

Altri esempi comuni di customer card:

-  ticket di assistenza associati al cliente
-  insoluti e stato pagamenti
-  dettagli anagrafici da gestionale
-  trattative, contratti e altre informazioni estratte da crm

Le query possono essere configurate attraverso l'interfaccia
tradizionale di NethVoice accedendo alla sezione "CTI". Per informazioni
generali sulla configurazione del CTI consultare la pagina `NethCTI
Modulo Nethvoice <NethCTI Modulo Nethvoice>`__

Query
=====

Attualmente sono supportati due tipi di database:

-  MySQL
-  Microsoft SQL Server

Ogni query è composta dai seguenti campi:

-  **Nome**: è il nome della customer card, deve essere diverso da
   quello di altre customer card salvate. *Default* e *Calls* sono nomi
   riservati alle customer card di default. Il nome della customer card
   NON può contenere il carattere **\_**.
-  **Tipo di database**: è il tipo di database dove verrà effettuata la
   query
-  **Porta Database**: è la porta usata per raggiungere il database. Nel
   caso di database locale su Nethservice è possibile utilizzare il
   socket unix */var/lib/mysql/mysql.sock*
-  **Host**: è l'host che ospita il database
-  **Query**: è la query da effettuare
-  **Visibile di default** Se questo campo è abilitato, automaticamente
   tutti gli interni saranno abilitati a visualizzare la customer card.
   Sarà comunque possibile ridefinire i permessi per ogni singolo
   interno nella pagina **Configurazione CTI**

**Esempio query**


L'esempio seguente crea una customer card "ticket" che, all'arrivo di
una chiamata, mostra nel cti i risultati di una query effettuata sul
database di otrs:

+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **Nome:** ticket                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **Nome Visualizzato:** ticket                                                                                                                                                                                                                                                                                                                                                                                                                                    |
+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **Tipo di database:** mysql                                                                                                                                                                                                                                                                                                                                                                                                                                      |
+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **Porta Database:** /var/lib/mysql/mysql.sock                                                                                                                                                                                                                                                                                                                                                                                                                    |
+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **Nome Database:** otrs                                                                                                                                                                                                                                                                                                                                                                                                                                          |
+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **Database Username:** otrs                                                                                                                                                                                                                                                                                                                                                                                                                                      |
+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **Database Password:** \*\*\*\*\*\*\*\*                                                                                                                                                                                                                                                                                                                                                                                                                          |
+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **Query:** SELECT T.title as Titolo, date\_format(T.create\_time,'%d/%m/%Y %H:%i') as c\_time, date\_format(T.change\_time,'%d/%m/%Y %H:%i') as m\_time, concat(U.first\_name,' ',U.last\_name) as gestore, 'Cliente', TS.name as stato from ticket T inner join customer\_user CU on T.customer\_user\_id=CU.login inner join ticket\_state TS on T.ticket\_state\_id=TS.id inner join users U on T.change\_by=U.id where (CU.phone like '%$EXTEN%') limit 10   |
+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| **Visibile di default:** True                                                                                                                                                                                                                                                                                                                                                                                                                                    |
+------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+

Template
--------

Dopo aver configurato la query, è necessario creare un template per
effettuare il rendering del risultato. Tutti i template devono essere
salvati nella directory */home/e-smith/proxycti/template/*'.

Il nome del file di ciascun template deve essere nella forma:

``decorator_cc_``\ \ ``_``\ \ ``.ejs``

Il *numero\_ordinale* serve per decidere l'ordine di visualizzazione del
template, il *nome\_customer\_card* deve coincidere con il nome deciso
durante la configurazione della query.

Esempi di nomi di file:

| ``decorator_cc_25_insoluti.ejs``
| ``decorator_cc_35_trattative.ejs``

I template utilizzano la sintassi **ejs** che, in modo del tutto simile
a quello che avviene in PHP, permettono di "immergere" codice javascript
all'interno di una pagina html e di generare in output un documento (o
un frammento) html intepretabile dai browser. NethCTI fornisce già una
lista di esempi pronti all'uso nella directory
**/usr/lib/node/proxycti/examples/**:

-  **base\_table.ejs**: visualizza una tabella molto semplice contenente
   tutte le colonne e le righe del risultato della query
-  **beautiful\_table.ejs**: come base\_table.ejs ma applica un css alla
   tabella
-  **manual\_table.ejs**: visualizza una tabella contenente tutte le le
   righe del risultato della query, ma le colonne visualizzate devono
   essere specificate manualmente
-  **one\_result.ejs**: visualizza le prime due colonne del primo
   risultato della query

Se ad esempio, si vuole creare una tabella di visualizzazione per la
query sui ticket vista nel paragrafo precedente, eseguire:

| ``cp /usr/lib/node/proxycti/examples/beautiful_table.ejs decorator_cc_30_ticket.ejs``
| ``signal-event proxycti-update``

Risultati
---------

All'interno di ogni template è automaticamente disponibile la variabile
**results**, un array che contiene tutti i risultati della query. Alla
fine di ogni record è aggiunto un elemento chiamato *server\_address*
che contiene l'indirizzo base http del server utile per costruire i path
delle immagini.

Ogni riga dell'array results è nel formato:

`` ( colonna1 => valore1, colonna2 => valore2 ... colonnaX => valoreX , 'server_address' => '``\ ```http://nomeserver/`` <http://nomeserver/>`__\ ``')``

Ad esempio, data una query del tipo:

`` select nome,cognome,tipo from rubrica``

Con risultato:

| `` mario,rossi,azienda``
| `` giuseppe,bianchi,privato``

L'array avrà il formato:

| ``  [0] => { nome: "mario", cognome: "rossi", tipo: 'azienda' }``
| ``  [1] => { nome: "giuseppe", cognome: "bianchi", tipo: 'privato' }``

Quindi, per accedere ad esempio al cognome del secondo risultato:

`` results[1].cognome        // ritornerà "bianchi"``

All'interno della variabile **results.length** è contenuto il numero dei
risultati ottenuti.

Sintassi
--------

I template ejs utilizzano la sintassi standard di javascript.

Per inserire codice all'interno di un frammento html, si usano i tag:

``<% ...codice... %>``

Se si desidera stampare direttamente il valore di una variabile, si può
usare il formato:

`` <%= nome_variabile %>``

Riportiamo un paio di esempi riprendendo la query vista nel paragrafo
precedente.

Stampa il primo risultato:

| ``Nome: <%= result[0].nome %>``
| ``Cognome: <%= result[0].cognome %>``
| ``Tipo: ``\ \ ``/template/images/web.png' />``

Output:

| `` Nome: mario``
| `` Cognome: rossi``
| `` Tipo:  ``\ 

Stampa tutti i risultati:

| `` <% for(var i=0; i``\ 
| ``    Nome:  <%= results[i].nome %>``
| ``    Cognome: <%= results[i].cognome %>``
| ``    <%  } %>``
| `` <% } %>``

Per ulteriori dettagli sulla sintassi di ejs, consultare:

-  https://github.com/visionmedia/ejs
-  http://www.w3schools.com/js/

Test query customer card
------------------------

All'interno della directory */usr/lib/node/proxycti/test* vi è lo script
*dstest.js* che consente di effettuare i test sulle query delle customer
card.

Ad esempio se si vuole testare la query della customer card *ticket*
(creata precedentemente) relativamente al numero *12345* è necessario
eseguire il seguente comando

| ``cd /usr/lib/node/proxycti``
| ``node /usr/lib/node/proxycti/test/dstest.js cc ticket 12345``

Verranno mostrati i risultati ottenuti dal database senza considerare il
template di rendering.

Lo script fornisce anche un comodo help consultabile in qualsiasi
momento eseguendo il comando:

| ``cd /usr/lib/node/proxycti``
| ``node /usr/lib/node/proxycti/test/dstest.js``

