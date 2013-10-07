CREATE TABLE `sms_history` (
  `id` int(11) NOT NULL auto_increment,
  `sender` varchar(50) default NULL,
  `destination` varchar(50) default NULL,
  `text` varchar(165) default NULL,
  `date` datetime default NULL,
  `status` tinyint(1) default NULL,
  PRIMARY KEY  (`id`),
  KEY `sender_index` (`sender`)
) ENGINE=MyISAM AUTO_INCREMENT=16 DEFAULT CHARSET=utf8;
