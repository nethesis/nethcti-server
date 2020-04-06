Name: nethcti-server3
Version: 3.18.2
Release: 1%{?dist}
Summary: Node.js server for NethCTI
Group: Network
License: GPLv2
Source0: %{name}-%{version}.tar.gz
BuildRequires: nethserver-devtools
BuildRequires: nodejs >= 6.16.0
Requires: rh-nodejs10
Requires: nethserver-nethvoice14
Requires: nethserver-janus
Requires: sox
Requires: mpg123
Conflicts: nethcti-server
AutoReq: no

%description
Node.js server application used for NethCTI

%prep
%setup

%build
perl -w createlinks
cd root/usr/lib/node/nethcti-server && npm install && cd -
# nethcti configuration directory
mkdir -p root/etc/nethcti
mkdir -p root/etc/nethcti/dbstatic.d
mkdir -p root/var/lib/nethserver/nethcti/static
mkdir -p root/var/lib/asterisk/sounds/nethcti

# clean nodejs npm modules
find root/usr/lib/node/nethcti-server/node_modules -iname readme.\* -o \
  -iname benchmark\* -o \
  -iname sample\* -o \
  -iname logos\* -o \
  -iname test\* -o \
  -iname example\* -o \
  -iname changelog\* -o \
  -iname man -o \
  -iname doc -o \
  -iname docs -o \
  -iname component.json -o \
  -iname \*.md -o \
  -iname \*.bat -o \
  -iname \*.tgz | xargs rm -rf

%install
rm -rf %{buildroot}
(cd root; find . -depth -print | cpio -dump %{buildroot})
%{genfilelist} %{buildroot} \
--file /usr/lib/node/nethcti-server/scripts/pam-authenticate.pl 'attr(0550,asterisk,asterisk)' \
--file /etc/nethcti/ast_objects.json 'attr(0600,asterisk,asterisk)' \
--file /etc/nethcti/users.json 'attr(0600,asterisk,asterisk)' \
--file /etc/nethcti/profiles.json 'attr(0600,asterisk,asterisk)' \
--file /etc/nethcti/streaming.json 'attr(0600,asterisk,asterisk)' \
--file /etc/nethcti/operator.json 'attr(0600,asterisk,asterisk)' \
--file /var/lib/nethserver/nethcti/templates/customer_card/identity.ejs 'attr(0600,asterisk,asterisk)' \
--file /var/lib/nethserver/nethcti/templates/customer_card/lastcalls.ejs 'attr(0600,asterisk,asterisk)' \
--file /var/lib/nethserver/nethcti/templates/customer_card/statistics.ejs 'attr(0600,asterisk,asterisk)' \
--file /var/lib/nethserver/nethcti/templates/customer_card/table.ejs 'attr(0600,asterisk,asterisk)' \
--dir /var/lib/nethserver/nethcti/static 'attr(0775,asterisk,asterisk)' \
--dir /var/lib/nethserver/nethcti/templates/customer_card 'attr(0775,asterisk,asterisk)' \
--dir /usr/lib/node/nethcti-server/plugins/com_static_http/static 'attr(0775,asterisk,asterisk)' \
--dir /var/lib/asterisk/sounds/nethcti 'attr(0775,asterisk,asterisk)' \
--dir /etc/nethcti/dbstatic.d 'attr(0775,asterisk,asterisk)' \
--dir /etc/nethcti 'attr(0775,asterisk,asterisk)' > %{name}-%{version}-filelist

%clean
rm -rf %{buildroot}

%files -f %{name}-%{version}-filelist
%defattr(-,root,root,-)
%config(noreplace) /etc/nethcti/ast_objects.json
%config(noreplace) /etc/nethcti/users.json
%config(noreplace) /etc/nethcti/profiles.json
%config(noreplace) /etc/nethcti/operator.json
%config(noreplace) /etc/nethcti/streaming.json
%config(noreplace) /var/lib/nethserver/nethcti/templates/customer_card/identity.ejs
%config(noreplace) /var/lib/nethserver/nethcti/templates/customer_card/lastcalls.ejs
%config(noreplace) /var/lib/nethserver/nethcti/templates/customer_card/statistics.ejs
%config(noreplace) /var/lib/nethserver/nethcti/templates/customer_card/table.ejs


%doc
%dir %{_nseventsdir}/%{name}-update

%changelog
* Mon Apr 06 2020 Alessandro Polidori <alessandro.polidori@nethesis.it> - 3.18.2-1
- Fix a regression that cause problem during boot for user initialization with capital letter in username

