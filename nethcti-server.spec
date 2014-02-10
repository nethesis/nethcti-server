Name:		nethcti-server
Version:	1.9.21
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

%install
rm -rf $RPM_BUILD_ROOT
(cd root; find . -depth -print | cpio -dump $RPM_BUILD_ROOT)
mv root/usr/lib/node/nethcti-server/plugins/com_static_http/static/img  $RPM_BUILD_ROOT/home/e-smith/nethcti/static/
/sbin/e-smith/genfilelist \
--file /etc/rc.d/init.d/nethcti-server 'attr(0755,asterisk,asterisk)' \
--file /usr/lib/node/nethcti-server/script/sendsms.php 'attr(0755,asterisk,asterisk)' \
--file /usr/lib/node/nethcti-server/sql/update.sh 'attr(0755,asterisk,asterisk)' \
--dir /var/spool/asterisk/monitor 'attr(0775,asterisk,asterisk)' \
--dir /var/spool/nethcti/sms 'attr(0775,asterisk,asterisk)' \
--dir /etc/nethcti 'attr(0775,asterisk,asterisk)' \
--dir /home/e-smith/nethcti/static 'attr(0775,asterisk,asterisk)' \
--dir /var/lib/asterisk 'attr(0775,asterisk,asterisk)' \
--dir /var/lib/asterisk/bin 'attr(0775,asterisk,asterisk)' $RPM_BUILD_ROOT > %{name}-%{version}-filelist


%clean
rm -rf $RPM_BUILD_ROOT


%files -f %{name}-%{version}-filelist
%defattr(-,asterisk,asterisk,-)
%config(noreplace) /etc/nethcti/*
%config(noreplace) /home/e-smith/nethcti/static/img/logo.png

%doc

%pre

%post
/sbin/e-smith/signal-event %{name}-update || exit 0


%changelog
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


