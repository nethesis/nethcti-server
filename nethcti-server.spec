Name:		nethcti-server
Version:	2.0.1
Release:	1%{?dist}
Summary:	Nodejs Asterisk proxy for NethCTI 2

Group:		Network	
License:	GPLv2
Source0:	%{name}-%{version}.tar.gz
BuildRoot:	/var/tmp/%{name}-%{version}-%{release}-buildroot


BuildRequires:	e-smith-devtools
Requires:	nodejs >= 0.8.16
Requires:	node-forever >= 0.10.9
Requires:       freepbx >= 2.10.43
Requires:	smeserver-ejabberd
Requires:       nethcti-nethvoice-module
AutoReq:	no

Obsoletes:	proxycti

%description
Nodejs Asterisk proxy used for NethCTI 2


%prep
%setup

%build
perl -w createlinks
mkdir -p root/etc/nethcti
mkdir -p root/var/lib/asterisk/bin
mkdir -p root/var/spool/asterisk/monitor
mkdir -p root/var/spool/nethcti/sms
mkdir -p root/home/e-smith/nethcti/templates/notification_manager
mkdir -p root/home/e-smith/nethcti/templates/customer_card
mkdir -p root/home/e-smith/nethcti/static
mkdir -p root/usr/lib/node/nethcti-server/store
rm -rf root/usr/lib/node/nethcti-server/docs/admin-manual/

%install
rm -rf $RPM_BUILD_ROOT
(cd root; find . -depth -print | cpio -dump $RPM_BUILD_ROOT)
mv root/usr/lib/node/nethcti-server/plugins/com_static_http/static/img  $RPM_BUILD_ROOT/home/e-smith/nethcti/static/
/sbin/e-smith/genfilelist \
--file /etc/rc.d/init.d/nethcti-server 'attr(0755,root,root)' \
--file /usr/lib/node/nethcti-server/script/sendsms.php 'attr(0755,root,root)' \
--file /usr/lib/node/nethcti-server/sql/update.sh 'attr(0755,root,root)' \
--dir /var/spool/asterisk/monitor 'attr(0775,asterisk,asterisk)' \
--dir /var/spool/nethcti/sms 'attr(0775,asterisk,asterisk)' \
--dir /etc/nethcti 'attr(0775,asterisk,asterisk)' \
--dir /home/e-smith/nethcti/static 'attr(0775,asterisk,asterisk)' \
--dir /var/lib/asterisk 'attr(0775,asterisk,asterisk)' \
--dir /var/lib/asterisk/bin 'attr(0775,asterisk,asterisk)' $RPM_BUILD_ROOT > %{name}-%{version}-filelist


%clean
rm -rf $RPM_BUILD_ROOT


%files -f %{name}-%{version}-filelist
%defattr(-,root,root,-)
%config(noreplace) /home/e-smith/nethcti/static/img/logo.png

%doc

%pre

%post
/sbin/e-smith/signal-event %{name}-update || exit 0


%changelog
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