* Sun Apr 05 2020 Alessandro Polidori <alessandro.polidori@nethesis.it> - 3.18.1-1
- Some data inconsistency during reload - Bug nethesis/dev#5758

* Thu Apr 02 2020 Alessandro Polidori <alessandro.polidori@nethesis.it> - 3.18.0-1
- Add a proxy to communicate with tancredi and corbera components - nethesis/dev#5728

* Mon Dec 02 2019 Alessandro Polidori <alessandro.polidori@nethesis.it> - 3.17.3-1
- Sometimes reconnection fail - Bug nethesis/dev#5742

* Wed Oct 23 2019 Alessandro Polidori <alessandro.polidori@nethesis.it> - 3.17.0-1
- Fix login problems after server reboot (#148) - nethesis/dev#5724
- Improve performance of queue agent stats - nethesis/dev#5719
- Improve performance of the history search query - nethesis/dev#5717
- Improve performance of lost calls query - nethesis/dev#5708
- Sometimes, after a server restart, clients can't login to the cti - nethesis/dev#5707
- Rest api "extensions" performance improvement - nethesis/dev#5700

* Wed Sep 04 2019 Alessandro Polidori <alessandro.polidori@nethesis.it> - 3.16.1-1
- No login in sporadic scenario - nethesis/dev#5682
- Improve PIN management hiding it in some circumstances - nethesis/dev#5681

* Thu Jul 11 2019 Alessandro Polidori <alessandro.polidori@nethesis.it> - 3.16.0-1
- New phone pin management rest apis - nethesis/dev#5668

* Tue Jul 02 2019 Alessandro Polidori <alessandro.polidori@nethesis.it> - 3.15.0-1
- Add personal statistic of queue agent into the "Queues" tab - nethesis/dev#5656
- Add new events to WebSocket layer - nethesis/dev#5654
- QM add new Lost Calls tab - nethesis/dev#5646
- Show "hold" status into the box of the "Queues" of the QManager - Bug nethesis/dev#5658
- Add notifications for queues - nethesis/dev#5621
- No login on some boot scenarios and with no port 50113 listening - Bug nethesis/dev#5650

* Wed Jun 12 2019 Alessandro Polidori <alessandro.polidori@nethesis.it> - 3.14.0-1
- QManager_astats return queue data without privilege - Bug nethesis/dev#5634
- QManager new Dashboard tab - nethesis/dev#5610
- Fanvill support: 1 lost call for each outgoing call - Bug nethesis/dev#5526
- Add date time to qmanager dashboard alarms - nethesis/dev#5635
- Frequent log error on streaming error - Bug nethesis/dev#5637
- Added desktop sharing functions - nethesis/dev#5607
- Server error log "Error: Unable to retrieve transport udp,tcp,ws,wss" - Bug nethesis/dev#5636

* Tue May 28 2019 Alessandro Polidori <alessandro.polidori@nethesis.it> - 3.13.0-1
- QManager new Dashboard tab - nethesis/dev#5610
- Add notifications for queues - nethesis/dev#5621
- Wrong call direction during ringing time - Bug nethesis/dev#5629
- Execute script at the end of a call - nethesis/dev#5613

* Wed Apr 17 2019 Alessandro Polidori <alessandro.polidori@gmail.com> - 3.12.0-1
- No call management box for spy action - Bug nethesis/dev#5612
- Server history interval doesn't work correctly with type user - Bug nethesis/dev#5608
- Call recording does not work - Bug nethesis/dev#5615
- "astproxy/qmanager_astats" can generate a TypeError - Bug nethesis/dev#5611
- Rest api "extension/:id" returns only your extension - Bug nethesis/dev#5609

* Mon Apr 01 2019 Stefano Fancello <stefano.fancello@nethesis.it> - 3.11.0-1
- Added new com_ipc module to overcome reload problem - nethesis/dev#5600
- Added `linkedid` data to the extensions conversations - nethesis/dev#5605
- Add the possibility to disable the authentication - nethesis/dev#5532

* Fri Mar 22 2019 Alessandro Polidori <alessandro.polidori@gmail.com> - 3.10.1-1
- Asterisk 13.23+ missing IdentifyDetail event - Bug nethesis/dev#5597

* Fri Mar 15 2019 Alessandro Polidori <alessandro.polidori@gmail.com> - 3.10.0-1
- Added customization of "user not configured" message - nethesis/dev#5585
- Wrong behavior of historycall/intervall using user as type - Bug nethesis/dev#5584
- Automatic queue login/logout does not work using extension for login - Bug nethesis/dev#5581
- Upgrade nodejs to v10 - nethesis/dev#5588
- Upgrade some libraries for security reasons - Bug nethesis/dev#5587

* Fri Feb 08 2019 Alessandro Polidori <alessandro.polidori@nethesis.it> - 3.8.0-1
- Add new service "Operator Panel" - nethesis/dev#5549
- Queue agent penalty is not supported - Bug nethesis/dev#5575

* Mon Jan 21 2019 Alessandro Polidori <alessandro.polidori@nethesis.it> - 3.7.0-1
- Log as warn when a user deletes an offhour audio message - nethesis/dev#5565

* Fri Jan 11 2019 Alessandro Polidori <alessandro.polidori@nethesis.it> - 3.6.0-1
- Phonebook on modify contact privacy is always set to public - Bug nethesis/dev#5535
- Server does not work properly if some ports are busy during the boot - Bug nethesis/dev#5451
- Phonebook fix modify contacts buttons and search input submit event - Bug nethesis/dev#5533
- Add title and notes to phone book contacts - nethesis/dev#5536
- Migration from NethVoice11 to NethVoice14 - nethesis/dev#5454
- Add a dashboard to the wizard - nethesis/dev#5544

* Mon Dec 10 2018 Alessandro Polidori <alessandro.polidori@gmail.com> - 3.5.0-1
- Optimize the management of asterisk events, executed queries and websocket events - nethesis/dev#5513
- QManager agents empty information - Bug nethesis/dev#5524
- Log level "info" cause the writing on messages log file - Bug nethesis/dev#5508
- Audio conference does not work properly when used from physical phones - Bug nethesis/dev#5520
- Some technical debts on history, offhour, phonebook - Bug nethesis/dev#5517
- Remove unused rest api - Bug nethesis/dev#5518

* Mon Nov 12 2018 Alessandro Polidori <alessandro.polidori@gmail.com> - 3.4.0-1
- NethCTI 3: new rest api "astproxy/unauthe_call" - nethesis/dev#5507

* Wed Oct 31 2018 Alessandro Polidori <alessandro.polidori@gmail.com> - 3.3.3-1
- NethCTI 3: cti client freeze during reload of the server with many users - Bug nethesis/dev#5504
- NethCTI 3: extensions api is reachable without authentication - Bug nethesis/dev#5501
- NethCTI 3: error logs on auto queue loging/logout after reload - Bug nethesis/dev#5495

* Tue Oct 23 2018 Alessandro Polidori <alessandro.polidori@gmail.com> - 3.3.2-1
- NethCTI 3: phonebook and history tech debt - Bug nethesis/dev#5485

* Fri Oct 05 2018 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> - 3.3.1-1
- NethCTI 3: high cpu usage during huge traffic on trunks - Bug nethesis/dev#5453
- NethCTI 3: no automatic reload on customer card creation - Bug nethesis/dev#5441
- NethCTI 3: add mute both speak and listen on audio conference - nethesis/dev#5446

* Wed Sep 19 2018 Alessandro Polidori <alessandro.polidori@gmail.com> - 3.3.0-1
- QM: functions for queue summary tab. nethesis/dev#5437
- Update node-postgres to pg@6.1.6. nethesis/dev#5450
- remove useless output log
- Fix to show operator panel users with upper case letters. nethesis/dev#5439
- Fix small output log for authentication
- nethcti.js: add process pid on boot into the log

* Tue Jul 24 2018 Alessandro Polidori <alessandro.polidori@gmail.com> - 3.2.0-1
- Fix queue agent auto pause reason is lost - Bug nethesis/dev#5436
- Fix no call management box on voicemail - Bug nethesis/dev#5432
- QManager "queues" tab: add drag&drop feature and fixes - nethesis/dev#5429
- QManager: create new "Realtime tab" - nethesis/dev#5428
- Fix to support HTTP response code 302 with Snom D725 - Bug nethesis/dev#5435

* Mon Jul 02 2018 Alessandro Polidori <alessandro.polidori@nethesis.it> - 3.1.0-1
- Add support for new service "QManager" - nethesis/dev#5416
- WebSocket emit new event "extenConnected" - nethesis/dev#5421

* Wed Jun 06 2018 Alessandro Polidori <alessandro.polidori@nethesis.it> - 3.0.14-1
- Add import/export of speed dial contacts - nethesis/dev#5411
- Add automatic queue login/logout and DND - nethesis/dev#5410
- New service for Call Audio Conference - nethesis/dev#5408
- Add parameterized url to invoke on incoming call - nethesis/dev#5412

* Thu May 17 2018 Alessandro Polidori <alessandro.polidori@nethesis.it> - 3.0.13-1
- NethVoice14: agi fails with FreePBX framework 14.0.3.2 - Bug nethesis/dev#5406

* Wed May 16 2018 Alessandro Polidori <alessandro.polidori@nethesis.it> - 3.0.12-1
- New REST API POST "user/mobile" to associate cellphone number to a user - nethesis/dev#5396
- Presence list is not updated at runtime (upper right icon) - Bug nethesis/dev#5394

* Tue Apr 17 2018 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> - 3.0.11-1
- NethCTI3: queue_log table index creation fails during install - Bug nethesis/dev#5383

* Mon Apr 16 2018 Alessandro Polidori <alessandro.polidori@nethesis.it> - 3.0.10-1
- Return on blind transfer - nethesis/dev#5360

* Thu Apr 12 2018 Alessandro Polidori <alessandro.polidori@nethesis.it> - 3.0.9-1
- Upgrade moment.js dependency due to security vulnerability - Bug nethesis/dev#5375
- Wizard: no source available when create new customer card - Bug nethesis/dev#5362
- Add support for hangup and answer on webrtc - Bug nethesis/dev#5335
- List of unanswered calls for every queue - nethesis/dev#5363

* Wed Feb 14 2018 Alessandro Polidori <alessandro.polidori@nethesis.it> - 3.0.8-1
- NethCTI 3: add the possibility to remove customized avatar image (re-setting it to default) - nethesis/dev#5330

* Thu Feb 01 2018 Alessandro Polidori <alessandro.polidori@nethesis.it> - 3.0.7-1
- Calling numbers that start or end with * and/or # does not work - nethesis/dev#5312
- Add .travis.yml

* Mon Jan 29 2018 Alessandro Polidori <alessandro.polidori@nethesis.it> - 3.0.6-1
- Sporadic error in websocket send - nethesis/dev#5299
- Logrotate: fix permissions - nethesis/dev#5411

* Wed Jan 10 2018 Alessandro Polidori <alessandro.polidori@nethesis.it> - 3.0.5-1
- disable multiple login of the same type (desktop/mobile) - nethesis/5248
- add profiling component - nethesis/5271
- add layer to set nethifier led color
- add support for nethifier streaming popup - nethesis/dev#5265
- better doc for tcp events
- nethifier: temporary disable actions when use webrtc
- spec: sign streaming.json as config
- intrude does not work on some scenario - nethesis/5262
- restapi: add doc of user/presence get

* Thu Nov 30 2017 Alessandro Polidori <alessandro.polidori@nethesis.it> - 3.0.4-1
- new service offhour with mp3 & wav audio announcements for routes - nethesis/dev#5211
- support call to not clean phone numbers (e.g. with empty space) - nethesis/dev#5225
- fix default empty db sources after update on some cases
- fix authentication: enable case-sensitive login - nethesis/dev#5247
- fix download call recordings and voicemail messages - nethesis/dev#5252
- fix call started from a cellphone - nethesis/dev#5251
- fix other minor bugs

* Tue Nov 14 2017 Alessandro Polidori <alessandro.polidori@nethesis.it> - 3.0.3-1
- trunks: add support for sip,pjsip,iax trunks. nethesis/dev#5202 (#16)
- fix get channel for intrude. nethesis/dev#5246
- offhour: add support. nethesis/dev#5211
- wakeup: add retryTimes. nethesis/dev#5216
- voicemail: fix event emitter
- switchboard: fix entries for internal,out&in. nethesis/dev#5213

* Thu Sep 28 2017 Alessandro Polidori <alessandro.polidori@nethesis.it> - 3.0.2-1
- fix login with username@domain
- fix user list of audio conference
- add rest api for audio conference

* Fri Sep 01 2017 Alessandro Polidori <alessandro.polidori@nethesis.it> - 3.0.1-1
- Release 3.0.1

* Thu Aug 31 2017 Edoardo Spadoni <edoardo.spadoni@nethesis.it> - 3.0.0-1
Release 3.0.0

#* Wed Jan 18 2017 Alessandro Polidori <alessandro.polidori@nethesis.it> - 2.7.4-1
#- fix log "wrong parameter trunkStatus" for "UNREACHABLE" status
