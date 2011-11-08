Name:		proxycti
Version:	0.4.2
Release:	1%{?dist}
Summary:	Nodejs Asterisk proxy for NethCTI	

Group:		Network	
License:	ASIS
#URL:		
Source0:	%{name}-%{version}.tar.gz
BuildRoot:	/var/tmp/%{name}-%{version}-%{release}-buildroot


BuildRequires:	e-smith-devtools
Requires:	nodejs
Requires:	node-forever
Requires:	nethvoice
AutoReq:	no

%description
Nodejs Asterisk proxy used for NethCTI


%prep
%setup

%build
perl -w createlinks
mkdir -p root/var/lib/asterisk/bin
mkdir -p root/var/spool/asterisk/monitor
mv root/usr/lib/node/proxycti/script/retrieve_nethcti_from_mysql.pl root/var/lib/asterisk/bin

%install
rm -rf $RPM_BUILD_ROOT
(cd root; find . -depth -print | cpio -dump $RPM_BUILD_ROOT)
/sbin/e-smith/genfilelist \
--file /etc/rc.d/init.d/proxycti 'attr(0755,root,root)' \
--file /var/lib/asterisk/bin/retrieve_nethcti_from_mysql.pl 'attr(0755,asterisk,asterisk)' \
--file /usr/lib/node/proxycti/script/sendsms.php 'attr(0755,root,root)' \
--dir /var/spool/asterisk/monitor 'attr(0775,asterisk,asterisk)' \
--dir /var/lib/asterisk 'attr(0775,asterisk,asterisk)' \
--dir /var/lib/asterisk/bin 'attr(0775,asterisk,asterisk)' $RPM_BUILD_ROOT > %{name}-%{version}-filelist


%clean
rm -rf $RPM_BUILD_ROOT


%files -f %{name}-%{version}-filelist
%defattr(-,root,root,-)
%doc

%post
/etc/e-smith/events/actions/initialize-default-databases

# crate sms db
ln -s /usr/lib/node/proxycti/sql/nethcti.sql /etc/e-smith/sql/init/10cti.sql
/sbin/e-smith/service mysql.init start

/sbin/e-smith/signal-event %{name}-update


%changelog
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

