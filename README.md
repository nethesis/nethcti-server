# nethcti-server

The nethcti-server is a daemon that provides a set of api to perform common switchboard operations and a websocket streaming channel to listen for switchboard events.

Actually it supports only asterisk.


## Documentation

http://nethcti.docs.nethesis.it/it/latest/development.html

## Login

To obtain the nonce you have to do:
```
POST /authentication/login
```
with the following body in JSON format:
```
{
  "username": "<username>",
  "password": "<password>"
}
```

If the authentication is successfully you get the following:
```
HTTP 401

www-authenticate Digest 6e4fed102e96e9f408d53ebfab889c5ded22acb3
```

The digest is the nonce by which you calculate the token that will be used for any rest api call.

To calculate the token use the following algorithm:
```
tohash = username + ':' + password + ':' + nonce
token  = HMAC-SHA1(tohash, password)
```

The token expires after 30 minutes if not used.

## Logout

To logout you have to do:
```
POST /authentication/logout
```

## REST API

Each request must contain the authentication token retrieved as described above. It must be specified in the HTTP Header of the request:
```
Authorization: <username>:token
```

## Events

## Logging

The daemon logs on
```
/var/log/asterisk/nethcti.log
```
