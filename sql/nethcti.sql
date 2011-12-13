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
  KEY `index_extension` (`extension`),
  KEY `index_number` (`number`),
  PRIMARY KEY  (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `call_reservation` (
  `id` int(11) NOT NULL auto_increment,
  `date` timestamp NOT NULL default CURRENT_TIMESTAMP,
  `extension` varchar(50) NOT NULL,
  `number` varchar(50) NOT NULL,
  PRIMARY KEY  (`id`),
  UNIQUE KEY `number` (`number`),
  UNIQUE KEY `number_2` (`number`),
  KEY `index_extension` (`extension`),
  KEY `index_number` (`number`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8

CREATE TABLE `chat_association` (
  `extension` varchar(50) NOT NULL,
  `bare_jid` varchar(50) default '',
  PRIMARY KEY  (`extension`),
  UNIQUE KEY `extension` (`extension`,`bare_jid`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8
