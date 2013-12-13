Name:		nethcti-server
Version:	1.9.2
Release:	1%{?dist}
Summary:	Nodejs Asterisk proxy for NethCTI 2

Group:		Network	
License:	GPLv2
Source0:	%{name}-%{version}.tar.gz
BuildRoot:	/var/tmp/%{name}-%{version}-%{release}-buildroot


BuildRequires:	e-smith-devtools
Requires:	nodejs >= 0.8.16
Requires:	node-forever >= 0.10.9
Requires:	smeserver-ejabberd
Requires:       nethcti-module >= 1.2.0
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
* Fri Nov 13 2013  Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 1.9.0-1
- Alpha1 release


