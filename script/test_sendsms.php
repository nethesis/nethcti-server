#!/usr/bin/php
<?php
/**
This script search SMS_DIR for files containing a sms to send.
The file name must be in the form SENDER-DESTINATION and must contain a text of max 160 characters.

The prefix is managed by proxycti server. It is present in the file name (ex. 271-00393331234567)

**/

define("SMS_DIR","/usr/lib/node/proxycti/sms");
define("SERVER","localhost");
define("DB","nethcti");
define("USER","smsuser");
define("PASS","smspass");

define("FAILED", "FAILED!\n");
define("OK", "OK\n");

echo "\nTEST: reading config file /usr/lib/node/proxycti/config/sms.ini... ";
$smsdata = parse_ini_file ('/usr/lib/node/proxycti/config/sms.ini');

if ($smsdata === false) {
    echo FAILED;
    exit(0);
} else {
    echo OK;
}

echo "TEST: parameters... ";
if (empty($smsdata['type'])
    || empty($smsdata['url'])
    || empty($smsdata['user'])
    || empty($smsdata['password'])
    || empty($smsdata['simnumber'])) {

    echo FAILED;
    exit(0);
} else {
    echo OK;
}

if ($smsdata['type'] != 'portech'){
	exit(0);
}
$xhost = $smsdata['url'];
$xusername = $smsdata['user'];
$xpassword = $smsdata['password'];
$simnumber = $smsdata['simnumber'];
$lock = SMS_DIR."/"."lock";

echo "TEST: lock file absence... ";
if (file_exists($lock)){
    echo FAILED;
    exit(1);
} else {
    echo OK;
}

echo "TEST: mysql connection... ";
$res = mysql_connect(SERVER,USER,PASS);
if(!$res){
        # echo "error: mysql connection failed\n";
	echo FAILED;
	exit(0);
} else {
    echo OK;
}

echo "TEST: mysql select DB '" . DB . "'... ";
$res = mysql_select_db(DB);
if(!$res){
	# echo "error selecting db '" . DB . "'\n";
        echo FAILED;
	exit(0);
} else {
    echo OK;
}


echo "TEST: opening sms directory... ";
if ($handle = opendir(SMS_DIR)) 
{
    echo OK;

    file_put_contents($lock,getmypid());
    while (false !== ($file = readdir($handle))) {
    	if($file == "." || $file == ".." || $file == "lock")
	    continue;
	$xbody = trim(file_get_contents(SMS_DIR.'/'.$file));
	$tmp = explode("-",$file);
	$sender = $tmp[0];
	// the prefix is managed by proxycti server. It is present in the file name (ex. 271-00393331234567)
	$destination = $tmp[1];
        echo "\n***********************\n";
        echo "TEST: sending sms...\n";
	$res = send_sms($destination,$xbody,$xhost,$xusername,$xpassword,$lock,$simnumber);
	if($res!=''){
                echo "... sending sms OK\n";
		unlink(SMS_DIR.'/'.$file);
		$xbody = mysql_real_escape_string($xbody);
		mysql_query("INSERT INTO sms_history (sender,destination,text,date,status) VALUES ('$sender','$destination','$xbody',now(),1)");
	} else {
		# echo "sms send failed: check authentication\n";
                echo "... sending sms FAILED!\n";
	}
        echo "***********************\n";
	sleep(5);
    }
} 
else 
{
    echo FAILED;
    mysql_close();
    #echo "Error opening sms directory: ".SMS_DIR."\n";
    exit(1);
}

mysql_close();
unlink($lock);
exit(0);

function send_sms($tomobile,$xbody,$xhost,$xusername,$xpassword,$lock,$simnumber)
{
        $myoutput = "";

        echo "TEST: connecting to device... ";
        $fp = fsockopen("$xhost", 23, $errno, $errstr, 30);
        if (!$fp)
        {
                #echo "$errstr ($errno)\n";
                echo "$errstr ($errno) " . FAILED;
		unlink($lock);
                # die;
                return "";
        }
        echo OK;
        sleep(2);
        $cmd = "$xusername\r";
        fputs($fp, $cmd, strlen($cmd));
        sleep(1);

        $cmd = "$xpassword\r";
        fputs($fp, $cmd, strlen($cmd));
        sleep(1);
        $res = fread($fp, 4096);
        echo "TEST: check authentication... ";
        $pos = strpos($res, "bad username or password");
        if ($pos === false) {
            echo OK;

            echo "TEST: device commands support... ";
            $pos = strpos($res, "module");
            if ($pos === false) {
                echo "no 'module' command support: " . FAILED;
                return "";
            } else {
                echo "OK 'module' command supported\n";
            }
        } else {
            echo FAILED;
            return "";
        }


        $cmd = "module\r"; //inserire il numero sim
        fputs($fp, $cmd, strlen($cmd));
        sleep(2);

	//$simnumber è il numero di sim definito nella configurazione
	//se $simnumber = 1 => invio con la sim #1, se $simnumber=2 prendo una sim random, da 1 a 2 
	if ($simnumber > 1) $simtouse = 1;
	else $simtouse = rand (1,$simnumber);
	//ate1 = SIM1, ate2 = SIM2  ...
	$cmd = "ate".$simtouse."\r";
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
        echo "actnum = " . $actnum . "\n";
        return $actnum;
}
