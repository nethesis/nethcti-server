Name:		proxycti
Version:	0.2.7
Release:	1%{?dist}
Summary:	Nodejs Asterisk proxy for NethCTI	

Group:		Network	
License:	ASIS
#URL:		
Source0:	%{name}-%{version}.tar.gz
BuildRoot:	%(mktemp -ud %{_tmppath}/%{name}-%{version}-%{release}-XXXXXX)

BuildRequires:	e-smith-devtools
Requires:	nodejs
Requires:	node-forever
AutoReq:	no
%description
Nodejs Asterisk proxy used for NethCTI


%prep
%setup

%build
perl -w createlinks

%install
rm -rf $RPM_BUILD_ROOT
(cd root; find . -depth -print | cpio -dump $RPM_BUILD_ROOT)
rm -f %{name}-%{version}-filelist
/sbin/e-smith/genfilelist $RPM_BUILD_ROOT --file /etc/rc.d/init.d/proxycti 'attr(0755,root,root)' > %{name}-%{version}-filelist


%clean
rm -rf $RPM_BUILD_ROOT


%files -f %{name}-%{version}-filelist
%defattr(-,root,root,-)
%doc

%post
/etc/e-smith/events/actions/initialize-default-databases
/sbin/e-smith/signal-event %{name}-update


%changelog
* Tue Jul 05 2011 Giacomo Sanchietti <giacomo.sanchietti@nethesis.it> 0.2.7-1.nh
- First release

