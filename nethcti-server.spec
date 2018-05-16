Name: nethcti-server3
Version: 3.0.12
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
