#!/usr/bin/php
<?php
/**
This script search SMS_DIR for files containing a sms to send.
The file name must be in the form SENDER-DESTINATION and must contain a text of max 160 characters.

The prefix is managed by proxycti server. It is present in the file name (ex. 271-00393331234567)

**/



define("SMS_DIR","/usr/lib/node/proxycti/sms");

define("SERVER","localhost");
define("DB","smsdb");
define("USER","smsuser");
define("PASS","smspass");

$smsdata = parse_ini_file ('/usr/lib/node/proxycti/config/sms.ini');
if ($smsdata['type'] != 'portech')
	exit(0);
$xhost = $smsdata['url'];
$xusername = $smsdata['user'];
$xpassword = $smsdata['password'];

$lock = SMS_DIR."/"."lock";

if (file_exists($lock))
   exit(1);

mysql_connect(SERVER,USER,PASS);
mysql_select_db(DB);
if ($handle = opendir(SMS_DIR)) 
{
    file_put_contents($lock,getmypid());
    while (false !== ($file = readdir($handle))) {
    	if($file == "." || $file == ".." || $file == "lock")
	    continue;
	$xbody = trim(file_get_contents(SMS_DIR.'/'.$file));
	$tmp = explode("-",$file);
	$sender = $tmp[0];
	// the prefix is managed by proxycti server. It is present in the file name (ex. 271-00393331234567)
	$destination = $tmp[1];
	send_sms($destination,$xbody,$xhost,$xusername,$xpassword,$lock);
	unlink(SMS_DIR.'/'.$file);
	$xbody = mysql_real_escape_string($xbody);
	mysql_query("INSERT INTO sms_history (sender,destination,text,date,status) VALUES ('$sender','$destination','$xbody',now(),1)");
	sleep(5);
    }
} 
else 
{
    mysql_close();
    echo "Error opening sms directory: ".SMS_DIR."\n";
    exit(1);
}

mysql_close();
unlink($lock);
exit(0);

function send_sms($tomobile,$xbody,$xhost,$xusername,$xpassword,$lock)
{
        $myoutput = "";
        $fp = fsockopen("$xhost", 23, $errno, $errstr, 30);
        if (!$fp)
        {
                echo "$errstr ($errno)\n";
		unlink($lock);
                die;
        }

        sleep(2);
        $cmd = "$xusername\r";
        fputs($fp, $cmd, strlen($cmd));
        sleep(1);

        $cmd = "$xpassword\r";
        fputs($fp, $cmd, strlen($cmd));
        sleep(1);

        $cmd = "module\r"; //inserire il numero sim
        fputs($fp, $cmd, strlen($cmd));
        sleep(2);

        $cmd = "ate1\r";
        fputs($fp, $cmd, strlen($cmd));
        sleep(1);

        $cmd = "AT+CSCS=\"GSM\"\r";
        fputs($fp, $cmd, strlen($cmd));
        sleep(2);

        //Select SMS Message Format... (0=PDU Mode, 1=Text Mode)
        $cmd = "at+cmgf=1\r";
        fputs($fp, $cmd, strlen($cmd));
        $myoutput .= fread($fp, 256);
        sleep(2);

        //Send SMS Message...
        $cmd = "at+cmgs=\"$tomobile\"\r";
        fputs($fp, $cmd, strlen($cmd));
        sleep(2);
        $myoutput .= fread($fp, 256);

        //Body...
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
        return $actnum;
}
