CREATE TABLE `caller_note` (
  `id` int(11) NOT NULL auto_increment,
  `datecreation` timestamp NOT NULL default CURRENT_TIMESTAMP,
  `text` varchar(255) default NULL,
  `creator` varchar(50) default NULL,
  `number` varchar(50) default NULL,
  `public` tinyint(1) default '0',
  `expiration` timestamp NOT NULL default '0000-00-00 00:00:00',
  `booking` tinyint(1) default '0',
  `callid` varchar(50) default NULL,
  PRIMARY KEY  (`id`),
  KEY `index_creator` (`creator`),
  KEY `index_number` (`number`),
  KEY `index_callid` (`callid`)
) ENGINE=MyISAM AUTO_INCREMENT=23 DEFAULT CHARSET=utf8;
