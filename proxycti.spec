Name:		proxycti
Version:	1.1.992
Release:	1%{?dist}
Summary:	Nodejs Asterisk proxy for NethCTI	

Group:		Network	
License:	GPLv2
Source0:	%{name}-%{version}.tar.gz
BuildRoot:	/var/tmp/%{name}-%{version}-%{release}-buildroot


BuildRequires:	e-smith-devtools
Requires:	nodejs
Requires:	node-forever
Requires:	smeserver-ejabberd
Requires:       nethcti-module >= 1.1.3
AutoReq:	no

%description
Nodejs Asterisk proxy used for NethCTI


%prep
%setup

%build
perl -w createlinks
mkdir -p root/var/lib/asterisk/bin
mkdir -p root/var/spool/asterisk/monitor
mkdir -p root/home/e-smith/proxycti/template/
mkdir -p root/usr/lib/node/proxycti/sms
mkdir -p root/usr/lib/node/proxycti/store

%install
rm -rf $RPM_BUILD_ROOT
(cd root; find . -depth -print | cpio -dump $RPM_BUILD_ROOT)
/sbin/e-smith/genfilelist \
--file /etc/rc.d/init.d/proxycti 'attr(0755,asterisk,asterisk)' \
--file /usr/lib/node/proxycti/script/sendsms.php 'attr(0755,asterisk,asterisk)' \
--file /usr/lib/node/proxycti/sql/update.sh 'attr(0755,asterisk,asterisk)' \
--dir /var/spool/asterisk/monitor 'attr(0775,asterisk,asterisk)' \
--dir /var/lib/asterisk 'attr(0775,asterisk,asterisk)' \
--dir /usr/lib/node/proxycti/config 'attr(0775,asterisk,asterisk)' \
--dir /usr/lib/node/proxycti/sms 'attr(0775,asterisk,asterisk)' \
--dir /usr/lib/node/proxycti/store 'attr(0775,asterisk,asterisk)' \
--dir /var/lib/asterisk/bin 'attr(0775,asterisk,asterisk)' $RPM_BUILD_ROOT > %{name}-%{version}-filelist


%clean
rm -rf $RPM_BUILD_ROOT


