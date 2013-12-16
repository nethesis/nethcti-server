#!/usr/bin/php
<?php
/**
This script search SMS_DIR for files containing a sms to send.
The file name must be in the form SENDER-DESTINATION and must contain a text of max 160 characters.

The prefix is managed by proxycti server. It is present in the file name (ex. 271-00393331234567)

**/
$DEBUG = false;
$options = getopt('dh',array('debug','help'));
if ( @isset($options['h']) || @isset($options['help']) ) {
    help();
}
if ( @isset($options['d']) || @isset($options['debug']) ) {
    $DEBUG = true;
}
require_once("/etc/nethcti/sms_config.php");


$smsdata = json_decode ( file_get_contents("/etc/nethcti/sms.json"), true);
if ($smsdata['type'] != 'portech'){
    debug("SMS type: " . $smsdata['type']);
    exit(0);
}
$xhost = $smsdata['portech']['url'];
debug("url: $xhost");
$xusername = $smsdata['portech']['user'];
debug("username: $xusername");
$xpassword = $smsdata['portech']['password'];
debug("password: $xpassword");
$simnumber = $smsdata['portech']['simnumber'];
debug("sim: $simnumber");
$spool = $smsdata['portech']['queue_path'];
debug("spool directory: $spool");

if (!is_dir($spool)) {
    exit_error("No sms spool directory found: $spool");
}

$lock = $spool."/"."lock";

if (file_exists($lock)){
    debug("Lock files already exists: $lock");
    exit_error();
}
debug("No previous lock file found");

$res = mysql_connect(SERVER,USER,PASS);
if(!$res){
    exit_error("Error: mysql connection failed" . mysql_error());
}
debug("MySQL connection OK");

$res = mysql_select_db(DB);
if(!$res){
    exit_erro("Error selecting db '" . DB . "':" . mysql_error());
}
debug("MySQL db selection OK: ".DB);

debug("Reading SMS spool directory"); 
if ($handle = opendir($spool)) 
{
    file_put_contents($lock,getmypid());
    while (false !== ($file = readdir($handle))) {
    	if($file == "." || $file == ".." || $file == "lock")
	    continue;
	$xbody = trim(file_get_contents($spool.'/'.$file));
	$tmp = explode("-",$file);
	$sender = $tmp[0];
	// the prefix is managed by proxycti server. It is present in the file name (ex. 271-00393331234567)
	$destination = $tmp[1];
	$res = send_sms($destination,$xbody,$xhost,$xusername,$xpassword,$lock,$simnumber);
	if($res!=''){
		unlink($spool.'/'.$file);
		$xbody = mysql_real_escape_string($xbody);
		mysql_query("INSERT INTO sms_history (sender,destination,text,date,status) VALUES ('$sender','$destination','$xbody',now(),1)");
                debug("Updated sms_history table");
	} else {
		echo "SMS send failed: check configuration\n";
	}
	sleep(5);
    }
} 
else 
{
    mysql_close();
    exit_error("Error opening sms directory: $spool");
}
debug("No more SMS into spool directory");

mysql_close();
unlink($lock);
exit(0);

function send_sms($tomobile,$xbody,$xhost,$xusername,$xpassword,$lock,$simnumber)
{
        debug("Sending sms to: $tomobile");
        $myoutput = "";
        debug("Opening telnet connection to $xhost");
        $fp = fsockopen("$xhost", 23, $errno, $errstr, 30);
        if (!$fp)
        {
                echo "$errstr ($errno)\n";
		unlink($lock);
                die;
        }
        sleep(2);
        debug("Sending username: $xusername");
        $cmd = "$xusername\r";
        fputs($fp, $cmd, strlen($cmd));
        sleep(1);

        $cmd = "$xpassword\r";
        debug("Sending password: $xpassword");
        fputs($fp, $cmd, strlen($cmd));
        sleep(1);

        $res = fread($fp, 4096);
        $pos = strpos($res, "bad username or password");
        if ($pos === false) {
            $pos = strpos($res, "module");
            if ($pos === false) {
                exit_error("NO 'module' command support. Exiting!");
            } else {
                debug("OK 'module' command supported");
            }
        } else {
            
        }

        debug("Sending 'module' command");
        $cmd = "module\r"; //inserire il numero sim
        fputs($fp, $cmd, strlen($cmd));
        sleep(2);


	//if $simnumber = 1 => send sms with #1 sim, if $simnumber=2 use a random sim betweeen 1 and 2
	if ($simnumber > 1) {
            $simtouse = 1;
        } else {
            $simtouse = rand (1,$simnumber);
        }
	//ate1 = SIM1, ate2 = SIM2  ...
        debug("Sending 'ate' command. SIM number: $simtouse");
	$cmd = "ate".$simtouse."\r";
        fputs($fp, $cmd, strlen($cmd));
        sleep(1);

        debug("Sending AT+CSCS=\"GSM\" ");
        $cmd = "AT+CSCS=\"GSM\"\r";
        fputs($fp, $cmd, strlen($cmd));
        sleep(2);

        //Select SMS Message Format... (0=PDU Mode, 1=Text Mode)
        debug("Sending at+cmgf=1");
        $cmd = "at+cmgf=1\r";
        fputs($fp, $cmd, strlen($cmd));
        $myoutput .= fread($fp, 256);
        sleep(2);

        //Send SMS Message...
        debug("Sending at+cmgs=\"$tomobile\"");
        $cmd = "at+cmgs=\"$tomobile\"\r";
        fputs($fp, $cmd, strlen($cmd));
        sleep(2);
        $myoutput .= fread($fp, 256);

        //Body...
        debug("Sending sms body: $xbody");
        $cmd = "$xbody\r\x1a"; //Ctrl-Z
        fputs($fp, $cmd, strlen($cmd));
        $res = " ";
        $myoutput = "";
        stream_set_timeout($fp, 5); //5 seconds read timeout
        while ($res != "")
        {
                $res = fread($fp, 256);
                $myoutput .= $res;
        }
        debug("Result: $myoutput");
        $tmpsms_number = explode('+CMGS: ', $myoutput);
        $sms_number = explode(' ', $tmpsms_number[1]);
        $actnum = $sms_number[0];
        $actnum = str_replace(" ","",$actnum);
        $actnum = str_replace("\r","",$actnum);
        $actnum = str_replace("\n","",$actnum);
        $actnum = str_replace("\t","",$actnum);
        $actlen= strlen($actnum)-1;
        $actnum = substr($actnum,0,$actlen);
        fclose($fp);
        if ($actnum > 0) {
            debug("OK - SMS successfully sent");
        } else {
            debug("ERROR - SMS not sent");
        }
        return $actnum;
}

function help() {
    echo "Usage: " . $argv[0] . " [options] \n";
    echo "\t -d --debug\tEnable debug\n";
    echo "\t -h --help\tShow this help\n";
    exit(0);
}

function debug($msg) {
    global $DEBUG;
    if ($DEBUG) {
        echo "DEBUG: $msg\n";
    }
}

function exit_error($msg) {
    if ($msg) {
        echo "$msg\n";
    }
    exit(1);
}
