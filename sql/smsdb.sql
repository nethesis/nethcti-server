GRANT ALL ON smsdb.* TO 'smsuser'@'localhost' IDENTIFIED BY 'smspass';
FLUSH PRIVILEGES;

CREATE DATABASE IF NOT EXISTS smsdb;
USE smsdb;


SET character_set_client = utf8;
CREATE TABLE IF NOT EXISTS `history` (
  `id` int(11) NOT NULL auto_increment,
  `sender` varchar(50) default NULL,
  `destination` varchar(50) default NULL,
  `text` varchar(165) default NULL,
  `date` datetime default NULL,
  `status` tinyint(1) default NULL,
  KEY `sender_index` (`sender`),
  PRIMARY KEY  (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

