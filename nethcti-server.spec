Name: nethcti-server3
Version: 3.0.0
Release: 1%{?dist}
Summary: Node.js server for NethCTI
Group: Network
License: GPLv2
Source0: %{name}-%{version}.tar.gz
BuildRequires: nethserver-devtools
BuildRequires: nodejs >= 6.9.1
Requires: nodejs >= 6.9.1
Requires: nethserver-nethvoice14
Requires: nethserver-janus
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
%config(noreplace) /var/lib/nethserver/nethcti/templates/customer_card/identity.ejs
%config(noreplace) /var/lib/nethserver/nethcti/templates/customer_card/lastcalls.ejs
%config(noreplace) /var/lib/nethserver/nethcti/templates/customer_card/statistics.ejs
%config(noreplace) /var/lib/nethserver/nethcti/templates/customer_card/table.ejs


%doc
%dir %{_nseventsdir}/%{name}-update

%changelog
* Thu Aug 31 2017 Edoardo Spadoni <edoardo.spadoni@nethesis.it> - 3.0.0-1
Release 3.0.0

#* Wed Jan 18 2017 Alessandro Polidori <alessandro.polidori@nethesis.it> - 2.7.4-1
#- fix log "wrong parameter trunkStatus" for "UNREACHABLE" status
