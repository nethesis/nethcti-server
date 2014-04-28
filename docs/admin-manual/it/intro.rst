============
Introduzione
============

|product| è il nuovo di |parent_product| che oltre alle funzioni standard di gestione chiamata da PC, 
introduce un pannello posto operatore, un accesso alla rubrica centralizzata, 
notifiche delle chiamate entranti, consultazione della scheda cliente del chiamante e altro ancora.

Tali schede possono contenere informazioni recuperate da qualsiasi gestionale e visualizzate in base al profilo dell'utente (commerciale, tecnico, amministrativo, ecc...).

E' composto da tre componenti: un :dfn:`nethcti-server` per Asterisk, il :dfn:`client` ed un :dfn:`modulo di configurazione` per |parent_product|.


Prima di cominciare

La release 2.0 di NethCTI si compone di quattro parti:
* un modulo per la configurazione su NethVoice
* il server NethCTI
* il client NethCTI
* Il Posto Operatore (PO)

Il modulo di configurazione è usato per configurare il server del NethCTI che a sua voltà sarà utilizzato sia dal client NethCTI, sia dal Pannello Operatore.

La nuova release del CTI non è retrocompatibile: tutti i client devono aggiornarsi alla nuova release.
I client sono testati solo su Google Chrome/Chromium, un supporto parziale è già disponibile anche per Firefox. Tutti gli altri browser non sono attualmente supportati.
Inoltre la versione 2.0 abbandona l'integrazione con NethCRM.

Si consiglia di utilizzare i client con monitor che abbiano una risoluzione maggiore di 1024x768 pixel.


 .. note:: Gli aggiornamenti di NethCTI e Pannello Operatore sono manuali per NethService 8.2
