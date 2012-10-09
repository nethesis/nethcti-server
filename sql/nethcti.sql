GRANT ALL ON nethcti.* TO 'smsuser'@'localhost' IDENTIFIED BY 'smspass';
FLUSH PRIVILEGES;

CREATE DATABASE IF NOT EXISTS nethcti;
USE nethcti;


SET character_set_client = utf8;
CREATE TABLE IF NOT EXISTS `sms_history` (
  `id` int(11) NOT NULL auto_increment,
  `sender` varchar(50) default NULL,
  `destination` varchar(50) default NULL,
  `text` varchar(165) default NULL,
  `date` datetime default NULL,
  `status` tinyint(1) default NULL,
  KEY `sender_index` (`sender`),
  PRIMARY KEY  (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `call_notes` (
  `id` int(11) NOT NULL auto_increment,
  `date` timestamp default CURRENT_TIMESTAMP,
  `text` varchar(255) default NULL,
  `extension` varchar(50) default NULL,
  `number` varchar(50) default NULL,
  `public` tinyint(1) default 0,
  `expiration` timestamp default 0,
  `reservation` tinyint(1) default 0,
  KEY `index_extension` (`extension`),
  KEY `index_number` (`number`),
  PRIMARY KEY  (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `chat_association` (
  `extension` varchar(50) NOT NULL default '',
  `bare_jid` varchar(50) default '',
  PRIMARY KEY  (`extension`),
  UNIQUE KEY `ext_jid` (`extension`,`bare_jid`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `postit` (
  `id` int(11) NOT NULL auto_increment,
  `date` timestamp NOT NULL default CURRENT_TIMESTAMP,
  `text` varchar(255) default NULL,
  `owner` varchar(50) default NULL,
  `assigned` varchar(50) default NULL,
  `status` tinyint(1) default '0',
  PRIMARY KEY  (`id`),
  KEY `index_owner` (`owner`),
  KEY `index_assigned` (`assigned`),
  KEY `index_status` (`status`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `extension_info` (
  `extension` varchar(50) NOT NULL,
  `notif_cellphone` varchar(50) default '',
  `notif_email` varchar(50) default '',
  `notif_voicemail_cellphone` varchar(20) default '',
  `notif_voicemail_email` varchar(20) default '',
  `notif_note_cellphone` varchar(20) default '',
  `notif_note_email` varchar(20) default '',
  PRIMARY KEY  (`extension`),
  UNIQUE KEY `extension` (`extension`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `cti_phonebook` (
  `id` int(11) NOT NULL auto_increment,
  `owner_id` varchar(255) NOT NULL default '',
  `type` varchar(255) NOT NULL default '',
  `homeemail` varchar(255) default NULL,
  `workemail` varchar(255) default NULL,
  `homephone` varchar(25) default NULL,
  `workphone` varchar(25) default NULL,
  `cellphone` varchar(25) default NULL,
  `fax` varchar(25) default NULL,
  `title` varchar(255) default NULL,
  `company` varchar(255) default NULL,
  `notes` text,
  `name` varchar(255) default NULL,
  `homestreet` varchar(255) default NULL,
  `homepob` varchar(10) default NULL,
  `homecity` varchar(255) default NULL,
  `homeprovince` varchar(255) default NULL,
  `homepostalcode` varchar(255) default NULL,
  `homecountry` varchar(255) default NULL,
  `workstreet` varchar(255) default NULL,
  `workpob` varchar(10) default NULL,
  `workcity` varchar(255) default NULL,
  `workprovince` varchar(255) default NULL,
  `workpostalcode` varchar(255) default NULL,
  `workcountry` varchar(255) default NULL,
  `url` varchar(255) default NULL,
  `extension` varchar(255) default NULL,
  `speeddial_num` varchar(255) default NULL,
  PRIMARY KEY  (`id`),
  KEY `owner_idx` (`owner_id`),
  KEY `wemail_idx` (`workemail`),
  KEY `hemail_idx` (`homeemail`),
  KEY `name_idx` (`name`),
  KEY `hphone_idx` (`homephone`),
  KEY `wphone_idx` (`workphone`),
  KEY `cphone_idx` (`cellphone`),
  KEY `fax_idx` (`fax`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
