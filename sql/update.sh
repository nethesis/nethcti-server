#!/bin/bash
mysql nethcti -e "drop table call_reservation" 2>/dev/null
mysql nethcti -e "alter table call_notes add column reservation tinyint(1) default 0" 2>/dev/null
mysql nethcti -e "ALTER TABLE extension_info ADD COLUMN click2call_mode varchar(256) DEFAULT 'manual'" 2>/dev/null
mysql nethcti -e "ALTER TABLE extension_info ADD COLUMN voicemail_used varchar(20) default ''" 2>/dev/null
exit 0
