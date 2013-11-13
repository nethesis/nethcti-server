CREATE TABLE `postit` (
  `id` int(11) NOT NULL auto_increment,
  `text` varchar(255) default NULL,
  `creator` varchar(50) default NULL,
  `readdate` datetime default NULL,
  `recipient` varchar(50) default NULL,
  `creation` datetime NOT NULL,
  PRIMARY KEY  (`id`),
  KEY `index_creator` (`creator`),
  KEY `index_recipient` (`recipient`),
  KEY `index_readdate` (`readdate`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
