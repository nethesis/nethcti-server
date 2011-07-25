#!/usr/bin/php
<?php
define("SMS_DIR","/usr/lib/node/proxycti/sms");

if($argc < 4)
{
  echo "Usage: sendsms <ip> <username> <password> [prefix]\n";
  die(1);
}

$xhost = $argv[1];
$xusername = $argv[2];
$xpassword = $argv[3];
if($argc > 4)
  $prefix = $argv[4];
else
  $prefix = "";

if ($handle = opendir(SMS_DIR)) 
{
    while (false !== ($file = readdir($handle))) {
    	if($file == "." || $file == "..")
	    continue;
	$xbody = trim(file_get_contents(SMS_DIR.'/'.$file));
	send_sms($prefix.$file,$xbody,$xhost,$xusername,$xpassword);
	unlink(SMS_DIR.'/'.$file);
    }
} 
else 
{
    echo "Error opening sms directory: ".SMS_DIR."\n";
    die(1);
}

function send_sms($tomobile,$xbody,$xhost,$xusername,$xpassword)
{
        $myoutput = "";
        $fp = fsockopen("$xhost", 23, $errno, $errstr, 30);
        if (!$fp)
        {
                echo "$errstr ($errno)\n";
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