%files -f %{name}-%{version}-filelist
%defattr(-,asterisk,asterisk,-)
%config(noreplace) /usr/lib/node/proxycti/config/*
%config(noreplace) /usr/lib/node/proxycti/images/logo.png

%doc

%pre
# HACK: stop before service before install. Needed for upgrading from 1.0 to 1.1. 
# After installation, restart proxy with asterisk user
/sbin/e-smith/service proxycti stop >&/dev/null || exit 0

%post
/etc/e-smith/events/actions/initialize-default-databases

# crate sms db
ln -s /usr/lib/node/proxycti/sql/nethcti.sql /etc/e-smith/sql/init/10cti.sql
ln -s /usr/lib/node/proxycti/sql/update.sh /etc/e-smith/sql/init/20cti_update
/sbin/e-smith/service mysql.init start

/sbin/e-smith/signal-event %{name}-update || exit 0


%changelog
* Tue Oct 30 2012  Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.1.992-1nh
- Fix query to save call notes

* Tue Oct 15 2012  Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.1.991-1nh
- Move default notification templates to /usr/lib/node/proxycti/template

* Tue Oct 09 2012  Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.1.99-1nh
- Bug #1199: fix support for custom extensions.
- Bug #1223: fix call recording when attended transfer call.
- Bug #1230: fix the visualization of connected calls in the queues of the operator panel.
- Bug #1236: fix phone status in chat users.
- Bug #1258: fix listen voicemail.
- Bug #1267: fix visualization of date dialog into the history search page.
- Bug #1270: bring management call box into the front.
- Bug #1300: remove redirect input text: use the extensions list into a dialog box.
- Bug #1332: move history search methods into page itself.
- Bug #1367: removed automatic closing of chat notification popup.
- Bug #1390: in the operator panel, view number extension and name correctly in the same row.
- Feature #632 (linked to feature #631): add source indication into search contact results.
- Feature #685: removed timeout popup option: now call popup close when hangup the call.
- Feature #741: alphabetical ordering of extensions into the operator panel.
- Feature #776: added more caller information into the call notification popup.
- Feature #1036: new option to view certain number of queue members into the operator panel.
- Feature #1106: add new open button into the streaming notification popup.
- Feature #1235: redesign of search contacts feature and add scroll bar.
- Feature #1237: new local NethCTI phonebook and speed dial contacts.
- Feature #1290: added IAX login support.
- Feature #1293: redesign of chat service.
- Feature #1305/#1318: added new chat & voicemail icon notification in the header of the page.
- Feature #1338: added new service "Assigns note to..." (also know as POST-IT).
- Feature #1350: choose speed dial and write custom number into dialog of unconditional call forwarding after click redirect in call box.
- Feature #1353: added new service switchboard report with new extension profile in the server.
- Feature #1385: added new notification bar for POST-IT, chat and voicemail messages.
- Feature #1389: added new service last ten calls.
- Feature #1404: choose portech sim to send sms
- Feature #1442: added new button for call forward to cellphone.
- Feature #1424: new actions to create POST-IT and send SMS from the operator panel extensions.
- Feature #1440: new actions to create POST-IT and send SMS in the speed dial extensions.

* Fri Jul 20 2012  Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.1.12-1nh
- Try to fix issues for #1223, again

* Mon Jul 09 2012  Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.1.11-1nh
- Try to fix issues for #1223

* Tue Jul 03 2012  Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.1.10-1nh
- Correct recording visualization in history

* Fri Jun 29 2012  Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.1.9-1nh
- Private release
- Show recording in history #1223

* Fri Jun 29 2012  Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.1.8-1nh
- Private release
- Fix call record on consultative transfer

* Thu May 31 2012  Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.1.7-1nh
- Bug #1163: when an extension pick up parked call through the telephone, operator panel correctly update parking box.

* Fri Apr 13 2012  Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.1.6-2nh
- Create forever log before starting: avoid problems on fresh install

* Tue Apr 10 2012  Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.1.6-1nh
- Bug #1009: discard audio filename starting with 'auto-' and without well-know format. 

* Fri Apr 05 2012  Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.1.5-1nh
- Bug #1000: add two functions to manage start/stop recording using channel.

* Wed Apr 04 2012  Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.1.4-1nh
- Fix #986: Add 'dcontext' field to results of the history

* Tue Apr 03 2012  Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.1.3-1nh
- Fix #970: manage recording audio file splitted in 'in' and 'out': mix them into only one file
- Restart proxycti after logrotate

* Fri Mar 23 2012  Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.1.2-1nh
- Do not crash if '/var/spool/asterisk/voicemail/default' does not exists (#869)
- Better customer card error handling
- Fix #892, #898, #859, #902
- Update documentation


* Mon Mar 12 2012  Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.1.1-1nh
- Customer card bug fix
- Load customer card only on client request

* Tue Mar 06 2012  Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.1.0-1nh
- Add SMS profile
- Handle missing sections in configuration files
- Add a timeout to customer card retrieving
- Log uset access in login.log
- Add test script for db configuration
- Added support to open command for gate/door streaming

* Mon Jan 16 2012 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.0.11-1nh
- Add DEBUG log to dataCollector when execute sql query.
- Bug #760: escape of characters ' and " in phonebook query.
- Removed build directory in node-odbc module.
- Removed test directory: old test.
- Add 'Starting server...' line in the log file at startup of proxycti as warning message.
- Bug #759: added check for permission lack in config/profiles.ini.

* Thu Jan 12 2012 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.0.9-1nh
- Bug #751: fix callout whene there are limitation in outbound routes

* Thu Jan 12 2012 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.0.8-1nh
- Do not scan error response when send SMS with other service than smshosting and response status code is 200.
- Fix sendsms.php: not add prefix and delete lock when fail send_sms function.

* Thu Dec 22 2011 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.0.7-1nh
- Bug fix: click2call to external phone number (bug of node-iniparser lib).
- Bug fix: send SMS in POST, manage escape of text to insert into database and better manage of prefix.
- Fix sendsms.php for Portech.

* Tue Dec 20 2011 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.0.6-4nh
- Add sms dir

* Tue Dec 20 2011 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.0.6-3nh
- sendsms.php: read configuration from sms.ini

* Fri Dec 16 2011 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.0.6-2nh
- Really update to 1.0.6

* Fri Dec 16 2011 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.0.6-1nh
- Update websocket protocol to HyBi-16 (compatible with Chrome 16)

* Wed Dec 14 2011 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.0.5-1nh
- More compact error debug
- Fix runtime update of audio file list
- Add directory example with some 'ejs' templates for customer card

* Tue Dec 13 2011 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.0.4-1nh
- Move chat association into mysql
- Fix template order

* Mon Dec 12 2011 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.0.3-2nh
- Fix call cc template

* Mon Dec 12 2011 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.0.3-1nh
- Add smeserver-ejabberd dependency
- Move sms configuration to sms.ini
- Various small fixes

* Wed Dec 07 2011 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.0.2-1nh
- Add streamin permission
- Fix query to check if the call has been booked
- Fix chat association: store association when the user connects to chat server
- Fix templates

* Tue Nov 29 2011 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.0.0-1nh
- Code cleanup
- Update note system
- New template rendering engine: use ejs
- Update Queue module
- Add call reservation
- New logo
- Add voicemail option
- Add CHAT and PHONE_SERVICE

* Tue Nov 08 2011 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 0.4.2-1nh
- New behaviour for click2customercard

* Tue Nov 08 2011 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 0.4.1-1nh
- Bug fixes for call notes
- Support for click2customercard

* Fri Nov 04 2011 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 0.4.0-1nh
- Add public/private note support 
- Fix bug for chat associations

* Wed Oct 26 2011 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 0.3.8-1nh
- Add new chat functions
- Fix call redirect and hangup event

* Fri Oct 07 2011 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 0.3.7-1nh
- Add jabber chat support
- Show extension status on chat

* Tue Sep 20 2011 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 0.3.5-1nh
- Enable SMS sending: web and portech
- Fix registration

* Mon Sep 12 2011 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 0.3.4-1nh
- Better connection handling
- Handle login failed to Asterisk Manager

* Wed Aug 21 2011 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 0.3.3-1nh
- Add actions on parked calls
- Add prefix for call-out
- New audio filename format from FreePBX configuration
- Template caching
- Various fixes and error handling

* Fri Aug 05 2011 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 0.3.2-1nh
- Add privacy template fragment to profiles.ini

* Fri Aug 05 2011 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 0.3.1-1nh
- Update voicemail status
- Fix call parking
- Use unix socket for mysql
- Add action for click2call for tbclick2call (Thunderbird Extension)


* Thu Jul 21 2011 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 0.3.0-1.nh
- Alpha 7 release
- Better event handling
- Try to fix the random crash bug

* Thu Jul 14 2011 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 0.2.9-1.nh
- Alpha 5 release
- Add refresh operator status

* Mon Jul 11 2011 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 0.2.8-2.nh
- Alpha 4 release
- Add /var/spool/asterisk/monitor directory
- Move retrieve_nethcti_from_mysql.pl to the right place

* Mon Jul 11 2011 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 0.2.8-1.nh
- Alpha 3 release
- Change lgo directory
- Change asterisk user 

* Fri Jul 08 2011 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 0.2.7.2-1.nh
- Alpha2 release

* Thu Jul 07 2011 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 0.2.7.1-1.nh
- Alpha release


* Tue Jul 05 2011 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 0.2.7-1.nh
- First release

