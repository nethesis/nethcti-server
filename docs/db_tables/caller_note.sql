CREATE TABLE `caller_note` (
  `id` int(11) NOT NULL auto_increment,
  `creation` datetime NOT NULL,
  `text` varchar(255) default NULL,
  `creator` varchar(50) default NULL,
  `number` varchar(50) default NULL,
  `public` tinyint(1) default '0',
  `expiration` datetime NOT NULL default '0000-00-00 00:00:00',
  `reservation` tinyint(1) default '0',
  PRIMARY KEY  (`id`),
  KEY `index_creator` (`creator`),
  KEY `index_number` (`number`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
