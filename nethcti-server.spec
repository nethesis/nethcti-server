Name: nethcti-server
Version: 2.7.5
Release: 1%{?dist}
Summary: Node.js server for NethCTI
Group: Network
License: GPLv2
Source0: %{name}-%{version}.tar.gz
BuildRequires: nethserver-devtools
BuildRequires: nodejs >= 6.9.1
Requires: nodejs >= 6.9.1
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
--dir /etc/nethcti 'attr(0775,asterisk,asterisk)' > %{name}-%{version}-filelist

%clean
rm -rf %{buildroot}

%files -f %{name}-%{version}-filelist
%defattr(-,root,root,-)

%doc
%dir %{_nseventsdir}/%{name}-update

%changelog
#* Wed Jan 18 2017 Alessandro Polidori <alessandro.polidori@nethesis.it> - 2.7.4-1
#- fix log "wrong parameter trunkStatus" for "UNREACHABLE" status
