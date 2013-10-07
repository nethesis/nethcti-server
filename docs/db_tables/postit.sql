CREATE TABLE `postit` (
  `id` int(11) NOT NULL auto_increment,
  `text` varchar(255) default NULL,
  `creator` varchar(50) default NULL,
  `dateread` timestamp NULL default NULL,
  `recipient` varchar(50) default NULL,
  `datecreation` timestamp NOT NULL default CURRENT_TIMESTAMP,
  PRIMARY KEY  (`id`),
  KEY `index_creator` (`creator`),
  KEY `index_recipient` (`recipient`),
  KEY `index_dateread` (`dateread`)
) ENGINE=MyISAM AUTO_INCREMENT=49 DEFAULT CHARSET=utf8;
