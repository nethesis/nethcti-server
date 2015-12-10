Name:		nethcti-server
Version:        2.4.8
Release:        1%{?dist}
Summary:	Nodejs Asterisk proxy for NethCTI 2

Group:		Network	
License:	GPLv2
Source0:	%{name}-%{version}.tar.gz
Source1:	http://git.nethesis.it/nethcti-server.git/snapshot/nethcti-server-master.tar.gz

BuildRequires:	nethserver-devtools
Requires:	nodejs010-nodejs
Requires:       nethvoice-module-nethcti >= 2.4.1
AutoReq:	no


%description
Nodejs Asterisk proxy used for NethCTI 2

%prep
%setup

%build
perl -w createlinks

mkdir -p root/usr/lib/node/nethcti-server
# put the nethcti-server source code
tar xzvf %{SOURCE1} -C root/usr/lib/node/nethcti-server --strip-components=1
mkdir -p root/etc/nethcti
mkdir -p root/var/lib/asterisk/bin
mkdir -p root/var/spool/asterisk/monitor
mkdir -p root/var/spool/nethcti/sms
mkdir -p root/var/lib/nethserver/nethcti/upload
mkdir -p root/var/lib/nethserver/nethcti/templates/notification_manager
mkdir -p root/var/lib/nethserver/nethcti/templates/customer_card
mkdir -p root/var/lib/nethserver/nethcti/static
mkdir -p root/usr/lib/node/nethcti-server/store
mv root/usr/lib/node/nethcti-server/nethserver_node_modules/* root/usr/lib/node/nethcti-server/node_modules
rm -rf root/usr/lib/node/nethcti-server/nethservice_node_modules
rm -rf root/usr/lib/node/nethcti-server/nethserver_node_modules

# clean the nodejs npm modules
find root/usr/lib/node/nethcti-server/node_modules -iname readme.\* -o -iname benchmark\* -o -iname sample\* -o -iname test\* -o -iname example\* -o -iname changelog\* -o -iname docs -o -iname component.json -o -iname \*.md -o -iname \*.bat -o -iname \*.tgz | xargs rm -rf

%install
rm -rf $RPM_BUILD_ROOT
(cd root; find . -depth -print | cpio -dump $RPM_BUILD_ROOT)
mv root/usr/lib/node/nethcti-server/plugins/com_static_http/static/img  $RPM_BUILD_ROOT/var/lib/nethserver/nethcti/static/
mv root/usr/lib/node/nethcti-server/plugins/com_static_http/static/templates  $RPM_BUILD_ROOT/var/lib/nethserver/nethcti/static/
/sbin/e-smith/genfilelist \
--file /usr/lib/node/nethcti-server/script/sendsms.php 'attr(0755,root,root)' \
--file /usr/lib/node/nethcti-server/sql/update.sh 'attr(0755,root,root)' \
--dir /var/spool/asterisk/monitor 'attr(0775,asterisk,asterisk)' \
--dir /var/spool/nethcti/sms 'attr(0775,asterisk,asterisk)' \
--dir /etc/nethcti 'attr(0775,asterisk,asterisk)' \
--dir /var/lib/nethserver/nethcti/static 'attr(0775,asterisk,asterisk)' \
--dir /var/lib/asterisk 'attr(0775,asterisk,asterisk)' \
--dir /var/lib/nethserver/nethcti/upload 'attr(0775,asterisk,asterisk)' \
--dir /var/lib/asterisk/bin 'attr(0775,asterisk,asterisk)' $RPM_BUILD_ROOT > %{name}-%{version}-filelist

%clean
rm -rf $RPM_BUILD_ROOT

%files -f %{name}-%{version}-filelist
%defattr(-,root,root,-)

%doc

%changelog
* Fri Nov 06 2015 Stefano Fancello <stefano.fancello@nethesis.it> - 2.4.8-1
- Testing release

* Thu Oct 22 2015 Alessandro Polidori <alessandro.polidori@nethesis.it> 2.4.6-1
- Release for NethServer 6.7
- Fea #3912: removed unused template for lokkit rules

* Wed Sep 30 2015 Alessandro Polidori <alessandro.polidori@nethesis.it> 2.4.5-1
- Fea #3830: new permissions admin_call, admin_parkings & admin_answer
- Fea #3827: new push notification service for mobile
- Bug #3807: wrong default extension into nethcti2.user_settings db

* Mon Jul 06 2015 Alessandro Polidori <alessandro.polidori@nethesis.it> 2.4.3-1
- Fea #3797: add asterisk callback call support
- Fea #3784: new rest api to modify a post-it

* Mon Jun 22 2015 Alessandro Polidori <alessandro.polidori@nethesis.it> 2.4.2-1
- Bug #3775: mssql customer cards does not work

* Wed Jun 10 2015 Alessandro Polidori <alessandro.polidori@nethesis.it> 2.4.1-1
- Enh #3743: add favicon file into http static component

* Fri May 15 2015 Alessandro Polidori <alessandro.polidori@nethesis.it> 2.4-1
- Fea #3588: new support to specify a stun server address
- Fea #3552: new asterisk action command to record a new audio file by phone
- Fea #3498: new upload service
- Fea #3447: extend database component to be pluggable
- Fea #363: new "offhour" service for night service customization
- Enh #3686: rpm: removed requires of nethcti
- Enh #3667: new fragment template to open websocket secure port (8181) with lokkit and shorewall firewall
- Enh #3641: always set mysql password for nethcti2 db when signal-event nethcti-server-update
- Enh #3621: histcallswitch rest api must returns also the trunk names list
- Bug #3671: wrong status of user in the operator panel when setting dnd from the phone
- Bug #3633: server cti does not restart when certificate-update event.
- Bug #3602: wrong default extension
- Bug #3575: phonebook problems with null values
- Bug #3491: no sip phone webrtc audio ringing

* Wed Feb 18 2015 Alessandro Polidori <alessandro.polidori@nethesis.it> 2.3-1
- Fea #3403: new Rest Api to send DTMF tones
- Fea #3342: add old removed feature to execute an external script on "cdr" asterisk event
- Enh #3392: add boolean "useWebsocket" data to all extensions
- Enh #3386: replace "ip" with "hostname" in /etc/nethcti/nethcti.json
- Enh #3342: sort phonebook search results only by company
- Bug #3384: an existent and not configured user login causes many error messages into the log file
- Bug #3331: sometimes "user_prefs.json" has one or more braces that causes malformed JSON file
- Bug #3330: adapt all mysql command to use "--defaults-file=/root/.my.cnf" option
- Bug #3321: on domain modify on NethService NG NethCTI does not update config files
- Bug #3218: with no voicemail configured cti tries anyway to get voicemail number
- Bug #3188: call wait and duration in call center phone bar is wrong
- Bug #3176: wrong queue agent "paused" value

* Wed Dec 17 2014 Alessandro Polidori <alessandro.polidori@nethesis.it> 2.2.3-1
- Fea #3355: migration from NethService 8.2 to NethServer

* Wed Dec 03 2014 Alessandro Polidori <alessandro.polidori@nethesis.it> 2.2.2-1
- Bug #3332: some configuration files does not belong to the backup

* Tue Oct 28 2014 Alessandro Polidori <alessandro.polidori@nethesis.it> 2.2.1-1
- Fea #3187: add last call time in /astproxy/queues_qos
- Fea #3184: write an entry in queue_log database each time login/logout/pause/unpause in/from the queue
- Fea #3145: new rest api to save two user options: automatic queue login/logout
- Fea #3140: logout from cti, browser tab closure if possible and browser closure if possible, must logout also from queue for dynamic agent
- Fea #3120: add the names of the parts involved in the trunks conversations
- Fea #3112: MSSQL support for NethServer
- Fea #3098: different privacy for Call Center Supervisior
- Fea #2991: new rest api to retrieve the customer cards in JSON format
- Fea #2896: new heartbeat ping to enable KeepAlive for Nethifier
- Fea #2888: stats: provides server status information through REST API
- Fea #2845: add open CTI / CTI cust card / CTI stream to windows popup notification templates
- Fea #2547: TCP layer communication to broadcast the extension ringing events for windows popup notifications
- Fea #2471: logout action for dynamic queue agents
- Fea #2470: login action for dynamic queue agents
- Enh #3167: new method to calculate queues connected calls
- Enh #3125: add "offline" notification method
- Enh #3117: add new configuration "profiling" section into the /etc/nethcti/services.json file
- Enh #3106: NethCTI contacts appear duplicated
- Enh #3079: better output for error and warning logs
- Enh #2788: adapt astproxy/answer to support or not a specific extension to use
- Bug #3216: login to a queue from cti does not allow the pbx to monitor extension state
- Bug #3177: automatic logout from queues when logout from oppanel or queueman
- Bug #3159: wrong CTI presence for /configmanager/alluserendpoints REST API
- Bug #3148: when a call is transferred from an extension to a queue, the call is not managed
- Bug #3131: waiting calls position is not updated
- Bug #3121: with privacy enabled the waiting caller names of the queues are clear
- Bug #3067: configured prefix is not used with automatic click2call
- Bug #3063: asterisk "join" event does not checks for "unknown" caller name
- Bug #3057: client requests streaming sources and operator panel groups also without permission
- Bug #3051: log wrong sms configuration when it is empty
- Bug #3035: sendsms.php send an empty email to admin every 5 minutes

* Wed Aug 6 2014 Alessandro Polidori <alessandro.polidori@nethesis.it> 2.1.9-1
- Fea #2979: add the number of connected calls to the queues.
- Enh #3024: secure Ldap authentication.
- Enh #2069: add "Service Level Percentage" data for each queue.
- Enh #2968: add "Service Level Time Period" data for each queue.
- Bug #3100: http proxy server does not works together with sogo installation.
- Bug #3096: total failed call of a queue shows always 0.
- Bug #3040: nethcti-server does not start at the boot of the NethServer system.
- Bug #3039: manual click2call with Snom 715 does not works.
- Bug #3028: MSSQL strings is all undefined.
- Bug #3025: pickup doesn't work with a call in a ring group with more than one member
- Bug #3011: click on customer card on Nethifier popup does not search the customer card.

* Fri Jul 11 2014 Alessandro Polidori <alessandro.polidori@nethesis.it> 2.1.8-1
- Bug #3039: manual click2call with Snom 715 does not works.

* Wed Jul 9 2014 Alessandro Polidori <alessandro.polidori@nethesis.it> 2.1.7-1
- Fea #2979: add the number of connected calls to the queues.
- Fea #2975: the data about the queues are update in real time.
- Enh #3024: secure LDAP authentication.
- Enh #2995: history post-it also returns those for which the user is the recipient.
- Enh #2969: "Service Level Percentage" data has been added to each queue.
- Enh #2968: "Service Level Time Period" data has been added to each queue.
- Bug #3040: nethcti-server does not start at the boot of the NethServer system.
- Bug #3028: different implementation of MSSQL using 'mssql' module.
- Bug #3025: pickup conversations does not work.
- Bug #3019: no display more than one MSSQL customer card.
- Bug #3011: click on customer card on Nethifier popup does not search the customer card.

* Thu Jun 05 2014 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 2.1.3-1
- Fea #2878: remove ejabberd dependency
- Fea #2878: refactor events

* Tue Jun 3 2014 Alessandro Polidori <alessandro.polidori@nethesis.it> 2.1.2-1
- Bug #2960: fix image cache on nethifier streaming popup.

* Mon May 26 2014 Alessandro Polidori <alessandro.polidori@nethesis.it> 2.1-1
- Enh #2859: obscure history call clid when privacy is enabled.
- Fea #2850: new rest api to retrieve all users permissions.
- Fea #2906 #2907: more data about queues.
- Fea #2685: new rest api to support legacy third-party applications.
- Fea #2547: windows integration with desktop notifications.
- Fea #2495: support for MSSQL customer cards.
- Bug #2918: fix some bugs about the privacy.
- Bug #2886: obfuscated numbers in the operator panel with privacy disabled.
- Bug #2872: the "open door" streaming does not work with "MOBOTIX T24 mx10-13-20-46".
- Some template customer card examples.
- Other bugs.

* Tue Mar 25 2014 Alessandro Polidori <alessandro.polidori@nethesis.it> 2.0.1-1
- Increase the version to 2.0.1 final release.
- Enh #2862: http_proxy listen in http 8179 and https 8180 ports.
- Enh #2861: group all tcp ports in nethcti-server TCPPorts property.
- Enh #2184: WebSocket listen on https 8181 and http 8183 ports.

* Fri Mar 07 2014 Alessandro Polidori <alessandro.polidori@nethesis.it> 1.9.24-1
- Enh #2824: new rest api astproxy/is_autoc2c_supported/:endpoint.
- Fea #2828: new rest api astproxy/call_echo.

* Thu Mar 06 2014 Alessandro Polidori <alessandro.polidori@nethesis.it> 1.9.23-1
- Removed static file nethcti-server/root/etc/nethcti/asterisk.json (it is only a template)

* Tue Mar 04 2014 Alessandro Polidori <alessandro.polidori@nethesis.it> 1.9.22-2
- Re-add %config directive for /etc/nethcti/* path.

* Mon Mar 03 2014 Alessandro Polidori <alessandro.polidori@nethesis.it> 1.9.22-1
- First RC release
- Bug #2763 #2497: add privacy in the switchboard history queries.
- Bug #2756: fix multiple login.
- Bug #2755: hide call number of extension conversations when the user has the privacy enabled.
- Enh #2759: automatic remove expired authentication token each interval time.
- Enh #2724: move asterisk.json to a template.
- Fea #2776: add support for automatic click2call.
- Fea #2777: new rest api to directly answer on the phone (astproxy/answer).
- Fea #2726: new rest api to get the prefix number configured in the server (astproxy/prefix).
- Fea #2605 #2606: add support for prefix number to be added to all outgoing calls.
- Fea #2146: add support to chose the default extension endpoint associated with the user.

* Mon Feb 10 2014 Alessandro Polidori <alessandro.polidori@nethesis.it> 1.9.21-1
- Beta3 release.
- Bug #2713: write log output only in /var/log/asterisk/nethcti.log.
- Bug #2712: fix current date time in the log file.
- Bug #2615: fix customer card null values.
- Enh #2654: IAX trunk support.
- Enh #2657 #2633: new "recording" and "maxChannels" properties to trunk objects.
- Fea #2623: Active Directory login support.
- New package dependency "freepbx >= 2.10.43"

* Fri Jan 31 2014 Alessandro Polidori <alessandro.polidori@nethesis.it> 1.9.20-1
- Release for neth-oppanel beta3 version
- New REST api astproxy/force_hangup #2671

* Wed Jan 29 2014 Alessandro Polidori <alessandro.polidori@nethesis.it> 1.9.19-1
- Manage trunks to display them in the client #2335
- Adapt "recording" property of extension conversations to manage also "mute" status #2630
- Supply agents/queues stats #2475

* Tue Jan 21 2014 Alessandro Polidori <alessandro.polidori@nethesis.it> 1.9.18-1
- Beta2 release
- Automatic ldap reconnection #2498
- Automatic asterisk reconnection #2562
- Fix call recording and add new rest api to mute/unmute. Refs #2284

* Thu Jan 16 2014 Alessandro Polidori <alessandro.polidori@nethesis.it> 1.9.17-1
- New Alpha2 release with new functions for neth-oppanel beta2 release
- Update sequelize library: better performance #2602
- New call forward to voicemail property for extensions #2565
- Relaxed permission for REST api astproxy/txfer_tovm #2610

* Mon Jan 13 2014 Alessandro Polidori <alessandro.polidori@nethesis.it> 1.9.16-1
- Alpha2 release with new functions #2512 #2222 #2557 for neth-oppanel beta2 release

* Tue Jan 08 2014 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.9.13-1
- Fix installation problem #2555

* Fri Nov 13 2013  Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.9.0-1
- Alpha1 release


